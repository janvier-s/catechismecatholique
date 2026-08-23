<script lang="ts">
	import { fade } from 'svelte/transition';
	import { loadNclBook, loadParagraph } from '$lib/data/loaders';
	import { bookBySlug } from '$lib/utils/bibleBookSlug';

	const TOOLTIP_W = 300;
	const CLAMP = TOOLTIP_W / 2 + 16;
	const SELECTOR =
		'a.compendium-bible-ref, a.trent-bible-ref, a.vat-ii-bible-ref, a.bibRef[data-slug], sup.srcRef.bibleRef[data-slug], button.bible-inline[data-slug], sup.trent-fn-marker[data-slug], a.verse-ref[data-slug], sup.vat-ii-fn-ref[data-fn], [data-cec]';

	let x = $state(0);
	let y = $state(0);
	let flipBelow = $state(false);
	let maxH = $state('50vh');
	let windowW = $state(1024);
	let windowH = $state(768);

	let loading = $state(false);
	let refLabel = $state('');
	let refHref = $state<string | null>(null);
	let verseText = $state('');
	let verseHtml = $state('');
	let isCec = $state(false);
	// Bible-ref clusters (one footnote marker citing several, possibly
	// cross-book, verses — e.g. CCC §618's marker "4" citing Mc 10:39, Jn
	// 21:18-19 AND Col 1:24) render as multiple stacked entries instead of
	// the single refLabel/verseText pair above.
	let clusterEntries = $state<{ refLabel: string; refHref: string; verseText: string }[]>([]);
	let visible = $state(false);
	let anchorEl = $state<HTMLElement | null>(null);
	let tooltipEl = $state<HTMLDivElement | undefined>();

	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let showTimer: ReturnType<typeof setTimeout> | null = null;

	const left = $derived(Math.min(Math.max(x, CLAMP), windowW - CLAMP));

	function scheduleHide() {
		hideTimer = setTimeout(() => {
			visible = false;
			anchorEl = null;
		}, 150);
	}

	function cancelHide() {
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
	}

	function cancelShow() {
		if (showTimer) {
			clearTimeout(showTimer);
			showTimer = null;
		}
	}

	function showFor(el: HTMLElement) {
		cancelHide();
		cancelShow();
		// Brief delay prevents accidental triggers on quick mouse movements
		// across small elements (superscripts, verse numbers).
		showTimer = setTimeout(() => {
			anchorEl = el;
			visible = true;
		}, 120);
	}

	$effect(() => {
		const onOver = (e: MouseEvent) => {
			const el = (e.target as HTMLElement).closest<HTMLElement>(SELECTOR);
			if (!el) return;
			showFor(el);
		};
		const onOut = (e: MouseEvent) => {
			const el = (e.target as HTMLElement).closest<HTMLElement>(SELECTOR);
			if (!el) return;
			cancelShow();
			const related = e.relatedTarget as HTMLElement | null;
			if (related?.closest?.('[role="tooltip"]')) return;
			if (visible) scheduleHide();
		};
		const onFocusIn = (e: FocusEvent) => {
			const el = (e.target as HTMLElement).closest<HTMLElement>(SELECTOR);
			if (el) showFor(el);
		};
		const onFocusOut = (e: FocusEvent) => {
			const el = (e.target as HTMLElement).closest<HTMLElement>(SELECTOR);
			if (el) scheduleHide();
		};
		document.addEventListener('mouseover', onOver);
		document.addEventListener('mouseout', onOut);
		document.addEventListener('focusin', onFocusIn);
		document.addEventListener('focusout', onFocusOut);
		return () => {
			document.removeEventListener('mouseover', onOver);
			document.removeEventListener('mouseout', onOut);
			document.removeEventListener('focusin', onFocusIn);
			document.removeEventListener('focusout', onFocusOut);
			if (hideTimer) clearTimeout(hideTimer);
			if (showTimer) clearTimeout(showTimer);
		};
	});

	$effect(() => {
		if (!visible || !anchorEl) {
			verseText = '';
			verseHtml = '';
			refLabel = '';
			refHref = null;
			isCec = false;
			loading = false;
			clusterEntries = [];
			return;
		}

		const rect = anchorEl.getBoundingClientRect();
		x = rect.left + rect.width / 2;
		const topbar = document.querySelector<HTMLElement>('header, .topbar, [data-topbar]');
		const ceiling = topbar ? topbar.getBoundingClientRect().bottom + 8 : 8;
		const spaceAbove = rect.top - ceiling;
		const spaceBelow = windowH - rect.bottom - 16;
		flipBelow = spaceAbove < 110 && spaceBelow > spaceAbove;
		y = flipBelow ? rect.bottom : rect.top;
		maxH = `${Math.min(Math.max(flipBelow ? spaceBelow : spaceAbove, 80), windowH * 0.6)}px`;
		clusterEntries = [];

		// Bible-ref cluster: one marker citing several (possibly cross-book)
		// verses, encoded by ParagraphRenderer as "slug:chapter:verses|...".
		const clusterAttr = anchorEl.dataset.cluster;
		if (clusterAttr) {
			const tokens = clusterAttr
				.split('|')
				.map((t) => {
					const [slug, chapterStr, verseSpec] = t.split(':');
					const chapter = parseInt(chapterStr ?? '', 10);
					if (!slug || !Number.isFinite(chapter)) return null;
					const [fromStr, toStr] = (verseSpec ?? '').split('-');
					const fromV = fromStr ? parseInt(fromStr, 10) : undefined;
					const toV = toStr ? parseInt(toStr, 10) : fromV;
					const book = bookBySlug(slug);
					if (!book) return null;
					return { book, chapter, fromV, toV };
				})
				.filter((t) => t !== null);
			if (tokens.length > 0) {
				isCec = false;
				verseText = '';
				refLabel = '';
				loading = true;
				Promise.all(tokens.map((t) => loadNclBook(t.book.usfx)))
					.then((books) => {
						const entries: typeof clusterEntries = [];
						for (let i = 0; i < tokens.length; i++) {
							const t = tokens[i]!;
							const data = books[i];
							const chData = data?.[String(t.chapter)];
							if (!chData) continue;
							let label: string;
							let text: string;
							if (t.fromV !== undefined && t.toV !== undefined) {
								label =
									t.fromV === t.toV
										? `${t.book.frenchName} ${t.chapter},${t.fromV}`
										: `${t.book.frenchName} ${t.chapter},${t.fromV}-${t.toV}`;
								const parts: string[] = [];
								for (let v = t.fromV; v <= t.toV; v++) {
									const vt = chData[String(v)];
									if (vt) parts.push(vt);
								}
								text = parts.join(' ');
							} else {
								const firstKey = Object.keys(chData).sort((a, b) => +a - +b)[0];
								label = `${t.book.frenchName} ${t.chapter}`;
								text = firstKey ? (chData[firstKey] ?? '') : '';
							}
							if (text) {
								entries.push({
									refLabel: label,
									refHref: `/bible/${t.book.slug}/${t.chapter}${t.fromV !== undefined ? `/${t.fromV}` : ''}`,
									verseText: text
								});
							}
						}
						clusterEntries = entries;
					})
					.catch(() => {})
					.finally(() => {
						loading = false;
					});
				return;
			}
		}

		// Vatican II footnote markers: pull the rendered footnote body HTML
		// directly from the page (#fn-N) and show it in the tooltip.
		const fnNum = anchorEl.dataset.fn;
		if (anchorEl.matches('sup.vat-ii-fn-ref') && fnNum) {
			const body = document.querySelector(`#fn-${fnNum} .footnote-body`);
			isCec = false;
			verseText = '';
			loading = false;
			if (body) {
				refLabel = `Note ${fnNum}`;
				refHref = `#fn-${fnNum}`;
				verseHtml = body.innerHTML;
			}
			return;
		}

		const cecNum = anchorEl.dataset.cec;
		if (cecNum) {
			const num = parseInt(cecNum, 10);
			if (!Number.isFinite(num)) return;
			loading = true;
			verseText = '';
			verseHtml = '';
			refLabel = '';
			isCec = true;
			loadParagraph(num)
				.then((p) => {
					refLabel = String(p.number);
					refHref = `/cec/${p.number}`;
					const tmp = document.createElement('div');
					tmp.innerHTML = p.text_html;
					tmp.querySelectorAll('sup.srcRef').forEach((s) => s.remove());
					verseText = (tmp.textContent ?? '')
						.replace(/\s+/g, ' ')
						.replace(/ ([,.])/g, '$1')
						.trim();
				})
				.catch(() => {})
				.finally(() => {
					loading = false;
				});
			return;
		}

		const slug = anchorEl.dataset.slug ?? '';
		const chapter = parseInt(anchorEl.dataset.chapter ?? '', 10);
		const verse = parseInt(anchorEl.dataset.verse ?? '', 10);
		const versesAttr = anchorEl.dataset.verses ?? '';
		const verseList = versesAttr
			? versesAttr
					.split(',')
					.map((v) => parseInt(v, 10))
					.filter((n) => Number.isFinite(n))
			: Number.isFinite(verse)
				? [verse]
				: [];
		if (!slug || !chapter) return;

		isCec = false;
		const book = bookBySlug(slug);
		if (!book) return;

		loading = true;
		verseText = '';
		verseHtml = '';
		refLabel = '';

		loadNclBook(book.usfx)
			.then((data) => {
				if (!data) return;
				const chData = data[String(chapter)];
				if (!chData) return;
				if (verseList.length > 0) {
					const first = verseList[0]!;
					const last = verseList[verseList.length - 1]!;
					const consecutive = verseList.every((v, i) => i === 0 || v === verseList[i - 1]! + 1);
					if (first === last) {
						refLabel = `${book.frenchName} ${chapter},${first}`;
					} else if (consecutive) {
						refLabel = `${book.frenchName} ${chapter},${first}-${last}`;
					} else {
						refLabel = `${book.frenchName} ${chapter},${verseList.join('.')}`;
					}
					const parts: string[] = [];
					for (const v of verseList) {
						const t = chData[String(v)];
						if (t) parts.push(t);
					}
					verseText = parts.join(' ');
				} else {
					const firstKey = Object.keys(chData).sort((a, b) => +a - +b)[0];
					if (firstKey) {
						refLabel = `${book.frenchName} ${chapter}`;
						verseText = chData[firstKey] ?? '';
					}
				}
			})
			.catch(() => {})
			.finally(() => {
				loading = false;
			});
	});

	$effect(() => {
		void verseText;
		void verseHtml;
		void clusterEntries;
		void loading;
		if (!tooltipEl) return;
		requestAnimationFrame(() => {
			if (!tooltipEl) return;
			tooltipEl.style.overflowY =
				tooltipEl.scrollHeight > tooltipEl.clientHeight + 2 ? 'auto' : 'hidden';
		});
	});
