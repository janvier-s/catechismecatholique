<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { stripDiacritics } from '$lib/utils/searchTokenizer';
	import { detectIntent } from '$lib/utils/searchIntent';

	let { data }: { data: PageData } = $props();

	// Local query state mirrors ?q for the form input. Re-seeded by an effect
	// below so subsequent navigations (back/forward, internal links) update it.
	let q = $state('');
	let inputEl: HTMLInputElement | null = $state(null);
	let recents: string[] = $state([]);

	// Active filter tab — Tout / Sections / Paragraphes. URL state is canonical.
	const activeType = $derived<'all' | 'headings' | 'paragraphs'>(
		(page.url.searchParams.get('type') as 'all' | 'headings' | 'paragraphs' | null) ?? 'all'
	);

	$effect(() => {
		// Keep input in sync with the URL when the user navigates via links/back.
		q = data.q ?? '';
	});

	const RECENT_KEY = 'lecatechisme:recent-searches';
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
		const next = [query, ...recents.filter((r) => r !== query)].slice(0, MAX_RECENTS);
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

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
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

	async function clearInput() {
		q = '';
		await tick();
		inputEl?.focus();
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
			parts.push(
				`<mark class="search-highlight">${escapeHtml(text.slice(w.start, w.end))}</mark>`
			);
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

	const visibleHits = $derived.by<Hit[]>(() => {
		if (activeType === 'headings') return data.hits.filter((h) => h.kind === 'heading');
		if (activeType === 'paragraphs') return data.hits.filter((h) => h.kind === 'paragraph');
		return data.hits;
	});

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
	<title>Recherche{data.q ? ` : ${data.q.slice(0, 80)}` : ''} — Catéchisme</title>
</svelte:head>

<main class="mx-auto max-w-[60rem] px-6 py-10">
	<header class="mb-8 text-center">
		<p class="font-ui text-[11px] uppercase tracking-[0.2em] text-muted mb-3">
			La recherche du Catéchisme
		</p>
		<form class="search-form mx-auto max-w-[640px]" onsubmit={handleSubmit}>
			<div class="search-line">
				<input
					bind:this={inputEl}
					bind:value={q}
					type="search"
					name="q"
					autocomplete="off"
					aria-label="Recherche"
					class="search-input"
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
		</form>
	</header>

	{#if !data.q}
		<!-- Empty state — examples + recents + browse -->
		<section class="mt-12 max-w-[640px] mx-auto" aria-label="Suggestions">
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

			{#if recents.length > 0}
				<div class="mt-10">
					<p class="font-ui text-[11px] uppercase tracking-[0.2em] text-muted mb-2">
						Récemment consulté
					</p>
					<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
						{#each recents as r (r)}
							<a
								href="/recherche?q={encodeURIComponent(r)}"
								class="font-body italic text-[15px] text-foreground hover:text-accent"
							>
								{r}
							</a>
						{/each}
						<button
							type="button"
							class="font-ui text-[12px] text-muted hover:text-accent ml-auto"
							onclick={clearRecents}
						>
							effacer
						</button>
					</div>
				</div>
			{/if}

			<p
				class="mt-12 pt-6 border-t border-border/60 font-ui text-[12px] text-muted text-center"
			>
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
			<p class="mt-4 font-ui text-[12px] text-muted leading-relaxed">
				Les accents et les œ/oe sont ignorés ; les recherches de moins de 2 caractères ne sont pas
				effectuées.
			</p>
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
									{@html highlight(h.title ?? h.text, hitMatchTerms(h))}
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

			{#if data.hits.length === 30 && activeType === 'all'}
				<p
					class="mt-8 font-body italic text-[13px] text-muted text-center tracking-wide"
				>
					Affichage des 30 meilleurs résultats — affinez votre recherche pour en voir plus.
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
	.search-line {
		position: relative;
		border-bottom: 1px solid var(--color-border);
		transition: border-color 120ms ease, border-bottom-width 120ms ease;
		display: flex;
		align-items: baseline;
	}
	.search-line:focus-within {
		border-bottom-color: var(--color-accent);
		box-shadow: 0 1.5px 0 0 var(--color-accent);
	}
	.search-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: 0;
		outline: none;
		padding: 0.75rem 0.25rem;
		font-family: var(--font-body);
		font-size: 1.125rem;
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
		left: 0.25rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--color-muted);
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1.125rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: calc(100% - 0.5rem);
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
		transition: color 120ms ease, border-color 120ms ease;
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

	/* Highlights — keep the 20% accent tint, drop the bold weight that made
	   results-heavy pages feel jittery. */
	:global(.search-highlight) {
		background: color-mix(in srgb, var(--color-accent) 20%, transparent);
		color: inherit;
		border-radius: 2px;
		padding: 1px 3px;
	}
</style>
