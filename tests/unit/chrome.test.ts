import { describe, it, expect } from 'vitest';
import {
	HIDE_AFTER,
	REVEAL_AFTER_UP,
	initialChromeState,
	nextChromeState,
	type ChromeScrollState
} from '$lib/stores/chrome';

/** Feed a sequence of absolute scroll positions through the reducer. */
function scrollThrough(positions: number[], start?: ChromeScrollState): ChromeScrollState {
	return positions.reduce(
		(state, y) => nextChromeState(state, y),
		start ?? initialChromeState(positions[0])
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
		state = nextChromeState(state, steps[steps.length - 1]);
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