</script>

<svelte:window bind:innerWidth={windowW} bind:innerHeight={windowH} />

{#if visible && (loading || verseText || verseHtml || clusterEntries.length > 0)}
	<div
		bind:this={tooltipEl}
		class="tooltip"
		class:flip-below={flipBelow}
		style="left:{left}px;top:{y}px;max-height:{maxH};"
		transition:fade={{ duration: 110 }}
		role="tooltip"
		onmouseenter={cancelHide}
		onmouseleave={scheduleHide}
	>
		<div class="rule"></div>

		{#if loading}
			<div class="loading">
				<div class="shimmer"></div>
				<div class="shimmer shimmer-short"></div>
			</div>
		{:else if clusterEntries.length > 0}
			{#each clusterEntries as entry (entry.refHref)}
				<div class="entry">
					<div class="header">
						<a href={entry.refHref} class="tt-num">{entry.refLabel}</a>
					</div>
					<p class="verse-text">{entry.verseText}</p>
				</div>
			{/each}
		{:else if verseHtml}
			<div class="entry">
				<div class="header">
					{#if refHref}
						<a href={refHref} class="tt-num">{refLabel}</a>
					{:else}
						<span class="tt-ref">{refLabel}</span>
					{/if}
				</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="fn-body">{@html verseHtml}</div>
			</div>
		{:else if verseText}
			<div class="entry">
				<div class="header">
					{#if refHref}
						<a href={refHref} class="tt-num">{refLabel}</a>
					{:else}
						<span class="tt-ref">{refLabel}</span>
					{/if}
				</div>
				<p class="verse-text" class:verse-text--cec={isCec}>{verseText}</p>
			</div>
		{/if}

		<div class="nib" aria-hidden="true"></div>
	</div>
{/if}

<style>
	.tooltip {
		position: fixed;
		z-index: 9000;
		transform: translateX(-50%) translateY(-100%);
		width: 380px;
		overflow-y: hidden;
		background: var(--color-panel);
		border: 1px solid color-mix(in srgb, var(--color-fg) 20%, transparent);
		border-radius: 8px;
		padding: 0 0 20px;
		pointer-events: auto;
	}

	/* Invisible bridge so mouse can travel from anchor to tooltip */
	.tooltip::before {
		content: '';
		position: absolute;
		bottom: -14px;
		left: 0;
		right: 0;
		height: 14px;
	}

	.tooltip.flip-below {
		transform: translateX(-50%) translateY(0);
	}

	.tooltip.flip-below::before {
		bottom: auto;
		top: -14px;
	}

	.rule {
		position: sticky;
		top: 0;
		height: 2px;
		background: var(--color-accent);
		margin-bottom: 8px;
		border-radius: 8px 8px 0 0;
	}

	.header {
		position: sticky;
		top: 2px;
		background: var(--color-panel);
		padding: 4px 20px 8px;
	}
	.header:has(.tt-num) {
		padding: 4px 0 8px;
	}

	/* Bible-ref clusters (one marker citing several verses) stack multiple
	   .entry blocks · separate them with a rule so each verse reads as its
	   own citation instead of running together. */
	.entry + .entry {
		margin-top: 4px;
		padding-top: 10px;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 10%, transparent);
	}

	.tt-ref {
		font-family: var(--font-ui);
		font-size: 10px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-weight: 600;
	}
	.tt-num {
		font-family: var(--font-ui);
		font-size: 15px;
		font-weight: 700;
		color: var(--color-accent);
		line-height: 1;
		text-decoration: none;
		display: block;
		text-align: center;
		padding-bottom: 6px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 10%, transparent);
	}
	.tt-num:hover {
		text-decoration: underline;
	}

	.verse-text {
		font-family: var(--font-body);
		font-size: 15px;
		font-style: italic;
		line-height: 1.65;
		color: var(--color-fg);
		padding: 0 20px;
		margin: 0;
		opacity: 0.9;
	}
	.verse-text--cec {
		font-style: normal;
	}

	/* Vatican II footnote body: rendered HTML may contain paragraphs, italics,
	   linkified bible refs (a.vat-ii-bible-ref). Match the verse-text reading
	   feel but allow block-level paragraph spacing. */
	.fn-body {
		font-family: var(--font-body);
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-fg);
		padding: 0 20px;
		opacity: 0.92;
	}
	.fn-body :global(p) {
		margin: 0 0 0.5em;
		display: inline;
	}
	.fn-body :global(p:last-child) {
		margin-bottom: 0;
	}
	.fn-body :global(em),
	.fn-body :global(i) {
		font-style: italic;
	}
	.fn-body :global(a.vat-ii-bible-ref) {
		color: inherit;
		text-decoration: underline dotted var(--color-muted);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.18em;
	}
	.fn-body :global(a.vat-ii-bible-ref:hover) {
		color: var(--color-accent);
		text-decoration: underline solid var(--color-accent);
	}

	.loading {
		padding: 4px 12px 2px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.shimmer {
		height: 11px;
		border-radius: 2px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-fg) 7%, transparent) 0%,
			color-mix(in srgb, var(--color-fg) 13%, transparent) 50%,
			color-mix(in srgb, var(--color-fg) 7%, transparent) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.2s infinite;
	}

	.shimmer-short {
		width: 55%;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	/* Triangle nib */
	.nib {
		position: absolute;
		bottom: -5px;
		left: 50%;
		transform: translateX(-50%);
		width: 10px;
		height: 5px;
		background: var(--color-panel);
		clip-path: polygon(0 0, 100% 0, 50% 100%);
		z-index: 1;
	}

	.flip-below .nib {
		bottom: auto;
		top: -5px;
		clip-path: polygon(50% 0, 0 100%, 100% 100%);
	}

	/* Border nib (one pixel larger, drawn before the fill) */
	.tooltip::after {
		content: '';
		position: absolute;
		bottom: -7px;
		left: 50%;
		transform: translateX(-50%);
		width: 12px;
		height: 6px;
		background: color-mix(in srgb, var(--color-fg) 20%, transparent);
		clip-path: polygon(0 0, 100% 0, 50% 100%);
	}

	.flip-below::after {
		bottom: auto;
		top: -7px;
		clip-path: polygon(50% 0, 0 100%, 100% 100%);
	}
</style>
