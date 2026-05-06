<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { stripDiacritics } from '$lib/utils/searchTokenizer';
	import { detectIntent } from '$lib/utils/searchIntent';
	import SearchSuggest from '$lib/components/ui/SearchSuggest.svelte';
	import RelatedTopics from '$lib/components/ui/RelatedTopics.svelte';

	let { data }: { data: PageData } = $props();

	// Local query state mirrors ?q for the form input. Re-seeded by an effect
	// below so subsequent navigations (back/forward, internal links) update it.
	let q = $state('');
	let inputEl: HTMLInputElement | null = $state(null);
	let recents: string[] = $state([]);
	let suggestEl: SearchSuggest | undefined = $state();
	let suggestOpen = $state(false);

	// Pagination — show in batches of PAGE_SIZE; "Voir plus" reveals the next
	// batch. Reset whenever the query changes.
	const PAGE_SIZE = 30;
	let visiblePages = $state(1);

	// Active filter tab — Tout / Sections / Paragraphes. URL state is canonical.
	const activeType = $derived<'all' | 'headings' | 'paragraphs'>(
		(page.url.searchParams.get('type') as 'all' | 'headings' | 'paragraphs' | null) ?? 'all'
	);

	$effect(() => {
		// Keep input in sync with the URL when the user navigates via links/back.
		q = data.q ?? '';
		visiblePages = 1;
		// Capture EVERY query that lands on this page into recents — covers
		// header-bar submissions and clicked example links the same way as
		// the local form's submit handler.
		if (data.q && data.q.trim().length >= 2) pushRecent(data.q.trim());
	});

	const RECENT_KEY = 'catechismecatholique:recent-searches';
	const MAX_RECENTS = 5;

	function readRecents(): string[] {
		if (typeof localStorage === 'undefined') return [];
		try {
			const raw = localStorage.getItem(RECENT_KEY);
			if (!raw) return [];
			const v = JSON.parse(raw);
			return Array.isArray(v) ? v.filter((s) => typeof s === 'string').slice(0, MAX_RECENTS) : [];
		} catch {
			return [];
		}
	}
	function pushRecent(query: string) {
		if (typeof localStorage === 'undefined') return;
		// Re-read from storage so we don't clobber entries added by a previous
		// component lifecycle that hasn't been mirrored into local `recents`.
		const current = readRecents();
		const next = [query, ...current.filter((r) => r !== query)].slice(0, MAX_RECENTS);
		recents = next;
		try {
			localStorage.setItem(RECENT_KEY, JSON.stringify(next));
		} catch {
			/* quota or disabled — silent */
		}
	}
	function clearRecents() {
		recents = [];
		if (typeof localStorage !== 'undefined') {
			try {
				localStorage.removeItem(RECENT_KEY);
			} catch {
				/* silent */
			}
		}
	}

	onMount(() => {
		recents = readRecents();
		// Auto-focus when there's no active query — the empty state expects input.
		if (!data.q && inputEl) inputEl.focus();
	});

	function handleInputKeydown(e: KeyboardEvent) {
		if (suggestEl?.handleKeydown(e)) return;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		suggestOpen = false;
		const trimmed = q.trim();
		if (!trimmed) return;
		// Honor intent detection on the client too — the page load will redirect
		// for paragraph/bible kinds, but routing client-side first avoids a
		// pointless intermediate render of the search results page.
		const intent = detectIntent(trimmed);
		if (intent.kind === 'paragraph' || intent.kind === 'bible') {
			pushRecent(trimmed);
			void goto(intent.href);
			return;
		}
		pushRecent(intent.q);
		void goto(`/recherche?q=${encodeURIComponent(intent.q)}`);
	}

	function handleSuggestSelect(href: string) {
		suggestOpen = false;
		void goto(href);
	}

	async function clearInput() {
		q = '';
		await tick();
		inputEl?.focus();
		// If we're on a results URL, navigate back to the empty state so the
		// query gets cleared from the URL too.
		if (data.q) void goto('/recherche');
	}

	// --- highlight + snippet helpers (unchanged from original) ---

	function escapeHtml(s: string): string {
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function* foldedWords(text: string): Generator<{ start: number; end: number; folded: string }> {
		const re = /[\p{L}\p{N}]+/gu;
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			yield {
				start: m.index,
				end: m.index + m[0].length,
				folded: stripDiacritics(m[0]).toLowerCase()
			};
		}
	}

	function bestSnippet(text: string, terms: string[]): { start: number; end: number } {
		const MAX = 220;
		if (terms.length === 0 || text.length <= MAX)
			return { start: 0, end: Math.min(text.length, MAX) };
		const termSet = new Set(terms.map((t) => stripDiacritics(t).toLowerCase()));
		const positions: number[] = [];
		for (const w of foldedWords(text)) {
			if (termSet.has(w.folded)) positions.push(w.start);
		}
		if (positions.length === 0) return { start: 0, end: MAX };
		let best = { start: 0, end: MAX, count: 0 };
		for (const p of positions) {
			const start = Math.max(0, p - 60);
			const end = Math.min(text.length, start + MAX);
			const count = positions.filter((x) => x >= start && x < end).length;
			if (count > best.count) best = { start, end, count };
		}
		while (best.start > 0 && /\w/.test(text[best.start - 1] ?? '')) best.start--;
		while (best.end < text.length && /\w/.test(text[best.end] ?? '')) best.end++;
		return best;
	}

	function highlight(text: string, terms: string[]): string {
		if (terms.length === 0) return escapeHtml(text);
		const termSet = new Set(terms.map((t) => stripDiacritics(t).toLowerCase()));
		const parts: string[] = [];
		let last = 0;
		for (const w of foldedWords(text)) {
			if (!termSet.has(w.folded)) continue;
			parts.push(escapeHtml(text.slice(last, w.start)));
			parts.push(`<mark class="search-highlight">${escapeHtml(text.slice(w.start, w.end))}</mark>`);
			last = w.end;
		}
		parts.push(escapeHtml(text.slice(last)));
		return parts.join('');
	}

	type Hit = PageData['hits'][number];

	function hitHref(h: Hit): string {
		if (h.kind === 'paragraph') return `/ccc/${h.number}`;
		const anchor = h.id.split('#')[1] ?? '';
		if (h.paragraph_start) return `/ccc/${h.paragraph_start}${anchor ? '#' + anchor : ''}`;
		if (h.chapter_slug) return `/ccc/${h.chapter_slug}${anchor ? '#' + anchor : ''}`;
		return '/ccc';
	}

	function hitMatchTerms(h: Hit): string[] {
		return Object.keys(h.match);
	}

	function snippetHtml(h: Hit): string {
		const terms = hitMatchTerms(h);
		const { start, end } = bestSnippet(h.text, terms);
		const slice = h.text.slice(start, end);
		const ellipsisL = start > 0 ? '…' : '';
		const ellipsisR = end < h.text.length ? '…' : '';
		return ellipsisL + highlight(slice, terms) + ellipsisR;
	}

	function hitContextLine(h: Hit): string | null {
		const num = h.kind === 'paragraph' ? h.number : h.paragraph_start;
		if (!num) return null;
		const ctx = data.contexts?.[num];
		if (!ctx) return null;
		// Some paragraphs (e.g. prologue) only carry part + heading — no
		// section/chapter. Fall back to whatever titles exist so every row gets
		// at least a part-level breadcrumb instead of a blank line.
		const parts: string[] = [];
		if (ctx.part?.title) parts.push(ctx.part.title);
		if (ctx.section?.title) parts.push(ctx.section.title);
		if (ctx.chapter?.title) parts.push(ctx.chapter.title);
		else if (ctx.article?.title) parts.push(ctx.article.title);
		else if (ctx.heading?.title) parts.push(ctx.heading.title);
		return parts.length ? parts.join(' · ') : null;
	}

	// --- filter tab counts ---

	const headingCount = $derived(data.hits.filter((h) => h.kind === 'heading').length);
	const paragraphCount = $derived(data.hits.filter((h) => h.kind === 'paragraph').length);
	const totalCount = $derived(data.hits.length);

	const filteredHits = $derived.by<Hit[]>(() => {
		if (activeType === 'headings') return data.hits.filter((h) => h.kind === 'heading');
		if (activeType === 'paragraphs') return data.hits.filter((h) => h.kind === 'paragraph');
		return data.hits;
	});
	const visibleHits = $derived(filteredHits.slice(0, visiblePages * PAGE_SIZE));
	const hasMore = $derived(visibleHits.length < filteredHits.length);

	function tabHref(type: 'all' | 'headings' | 'paragraphs'): string {
		const params = new URLSearchParams();
		if (data.q) params.set('q', data.q);
		if (type !== 'all') params.set('type', type);
		const qs = params.toString();
		return qs ? `/recherche?${qs}` : '/recherche';
	}

	// Example queries for the empty state. Paragraph and bible examples resolve
	// through detectIntent so the link goes straight to the destination, not the
	// search page.
	function exampleHref(q: string): string {
		const intent = detectIntent(q);
		if (intent.kind === 'paragraph' || intent.kind === 'bible') return intent.href;
		return `/recherche?q=${encodeURIComponent(intent.q)}`;
	}

	// TODO(deferred): client-side "did you mean" suggestions on zero-results.
	// Requires loading the index dictionary client-side or shipping a small
	// Levenshtein-1 lookup table. Skipped for this pass — see design spec.
