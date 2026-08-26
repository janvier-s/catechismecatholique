import { describe, it, expect } from 'vitest';
import { createFailureLog, refKey, DEFAULT_RETRY_POLICY } from '$lib/utils/chapterRetry';

const T0 = 1_000_000;

describe('refKey', () => {
	it('joins slug and chapter', () => {
		expect(refKey({ bookSlug: 'genese', chapter: 3 })).toBe('genese-3');
	});

	it('separates chapters of the same book', () => {
		expect(refKey({ bookSlug: 'genese', chapter: 1 })).not.toBe(
			refKey({ bookSlug: 'genese', chapter: 11 })
		);
	});
});

describe('missing refs', () => {
	it('are never eligible again, however long the reader waits', () => {
		const log = createFailureLog();
		expect(log.eligible('genese-99', T0)).toBe(true);
		log.markMissing('genese-99');
		expect(log.eligible('genese-99', T0)).toBe(false);
		expect(log.eligible('genese-99', T0 + 86_400_000)).toBe(false);
	});

	it('do not raise the failure notice · absence is not a failed load', () => {
		const log = createFailureLog();
		log.markMissing('genese-99');
		expect(log.exhausted).toBe(false);
	});

	it('do not affect other refs', () => {
		const log = createFailureLog();
		log.markMissing('genese-99');
		expect(log.eligible('genese-4', T0)).toBe(true);
	});
});

describe('thrown refs', () => {
	it('back off on a doubling delay, then give up', () => {
		const log = createFailureLog();
		expect(log.record('exode-1', T0)).toBe(1000);
		expect(log.record('exode-1', T0)).toBe(2000);
		// Third attempt spends the budget · nothing further to schedule.
		expect(log.record('exode-1', T0)).toBeNull();
	});

	it('holds a ref off until its backoff elapses', () => {
		const log = createFailureLog();
		const wait = log.record('exode-1', T0);
		expect(wait).toBe(1000);
		expect(log.eligible('exode-1', T0)).toBe(false);
		expect(log.eligible('exode-1', T0 + 999)).toBe(false);
		expect(log.eligible('exode-1', T0 + 1000)).toBe(true);
	});

	it('stays ineligible once the budget is spent, however long the wait', () => {
		const log = createFailureLog();
		log.record('exode-1', T0);
		log.record('exode-1', T0);
		log.record('exode-1', T0);
		expect(log.eligible('exode-1', T0 + 86_400_000)).toBe(false);
	});

	it('raises the failure notice only once the budget is spent', () => {
		const log = createFailureLog();
		log.record('exode-1', T0);
		expect(log.exhausted).toBe(false);
		log.record('exode-1', T0);
		expect(log.exhausted).toBe(false);
		log.record('exode-1', T0);
		expect(log.exhausted).toBe(true);
	});

	it('tracks the budget of each ref separately', () => {
		const log = createFailureLog();
		log.record('exode-1', T0);
		log.record('exode-1', T0);
		log.record('exode-1', T0);
		expect(log.exhausted).toBe(true);
		// A different ref is untouched and still on its first attempt.
		expect(log.eligible('levitique-1', T0)).toBe(true);
	});
});

describe('clearing', () => {
	it('makes a cleared ref eligible again immediately', () => {
		const log = createFailureLog();
		log.record('exode-1', T0);
		expect(log.eligible('exode-1', T0)).toBe(false);
		log.clearOne('exode-1');
		expect(log.eligible('exode-1', T0)).toBe(true);
	});

	it('lowers the failure notice when the last exhausted ref is cleared', () => {
		const log = createFailureLog();
		log.record('exode-1', T0);
		log.record('exode-1', T0);
		log.record('exode-1', T0);
		expect(log.exhausted).toBe(true);
		log.clearOne('exode-1');
		expect(log.exhausted).toBe(false);
	});

	it('keeps the notice up while another ref is still exhausted', () => {
		// The rule that matters: a successful loadPrev must not hide the notice
		// for a forward ref that gave up minutes ago and is still unreachable.
		const log = createFailureLog();
		for (let i = 0; i < DEFAULT_RETRY_POLICY.maxAttempts; i++) log.record('forward-1', T0);
		for (let i = 0; i < DEFAULT_RETRY_POLICY.maxAttempts; i++) log.record('backward-1', T0);
		expect(log.exhausted).toBe(true);

		log.clearOne('backward-1');
		expect(log.exhausted).toBe(true);

		log.clearOne('forward-1');
		expect(log.exhausted).toBe(false);
	});

	it('clearing a ref that never failed is harmless', () => {
		const log = createFailureLog();
		log.clearOne('never-seen-1');
		expect(log.exhausted).toBe(false);
		expect(log.eligible('never-seen-1', T0)).toBe(true);
	});

	it('clearAll forgets absences as well as failures', () => {
		const log = createFailureLog();
		log.markMissing('genese-99');
		log.record('exode-1', T0);
		log.record('exode-1', T0);
		log.record('exode-1', T0);

		log.clearAll();

		expect(log.exhausted).toBe(false);
		expect(log.eligible('genese-99', T0)).toBe(true);
		expect(log.eligible('exode-1', T0)).toBe(true);
	});
});

describe('policy', () => {
	it('honours a custom budget and base delay', () => {
		const log = createFailureLog({ maxAttempts: 2, baseMs: 50 });
		expect(log.record('exode-1', T0)).toBe(50);
		expect(log.record('exode-1', T0)).toBeNull();
		expect(log.exhausted).toBe(true);
	});

	it('defaults to three attempts on a one-second base', () => {
		expect(DEFAULT_RETRY_POLICY).toEqual({ maxAttempts: 3, baseMs: 1000 });
	});
});
