/**
 * Failure bookkeeping for chapter loads.
 *
 * Two distinct records, because two distinct things go wrong:
 *
 * - *missing* · the chapter does not exist (an unknown slug, or a chapter
 *   number past the end of its book). Structural, so it can never succeed on a
 *   retry and the entry is permanent.
 * - *thrown* · the request was dropped, which is transient and only possible at
 *   a book boundary. Worth retrying, on a doubling backoff.
 *
 * Both exist so a dead chapter is attempted a bounded number of times rather
 * than once per animation frame for as long as the reader keeps scrolling near
 * the bottom · offline, that would otherwise be a stream of failing requests
 * and a console warning per frame.
 *
 * Time is a parameter throughout rather than read from the clock, so the
 * backoff is directly testable, the same way `nextChromeState` takes the scroll
 * position instead of reading it.
 */

export interface RetryPolicy {
	/** Attempts a chapter gets before it is given up on. Retrying a dropped
	 *  request costs one request, while not retrying strands the reader at the
	 *  end of a book with no way forward and no footer nav to fall back on. */
	maxAttempts: number;
	/** Delay before a thrown ref is eligible again, doubled per attempt. Without
	 *  it the budget is spent inside a second: a caller's `catch` falls straight
	 *  through to its next check, which starts the next attempt immediately, so
	 *  all three land inside one bad moment on the connection and the reader is
	 *  given up on before the blip has passed. */
	baseMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = { maxAttempts: 3, baseMs: 1000 };

/** Stable key for one chapter. */
export function refKey(ref: { bookSlug: string; chapter: number }): string {
	return `${ref.bookSlug}-${ref.chapter}`;
}

export interface FailureLog {
	/** Record that `key` does not exist. Permanent. */
	markMissing(key: string): void;
	/**
	 * Record a throw against `key`'s attempt budget.
	 *
	 * @returns how long to hold `key` off before trying again, or null once the
	 * budget is spent and no further attempt should be scheduled.
	 */
	record(key: string, now: number): number | null;
	/** Forget one ref's failures · a chapter that arrived is no longer owed a
	 *  retry. */
	clearOne(key: string): void;
	/** Forget everything. For a route change or the reader's own retry, both of
	 *  which are fresh intent. */
	clearAll(): void;
	/** Whether `key` is worth a request: not known to be absent, attempts left,
	 *  and past its backoff. */
	eligible(key: string, now: number): boolean;
	/**
	 * Whether anything has spent its whole budget.
	 *
	 * Deliberately a question about the whole log rather than a flag raised by
	 * `record` and lowered by `clearOne`: a successful load in one direction
	 * must not hide the failure notice for a ref in the other that gave up
	 * minutes ago and is still unreachable. Asking the log has no memory of
	 * which direction raised it, only whether anything currently has.
	 */
	readonly exhausted: boolean;
}

export function createFailureLog(policy: RetryPolicy = DEFAULT_RETRY_POLICY): FailureLog {
	/** Refs whose chapter does not exist. */
	const missing = new Set<string>();
	/** Failed attempts per ref, for loads that *threw*. Distinct from `missing`
	 *  because a dropped request says nothing about whether the chapter is
	 *  there. */
	const attempts = new Map<string, number>();
	/** Earliest time each thrown ref may be tried again · the backoff half of
	 *  `attempts`, kept beside it and cleared with it. */
	const retryAfter = new Map<string, number>();

	return {
		markMissing(key) {
			missing.add(key);
		},

		record(key, now) {
			const n = (attempts.get(key) ?? 0) + 1;
			attempts.set(key, n);
			if (n >= policy.maxAttempts) return null;
			const wait = policy.baseMs * 2 ** (n - 1);
			retryAfter.set(key, now + wait);
			return wait;
		},

		clearOne(key) {
			attempts.delete(key);
			retryAfter.delete(key);
		},

		clearAll() {
			missing.clear();
			attempts.clear();
			retryAfter.clear();
		},

		eligible(key, now) {
			if (missing.has(key)) return false;
			if ((attempts.get(key) ?? 0) >= policy.maxAttempts) return false;
			return now >= (retryAfter.get(key) ?? 0);
		},

		get exhausted() {
			for (const n of attempts.values()) {
				if (n >= policy.maxAttempts) return true;
			}
			return false;
		}
	};
}
