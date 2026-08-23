import { describe, it, expect } from 'vitest';
import {
	HIDE_AFTER,
	REVEAL_AFTER_UP,
	initialChromeState,
	nextChromeState,
	shiftChromeAnchor,
	type ChromeScrollState
} from '$lib/stores/chrome';

/** Feed a sequence of absolute scroll positions through the reducer. */
function scrollThrough(positions: number[], start?: ChromeScrollState): ChromeScrollState {
	return positions.reduce(
		(state, y) => nextChromeState(state, y),
		start ?? initialChromeState(positions[0] ?? 0)
	);
}

describe('chrome scroll state machine', () => {
	it('starts visible', () => {
		expect(initialChromeState(0).hidden).toBe(false);
	});

	it('stays visible while scrolling down within the top zone', () => {
		const state = scrollThrough([0, 20, 60, HIDE_AFTER]);
		expect(state.hidden).toBe(false);
	});

	it('hides once scrolling down past the top zone', () => {
		const state = scrollThrough([0, 60, HIDE_AFTER + 1]);
		expect(state.hidden).toBe(true);
	});

	it('stays hidden while scrolling up less than the reveal threshold', () => {
		const down = scrollThrough([0, 400]);
		expect(down.hidden).toBe(true);
		const up = scrollThrough([400 - (REVEAL_AFTER_UP - 1)], down);
		expect(up.hidden).toBe(true);
	});

	it('reveals after cumulative upward scrolling reaches the threshold', () => {
		const down = scrollThrough([0, 400]);
		const up = scrollThrough([400 - REVEAL_AFTER_UP], down);
		expect(up.hidden).toBe(false);
	});

	it('accumulates upward distance across several small scroll events', () => {
		const down = scrollThrough([0, 400]);
		// Six 20px steps = 120px total, reaching the threshold only on the last one.
		const steps = [380, 360, 340, 320, 300, 280];
		let state = down;
		for (const y of steps.slice(0, -1)) {
			state = nextChromeState(state, y);
			expect(state.hidden).toBe(true);
		}
		state = nextChromeState(state, steps[steps.length - 1]!);
		expect(state.hidden).toBe(false);
	});

	it('resets accumulated upward distance when direction flips back down', () => {
		const down = scrollThrough([0, 400]);
		// Up 100 (short of 120), back down, then up 100 again. Never reaches the threshold.
		const state = scrollThrough([300, 340, 240], down);
		expect(state.hidden).toBe(true);
	});

	it('resets the accumulator after a reveal so one flick does not bank credit', () => {
		const revealed = scrollThrough([0, 400, 400 - REVEAL_AFTER_UP]);
		expect(revealed.hidden).toBe(false);
		expect(revealed.upDistance).toBe(0);
	});

	it('always reveals when scrolling back into the top zone', () => {
		const state = scrollThrough([0, 400, HIDE_AFTER]);
		expect(state.hidden).toBe(false);
	});

	it('hides again on the next downward scroll after a reveal', () => {
		const revealed = scrollThrough([0, 400, 400 - REVEAL_AFTER_UP]);
		const state = nextChromeState(revealed, 400);
		expect(state.hidden).toBe(true);
	});

	it('clamps negative scroll positions from rubber-banding', () => {
		const state = scrollThrough([0, 400, -50]);
		expect(state.hidden).toBe(false);
		expect(state.lastY).toBe(0);
	});

	it('ignores repeated events at the same position', () => {
		const down = scrollThrough([0, 400]);
		const state = scrollThrough([400, 400, 400], down);
		expect(state.hidden).toBe(true);
		expect(state.upDistance).toBe(0);
	});
});

describe('shiftChromeAnchor', () => {
	/** A state that is hidden, having scrolled down well past the top zone. */
	function hiddenAt(y: number): ChromeScrollState {
		const state = scrollThrough([0, HIDE_AFTER + 1, y]);
		expect(state.hidden).toBe(true);
		return state;
	}

	it('moves the anchor by the delta and leaves the bars alone', () => {
		const before = hiddenAt(1000);
		const after = shiftChromeAnchor(before, 900);
		expect(after.lastY).toBe(before.lastY + 900);
		expect(after.hidden).toBe(true);
		expect(after.upDistance).toBe(before.upDistance);
	});

	it('keeps the bars hidden through a prepend compensation', () => {
		// A prepend inserts 900px above the viewport, so the browser is scrolled
		// down by 900 to keep the text still. Without the shift this reads as
		// deliberate downward travel.
		const shifted = shiftChromeAnchor(hiddenAt(1000), 900);
		expect(nextChromeState(shifted, 1900).hidden).toBe(true);
	});

	it('does not reveal the bars through a prune compensation', () => {
		// Pruning 900px from above the viewport scrolls up by 900, which is well
		// past REVEAL_AFTER_UP and would otherwise pop the bars back.
		expect(REVEAL_AFTER_UP).toBeLessThan(900);
		const shifted = shiftChromeAnchor(hiddenAt(2000), -900);
		expect(nextChromeState(shifted, 1100).hidden).toBe(true);
	});

	it('still reveals on genuine upward scrolling after a shift', () => {
		const shifted = shiftChromeAnchor(hiddenAt(1000), 900);
		const revealed = nextChromeState(shifted, 1900 - REVEAL_AFTER_UP);
		expect(revealed.hidden).toBe(false);
	});

	it('clamps the anchor at zero', () => {
		const shifted = shiftChromeAnchor(hiddenAt(1000), -100000);
		expect(shifted.lastY).toBe(0);
	});
});