</script>

<svelte:head>
	<title
		>Recherche{data.q ? ` : ${data.q.slice(0, 80)}` : ''} | Catéchisme de l'Église Catholique</title
	>
	<meta
		name="description"
		content="Recherchez dans les 2865 paragraphes du Catéchisme de l'Église Catholique par mot-clé, numéro de paragraphe ou référence biblique."
	/>
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<main class="mx-auto max-w-[60rem] px-6 py-10">
	<header class="mb-8 text-center">
		<h1 class="font-ui text-sm uppercase tracking-[0.22em] text-muted mb-6">Recherche</h1>
		<form class="search-form mx-auto max-w-[640px]" onsubmit={handleSubmit}>
			<div class="search-wrap">
				<div class="search-line">
					<input
						bind:this={inputEl}
						bind:value={q}
						type="search"
						name="q"
						autocomplete="off"
						aria-label="Recherche"
						aria-autocomplete="list"
						aria-expanded={suggestOpen}
						class="search-input"
						onfocus={() => (suggestOpen = true)}
						onblur={() => setTimeout(() => (suggestOpen = false), 150)}
						onkeydown={handleInputKeydown}
					/>
					<span class="search-placeholder" class:hidden={q.length > 0} aria-hidden="true">
						Rechercher : <i>Eucharistie</i> ou 1324-1327
					</span>
					{#if q.length > 0}
						<div class="search-affordances">
							<button
								type="button"
								class="search-clear"
								onclick={clearInput}
								aria-label="Effacer la recherche"
							>
								Effacer
							</button>
							<span class="search-submit-hint" aria-hidden="true">↵</span>
						</div>
					{/if}
				</div>
				{#if suggestOpen}
					<div class="suggest-positioner">
						<SearchSuggest bind:this={suggestEl} query={q} onSelect={handleSuggestSelect} />
					</div>
				{/if}
			</div>
		</form>
	</header>

	{#if !data.q}
		<!-- Empty state — recents (if any), then suggestion examples, then browse -->
		<section class="mt-12 max-w-[640px] mx-auto" aria-label="Suggestions">
			{#if recents.length > 0}
				<div class="mb-10">
					<div class="flex items-baseline justify-between mb-3">
						<h2 class="font-ui text-[11px] uppercase tracking-[0.2em] text-muted">
							Récemment consulté
						</h2>
						<button
							type="button"
							class="font-ui text-[12px] text-muted hover:text-accent"
							onclick={clearRecents}
						>
							effacer
						</button>
					</div>
					<ul class="recent-list">
						{#each recents as r (r)}
							<li>
								<a
									href="/recherche?q={encodeURIComponent(r)}"
									class="font-body italic text-[16px] text-foreground hover:text-accent"
								>
									{r}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<h2 class="font-ui text-[11px] uppercase tracking-[0.2em] text-muted mb-3">
				Quelques exemples
			</h2>
			<ul class="space-y-2">
				<li class="leader-row">
					<span class="leader-label">Par mot</span>
					<span class="leader-fill" aria-hidden="true"></span>
					<span class="leader-examples">
						<a href={exampleHref('trinité')} class="ex-term">trinité</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('eucharistie')} class="ex-term">eucharistie</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('grâce')} class="ex-term">grâce</a>
					</span>
				</li>
				<li class="leader-row">
					<span class="leader-label">Par paragraphe</span>
					<span class="leader-fill" aria-hidden="true"></span>
					<span class="leader-examples">
						<a href={exampleHref('27')} class="ex-term">§ 27</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('1324-1327')} class="ex-term">§ 1324–1327</a>
					</span>
				</li>
				<li class="leader-row">
					<span class="leader-label">Par référence biblique</span>
					<span class="leader-fill" aria-hidden="true"></span>
					<span class="leader-examples">
						<a href={exampleHref('Jn 1, 14')} class="ex-term">Jn 1, 14</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('Gn 1, 1')} class="ex-term">Gn 1, 1</a>
					</span>
				</li>
			</ul>

			<p class="mt-12 pt-6 border-t border-border/60 font-ui text-[12px] text-muted text-center">
				Parcourir le Catéchisme&nbsp;: <a class="browse-link" href="/ccc/sommaire">Sommaire</a>
				<span aria-hidden="true">·</span>
				<a class="browse-link" href="/ccc/prologue">Prologue</a>
				<span aria-hidden="true">·</span>
				<a class="browse-link" href="/glossaire">Glossaire</a>
			</p>
		</section>
	{:else if data.hits.length === 0}
		<!-- Zero-results state -->
		<section class="mt-10 max-w-[640px] mx-auto text-center">
			<p class="font-body italic text-muted text-[16px]">
				Aucun résultat pour «&nbsp;{data.q}&nbsp;».
			</p>
			<RelatedTopics query={data.q} />
			<p class="mt-6 font-ui text-[13px]">
				<a class="browse-link" href="/glossaire?q={encodeURIComponent(data.q)}"
					>Parcourir le Glossaire pour ce terme →</a
				>
			</p>
			<p class="mt-2 font-ui text-[13px]">
				<a class="browse-link" href="/ccc/sommaire">Voir le Sommaire du Catéchisme →</a>
			</p>
		</section>
	{:else}
		<!-- Results -->
		<section class="mt-8">
			<div class="flex items-baseline justify-between mb-3 gap-4">
				<p class="font-ui text-xs text-muted tabular-nums">
					Résultats pour <span class="text-foreground">«&nbsp;{data.q}&nbsp;»</span>
				</p>
			</div>

			<RelatedTopics query={data.q} />

			<nav class="filter-tabs mb-4 flex items-baseline gap-5" aria-label="Filtrer les résultats">
				<a
					href={tabHref('all')}
					class="tab"
					class:active={activeType === 'all'}
					aria-current={activeType === 'all' ? 'true' : undefined}
				>
					Tout <span class="tabular-nums text-muted">({totalCount})</span>
				</a>
				<a
					href={tabHref('headings')}
					class="tab"
					class:active={activeType === 'headings'}
					aria-current={activeType === 'headings' ? 'true' : undefined}
				>
					Sections <span class="tabular-nums text-muted">({headingCount})</span>
				</a>
				<a
					href={tabHref('paragraphs')}
					class="tab"
					class:active={activeType === 'paragraphs'}
					aria-current={activeType === 'paragraphs' ? 'true' : undefined}
				>
					Paragraphes <span class="tabular-nums text-muted">({paragraphCount})</span>
				</a>
			</nav>

			{#if visibleHits.length > 5}
				<p class="font-ui text-[11px] uppercase tracking-[0.18em] text-muted mb-2">
					Plus pertinents
				</p>
			{/if}

			<ul class="result-list">
				{#each visibleHits as h (h.id)}
					<li class="result-row group">
						<a href={hitHref(h)} class="result-link">
							{#if h.kind === 'heading'}
								<div class="result-eyebrow tabular-nums">
									<span class="tag">TITRE DE SECTION</span>
									{#if h.paragraph_start}<span class="ref">CEC {h.paragraph_start}</span>{/if}
								</div>
								<div class="result-headline">
									{@html highlight(h.text, hitMatchTerms(h))}
								</div>
							{:else}
								<div class="result-eyebrow tabular-nums">
									<span class="ref">CEC {h.number}</span>
								</div>
								<div class="result-snippet">
									{@html snippetHtml(h)}
								</div>
							{/if}
							{#if hitContextLine(h)}
								<div class="result-trail">{hitContextLine(h)}</div>
							{/if}
						</a>
					</li>
				{/each}
			</ul>

			{#if hasMore}
				<div class="mt-8 flex items-baseline justify-between gap-4">
					<p class="font-ui text-[12px] text-muted tabular-nums">
						{visibleHits.length} sur {filteredHits.length}
					</p>
					<button type="button" class="show-more" onclick={() => (visiblePages += 1)}>
						Voir {Math.min(PAGE_SIZE, filteredHits.length - visibleHits.length)} de plus
					</button>
				</div>
			{:else if filteredHits.length > PAGE_SIZE}
				<p class="mt-8 font-ui text-[12px] text-muted tabular-nums text-center">
					{filteredHits.length} résultats affichés
				</p>
			{/if}
		</section>
	{/if}
</main>

<style>
	/* --- search input --- */
	.search-form {
		width: 100%;
	}
	.search-wrap {
		position: relative;
	}
	.suggest-positioner {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 50;
	}
	.search-line {
		position: relative;
		display: flex;
		align-items: baseline;
		background: var(--color-panel);
		border: 1px solid color-mix(in srgb, var(--color-fg) 22%, transparent);
		border-radius: 6px;
		padding: 0 0.85rem;
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease;
	}
	.search-line:hover {
		border-color: color-mix(in srgb, var(--color-fg) 35%, transparent);
	}
	.search-line:focus-within {
		border-color: color-mix(in srgb, var(--color-fg) 45%, transparent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-fg) 15%, transparent);
	}
	.search-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: 0;
		outline: none;
		padding: 0.7rem 0;
		font-family: var(--font-ui);
		font-size: 1.05rem;
		color: var(--color-fg);
	}
	.search-input::placeholder {
		color: transparent;
	}
	/* Hide the native browser search clear icon — we provide our own. */
	.search-input::-webkit-search-cancel-button {
		-webkit-appearance: none;
		display: none;
	}
	.search-placeholder {
		position: absolute;
		left: 0.85rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--color-muted);
		font-family: var(--font-ui);
		font-size: 1.05rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: calc(100% - 1.7rem);
	}
	.search-placeholder.hidden {
		display: none;
	}
	.search-placeholder i {
		font-style: italic;
	}
	.search-affordances {
		flex: none;
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding-left: 0.5rem;
	}
	.search-clear {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-muted);
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: var(--color-border);
		text-underline-offset: 3px;
	}
	.search-clear:hover {
		color: var(--color-accent);
	}
	.search-submit-hint {
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-muted);
		opacity: 0.7;
	}

	/* --- empty state leader rows --- */
	.leader-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.25rem 0;
		font-family: var(--font-body);
		font-size: 15px;
	}
	.leader-label {
		flex: none;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-fg);
		letter-spacing: 0.02em;
	}
	.leader-fill {
		flex: 1;
		height: 0;
		border-bottom: 1px dotted var(--color-border);
		align-self: end;
		margin-bottom: 4px;
	}
	.leader-examples {
		flex: none;
		display: inline-flex;
		gap: 0.5rem;
		align-items: baseline;
	}
	.ex-term {
		font-style: italic;
		color: var(--color-fg);
		text-decoration-color: transparent;
	}
	.ex-term:hover {
		color: var(--color-accent);
		text-decoration: underline;
		text-decoration-color: currentColor;
		text-underline-offset: 3px;
	}
	.ex-sep {
		color: var(--color-muted);
	}

	.browse-link {
		color: var(--color-fg);
		text-decoration: none;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 1px;
	}
	.browse-link:hover {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}

	/* --- filter tabs --- */
	.tab {
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-muted);
		padding: 0.25rem 0;
		border-bottom: 1.5px solid transparent;
		transition:
			color 120ms ease,
			border-color 120ms ease;
	}
	.tab:hover {
		color: var(--color-fg);
	}
	.tab.active {
		color: var(--color-fg);
		border-bottom-color: var(--color-accent);
		font-weight: 600;
	}

	/* --- result rows --- */
	.result-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.result-row {
		border-top: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
	}
	.result-row:last-child {
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
	}
	.result-link {
		display: block;
		padding: 0.875rem 0 0.875rem 0.75rem;
		border-left: 2px solid transparent;
		text-decoration: none;
		color: inherit;
		margin-left: -0.75rem;
		transition: border-color 120ms ease;
	}
	.result-row:hover .result-link {
		border-left-color: var(--color-accent);
	}
	.result-eyebrow {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-accent);
		font-weight: 600;
		letter-spacing: 0.05em;
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin-bottom: 4px;
	}
	.result-row:hover .result-eyebrow {
		color: var(--color-accent-text);
	}
	.result-eyebrow .tag {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 10.5px;
		color: var(--color-muted);
		font-weight: 600;
	}
	.result-eyebrow .ref {
		color: inherit;
	}
	.result-snippet {
		font-family: var(--font-body);
		font-size: 15px;
		line-height: 1.625;
		color: var(--color-fg);
	}
	.result-headline {
		font-family: var(--font-heading);
		font-size: 17px;
		line-height: 1.4;
		color: var(--color-fg);
	}
	.result-trail {
		margin-top: 6px;
		font-family: var(--font-ui);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-muted);
	}

	.recent-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.recent-list li {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 3px 0;
	}
	/* Editorial em-dash bullet — matches the hairline list register elsewhere. */
	.recent-list li::before {
		content: '—';
		color: var(--color-muted);
		flex: none;
	}

	.show-more {
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-fg);
		background: transparent;
		border: 0;
		padding: 0.25rem 0;
		cursor: pointer;
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 35%, transparent);
		transition:
			color 120ms ease,
			border-color 120ms ease;
	}
	.show-more:hover {
		color: var(--color-accent-text);
		border-bottom-color: var(--color-accent-text);
	}

	/* Highlights — keep the 20% accent tint, drop the bold weight that made
	   results-heavy pages feel jittery. */
	:global(.search-highlight) {
		background: color-mix(in srgb, var(--color-accent) 20%, transparent);
		color: inherit;
		border-radius: 2px;
		padding: 1px 3px;
	}
</style>
