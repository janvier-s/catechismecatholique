<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { stripDiacritics } from '$lib/utils/searchTokenizer';
	import { detectIntent } from '$lib/utils/searchIntent';
	import { loadParagraphContext } from '$lib/data/loaders';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ParagraphContext } from '$lib/data/types';
	import SearchSuggest from '$lib/components/ui/SearchSuggest.svelte';
	import RelatedTopics from '$lib/components/ui/RelatedTopics.svelte';
	import BibleBlock from '$lib/components/bible/BibleBlock.svelte';

	let { data }: { data: PageData } = $props();

	/** "3-5.8-10" · a single from === to entry renders as a bare verse number. */
	function refLabel(groups: { from: string; to: string }[]): string {
		return groups.map((g) => (g.from === g.to ? g.from : `${g.from}–${g.to}`)).join('.');
	}

	// Paragraph contexts populate per-hit via tiny shard fetches (~30 bytes
	// each) instead of the legacy 1.8 MB bundle. Result rows render
	// immediately; breadcrumbs pop in as the shards arrive. Each context is
	// requested at most once thanks to the loader's module-level cache.
	const contexts = $state<Record<number, ParagraphContext>>({});
	const requested = new SvelteSet<number>();
	$effect(() => {
		for (const h of data.hits) {
			if (h.kind === 'compendium-question' || h.kind === 'cdse-paragraph') continue;
			const num = h.kind === 'paragraph' ? h.number : h.paragraph_start;
			if (!num || requested.has(num)) continue;
			requested.add(num);
			void loadParagraphContext(num).then((c) => {
				if (c) contexts[num] = c;
			});
		}
	});

	// Local query state mirrors ?q for the form input. Re-seeded by an effect
	// below so subsequent navigations (back/forward, internal links) update it.
	let q = $state('');
	let inputEl: HTMLInputElement | null = $state(null);
	let recents: string[] = $state([]);
	let suggestEl: SearchSuggest | undefined = $state();
	let suggestOpen = $state(false);

	// Pagination · show in batches of PAGE_SIZE; "Voir plus" reveals the next
	// batch. Reset whenever the query changes.
	const PAGE_SIZE = 30;
	let visiblePages = $state(1);

	// Active filter tab · Tout / Sections / Paragraphes / Compendium. URL state is canonical.
	const activeType = $derived<'all' | 'headings' | 'paragraphs' | 'compendium' | 'cdse'>(
		(page.url.searchParams.get('type') as
			| 'all'
			| 'headings'
			| 'paragraphs'
			| 'compendium'
			| 'cdse'
			| null) ?? 'all'
	);

	$effect(() => {
		// Keep input in sync with the URL when the user navigates via links/back.
		q = data.q ?? '';
		visiblePages = 1;
		// Capture EVERY query that lands on this page into recents · covers
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
			/* quota or disabled · silent */
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
		// Auto-focus when there's no active query · the empty state expects input.
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
		// Paragraph refs navigate directly; Bible refs go through search so
		// the Bible card and citing CEC paragraphs both appear.
		const intent = detectIntent(trimmed);
		if (intent.kind === 'paragraph') {
			pushRecent(trimmed);
			void goto(intent.href);
			return;
		}
		const searchQ = intent.kind === 'bible' ? trimmed : intent.q;
		pushRecent(searchQ);
		void goto(`/recherche?q=${encodeURIComponent(searchQ)}`);
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
		if (h.kind === 'compendium-question') return `/compendium/q/${h.number}`;
		if (h.kind === 'cdse-paragraph') return `/doctrine-sociale/p/${h.number}`;
		if (h.kind === 'paragraph') return `/cec/${h.number}`;
		const anchor = h.id.split('#')[1] ?? '';
		if (h.paragraph_start) return `/cec/${h.paragraph_start}${anchor ? '#' + anchor : ''}`;
		if (h.chapter_slug) return `/cec/${h.chapter_slug}${anchor ? '#' + anchor : ''}`;
		return '/cec';
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
		if (h.kind === 'compendium-question') return h.compendium_part ?? null;
		if (h.kind === 'cdse-paragraph') return h.title ?? null;
		const num = h.kind === 'paragraph' ? h.number : h.paragraph_start;
		if (!num) return null;
		const ctx = contexts[num];
		if (!ctx) return null;
		// Some paragraphs (e.g. prologue) only carry part + heading · no
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
	const compendiumCount = $derived(
		data.hits.filter((h) => h.kind === 'compendium-question').length
	);
	const cdseCount = $derived(data.hits.filter((h) => h.kind === 'cdse-paragraph').length);
	const totalCount = $derived(data.hits.length);

	const filteredHits = $derived.by<Hit[]>(() => {
		if (activeType === 'headings') return data.hits.filter((h) => h.kind === 'heading');
		if (activeType === 'paragraphs') return data.hits.filter((h) => h.kind === 'paragraph');
		if (activeType === 'compendium')
			return data.hits.filter((h) => h.kind === 'compendium-question');
		if (activeType === 'cdse') return data.hits.filter((h) => h.kind === 'cdse-paragraph');
		return data.hits;
	});
	const visibleHits = $derived(filteredHits.slice(0, visiblePages * PAGE_SIZE));
	const hasMore = $derived(visibleHits.length < filteredHits.length);

	function tabHref(type: 'all' | 'headings' | 'paragraphs' | 'compendium' | 'cdse'): string {
		// Plain string assembly · URLSearchParams would trigger
		// svelte/prefer-svelte-reactivity, but this is a one-shot pure
		// builder with no reactivity needed.
		const parts: string[] = [];
		if (data.q) parts.push(`q=${encodeURIComponent(data.q)}`);
		if (type !== 'all') parts.push(`type=${type}`);
		const qs = parts.join('&');
		return qs ? `/recherche?${qs}` : '/recherche';
	}

	// Example queries for the empty state. Paragraph refs navigate directly;
	// Bible refs and text go through the search page so the Bible card and
	// citing CEC paragraphs both appear.
	function exampleHref(q: string): string {
		const intent = detectIntent(q);
		if (intent.kind === 'paragraph') return intent.href;
		return `/recherche?q=${encodeURIComponent(q)}`;
	}

	// TODO(deferred): client-side "did you mean" suggestions on zero-results.
	// Requires loading the index dictionary client-side or shipping a small
	// Levenshtein-1 lookup table. Skipped for this pass · see design spec.
</script>

<svelte:head>
	<title
		>Recherche{data.q ? ` « ${data.q.slice(0, 80)} »` : ''} · Catéchisme de l'Église Catholique</title
	>
	<meta
		name="description"
		content="Recherchez dans le Catéchisme de l'Église Catholique, le Compendium et la Doctrine sociale. Mot-clé, numéro de paragraphe, ou référence biblique."
	/>
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<main class="recherche">
	<header class="search-hero">
		<span class="hero-ornament" aria-hidden="true">
			<span class="rule"></span>
			<span class="fleuron">✠</span>
			<span class="rule"></span>
		</span>
		<p class="hero-kicker">Catalogue général</p>
		<h1 class="hero-title">Recherche</h1>
		<p class="hero-lede">
			Catéchisme · Compendium · Doctrine sociale. Par mot, paragraphe ou référence biblique.
		</p>
		<form class="search-form" onsubmit={handleSubmit}>
			<div class="search-wrap">
				<div class="search-line">
					<input
						bind:this={inputEl}
						bind:value={q}
						type="search"
						name="q"
						autocomplete="off"
						role="combobox"
						aria-label="Recherche"
						aria-autocomplete="list"
						aria-controls="search-suggest-list"
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
		<!-- Empty state -->
		<section class="empty-state" aria-label="Suggestions">
			{#if recents.length > 0}
				<div class="recents">
					<div class="recents-head">
						<h2 class="recents-label">Récemment consulté</h2>
						<button type="button" class="recents-clear" onclick={clearRecents}>effacer</button>
					</div>
					<ul class="recent-list">
						{#each recents as r (r)}
							<li>
								<a href="/recherche?q={encodeURIComponent(r)}" class="recent-link">{r}</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="example-blocks">
				<div class="example-block">
					<p class="example-kind">Thèmes et doctrines</p>
					<p class="example-terms">
						<a href={exampleHref('trinité')} class="ex-term">trinité</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('eucharistie')} class="ex-term">eucharistie</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('grâce')} class="ex-term">grâce</a>
					</p>
				</div>
				<div class="example-block">
					<p class="example-kind">Numéros de paragraphe</p>
					<p class="example-terms">
						<a href={exampleHref('27')} class="ex-term">27</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('1324-1327')} class="ex-term">1324–1327</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('27,245,460')} class="ex-term">27, 245, 460</a>
					</p>
				</div>
				<div class="example-block">
					<p class="example-kind">
						Références bibliques <span class="example-kind-note"
							>virgule ou deux-points · plages : Jn 3:16-17 · multiples : Jn 3:16.18</span
						>
					</p>
					<p class="example-terms">
						<a href={exampleHref('Jn 3, 16')} class="ex-term">Jn 3, 16</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('Matt 5:3-5')} class="ex-term">Matt 5:3-5</a>
						<span class="ex-sep" aria-hidden="true">·</span>
						<a href={exampleHref('Matthieu 16:18')} class="ex-term">Matthieu 16:18</a>
					</p>
				</div>
			</div>

			<p class="browse-footer">
				Parcourir&nbsp;: <a class="browse-link" href="/cec/sommaire">Sommaire du CEC</a>
				<span aria-hidden="true">·</span>
				<a class="browse-link" href="/glossaire">Glossaire</a>
				<span aria-hidden="true">·</span>
				<a class="browse-link" href="/bibliotheque">Bibliothèque</a>
			</p>
		</section>
	{:else if !data.bibleCard && data.hits.length === 0}
		<!-- Zero-results state -->
		<section class="mt-10 max-w-[640px] mx-auto text-center">
			<p class="font-body italic text-muted text-[16px]">
				Aucun résultat pour «&nbsp;{data.q}.&nbsp;»
			</p>
			{#if data.suggestions.length > 0}
				<p class="mt-6 font-ui text-[12px] uppercase tracking-[0.2em] text-muted">Termes proches</p>
				<ul class="mt-2 flex flex-wrap justify-center gap-2 list-none p-0">
					{#each data.suggestions as s (s.slug)}
						<li>
							<a class="suggestion-pill" href="/glossaire/{s.slug}">{s.term}</a>
						</li>
					{/each}
				</ul>
			{/if}
			<RelatedTopics query={data.q} />
			<p class="mt-6 font-ui text-[13px]">
				<a class="browse-link" href="/glossaire?q={encodeURIComponent(data.q)}"
					>Parcourir le Glossaire pour ce terme →</a
				>
			</p>
			<p class="mt-2 font-ui text-[13px]">
				<a class="browse-link" href="/cec/sommaire">Voir le Sommaire du Catéchisme →</a>
			</p>
		</section>
	{:else}
		<!-- Results (includes Bible card when searching a verse) -->
		<section class="mt-8">
			{#if data.bibleCard}
				{#if data.bibleCard.excerpts?.length}
					<!-- Paragraph-mode excerpt: flows like the reader itself, not an
					     italic quote. Disjoint spans (e.g. 3-5.8-10) get a "⋯" divider. -->
					<a class="bible-card" href={data.bibleCard.href}>
						<span class="bible-card-eyebrow">
							<span class="bible-card-tag">Bible</span>
							<span class="bible-card-ref"
								>{data.bibleCard.bookName}
								{data.bibleCard.chapter}, {refLabel(data.bibleCard.groups)}</span
							>
						</span>
						<span class="bible-card-body">
							<span class="bible-card-title"
								>{data.bibleCard.bookName}
								{data.bibleCard.chapter}, {refLabel(data.bibleCard.groups)}</span
							>
							<span class="bible-card-excerpt">
								{#each data.bibleCard.excerpts as excerpt, i (excerpt.from)}
									{#if i > 0}<span class="excerpt-gap" aria-hidden="true">⋯</span>{/if}
									{#each excerpt.blocks as block, bi (bi)}
										<BibleBlock {block} />
									{/each}
								{/each}
							</span>
							<span class="bible-card-cta">Lire dans la Bible →</span>
						</span>
					</a>
				{:else if data.bibleCard.groups.length > 1}
					<!-- No paragraph-mode data for this book: fall back to a container
					     of separate links, one per verse/range named. -->
					<div class="bible-card">
						<span class="bible-card-eyebrow">
							<span class="bible-card-tag">Bible</span>
							<span class="bible-card-ref">{data.bibleCard.bookName} {data.bibleCard.chapter}</span>
						</span>
						<span class="bible-card-body">
							<span class="bible-card-title"
								>{data.bibleCard.bookName} {data.bibleCard.chapter}</span
							>
							{#if data.bibleCard.verseTexts?.length}
								<span class="bible-card-verses">
									{#each data.bibleCard.verseTexts as vt (vt.verse)}
										<span class="bible-verse-text">
											<sup class="bible-verse-num">{vt.verse}</sup>{vt.text}
										</span>
									{/each}
								</span>
							{/if}
							<span class="bible-card-verse-links">
								{#each data.bibleCard.groups as g (g.from)}
									<a class="bible-card-verse-link" href={g.href}
										>v. {g.from === g.to ? g.from : `${g.from}–${g.to}`} →</a
									>
								{/each}
							</span>
						</span>
					</div>
				{:else}
					<!-- Single verse or range, no paragraph-mode data: compact italic quote. -->
					<a class="bible-card" href={data.bibleCard.href}>
						<span class="bible-card-eyebrow">
							<span class="bible-card-tag">Bible</span>
							<span class="bible-card-ref"
								>{data.bibleCard.bookName}
								{data.bibleCard.chapter}, {refLabel(data.bibleCard.groups)}</span
							>
						</span>
						<span class="bible-card-body">
							<span class="bible-card-title"
								>{data.bibleCard.bookName}
								{data.bibleCard.chapter}, {refLabel(data.bibleCard.groups)}</span
							>
							{#if data.bibleCard.verseTexts?.length}
								<span class="bible-card-verses">
									{#each data.bibleCard.verseTexts as vt (vt.verse)}
										<span class="bible-verse-text">
											{#if (data.bibleCard.verseTexts?.length ?? 0) > 1}<sup class="bible-verse-num"
													>{vt.verse}</sup
												>{/if}{vt.text}
										</span>
									{/each}
								</span>
							{/if}
							<span class="bible-card-cta">Lire dans la Bible →</span>
						</span>
					</a>
				{/if}
			{/if}

			{#if data.hits.length > 0}
				<div class="flex items-baseline justify-between mb-3 gap-4">
					<p class="font-ui text-xs text-muted tabular-nums">
						{data.bibleCard
							? 'Paragraphes du Catéchisme citant ce verset'
							: `Résultats pour « ${data.q} »`}
					</p>
				</div>
				{#if data.mode === 'or' && data.matchedTokens.length > 0}
					<p class="partial-banner font-ui text-[12px] mb-4 text-muted">
						Aucun résultat ne contient l'expression complète. Affichage des résultats contenant
						{#each data.matchedTokens as t, i (t)}<span class="text-foreground"
								>«&nbsp;{t}&nbsp;»</span
							>{#if i < data.matchedTokens.length - 1}{i === data.matchedTokens.length - 2
									? ' et '
									: ', '}{/if}{/each}.
					</p>
				{/if}

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
					{#if compendiumCount > 0}
						<a
							href={tabHref('compendium')}
							class="tab"
							class:active={activeType === 'compendium'}
							aria-current={activeType === 'compendium' ? 'true' : undefined}
						>
							Compendium <span class="tabular-nums text-muted">({compendiumCount})</span>
						</a>
					{/if}
					{#if cdseCount > 0}
						<a
							href={tabHref('cdse')}
							class="tab"
							class:active={activeType === 'cdse'}
							aria-current={activeType === 'cdse' ? 'true' : undefined}
						>
							Doctrine sociale <span class="tabular-nums text-muted">({cdseCount})</span>
						</a>
					{/if}
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
								{:else if h.kind === 'compendium-question'}
									<div class="result-eyebrow tabular-nums">
										<span class="tag">COMPENDIUM</span>
										<span class="ref">Q. {h.number}</span>
									</div>
									<div class="result-snippet">
										{@html snippetHtml(h)}
									</div>
								{:else if h.kind === 'cdse-paragraph'}
									<div class="result-eyebrow tabular-nums">
										<span class="tag">DOCTRINE SOCIALE</span>
										<span class="ref">{h.number}</span>
									</div>
									<div class="result-snippet">
										{@html snippetHtml(h)}
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
			{/if}
		</section>
	{/if}
</main>

<style>
	/* ── Container ─────────────────────────────────────────────── */
	.recherche {
		max-width: 60rem;
		margin: 0 auto;
		padding: clamp(0.5rem, 2vw, 1.5rem) clamp(1.25rem, 4vw, 2.5rem) 6rem;
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	/* ── Hero ────────────────────────────────────────────────────── */
	.search-hero {
		text-align: center;
		padding: 1rem 0 clamp(2rem, 4vw, 3rem);
	}
	.hero-ornament {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		max-width: 220px;
		width: 100%;
		margin: 0 auto 1.1rem;
	}
	.rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 20%, transparent),
			transparent
		);
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 0.95rem;
		color: var(--color-accent);
		line-height: 1;
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.45rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 700;
		font-size: clamp(2rem, 4.5vw, 3.2rem);
		line-height: 1.05;
		letter-spacing: -0.005em;
		margin: 0 0 0.75rem;
		color: var(--color-fg);
	}
	.hero-lede {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.9rem;
		color: var(--color-subtle);
		margin: 0 auto 1.75rem;
		max-width: 46ch;
		line-height: 1.6;
	}

	/* ── Search form (centred inside hero) ─────────────────────── */
	.search-form {
		width: 100%;
		max-width: 640px;
		margin: 0 auto;
	}

	/* --- search input --- */
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
		align-items: center;
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
	/* Hide the native browser search clear icon · we provide our own. */
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
		align-items: center;
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

	/* ── Empty state ─────────────────────────────────────────────── */
	.empty-state {
		max-width: 640px;
		margin: 0 auto;
	}

	.recents {
		margin-bottom: 2.5rem;
	}
	.recents-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 0.65rem;
	}
	.recents-label {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0;
	}
	.recents-clear {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		letter-spacing: 0.4px;
		color: var(--color-muted);
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		transition: color 120ms ease;
	}
	.recents-clear:hover {
		color: var(--color-accent);
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
	/* Middot bullet · matches the hairline list register elsewhere. */
	.recent-list li::before {
		content: '·';
		color: var(--color-muted);
		flex: none;
	}
	.recent-link {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1rem;
		color: var(--color-fg);
		text-decoration: none;
		transition: color 120ms ease;
	}
	.recent-link:hover {
		color: var(--color-accent);
	}

	.example-blocks {
		display: flex;
		flex-direction: column;
		gap: 1.85rem;
		margin: 0 0 2.5rem;
	}
	.example-kind {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--color-subtle);
		margin: 0 0 0.55rem;
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.example-kind-note {
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: none;
		color: var(--color-muted);
		font-style: italic;
		opacity: 0.8;
	}
	.example-terms {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem 0.55rem;
		margin: 0;
	}
	.ex-term {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.25rem;
		color: var(--color-fg);
		text-decoration: none;
		line-height: 1.3;
		transition: color 120ms ease;
	}
	.ex-term:hover {
		color: var(--color-accent);
	}
	.ex-sep {
		color: var(--color-muted);
		font-size: 0.85rem;
		line-height: 1;
	}

	.browse-footer {
		padding-top: 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
		font-family: var(--font-ui);
		font-size: 0.72rem;
		color: var(--color-muted);
		text-align: center;
		line-height: 1.8;
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

	/* --- Bible card --------------------------------------------------------- */
	/* Appears at the top of results when the query is a Bible verse reference.
	   Styled as a distinct featured result: accent left border, serif title,
	   so it reads as "here is the verse" not "here is a search result". */
	.bible-card {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.9rem 0.9rem 0.9rem 1.1rem;
		margin-bottom: 1.5rem;
		border: 1px solid color-mix(in srgb, var(--color-accent) 28%, transparent);
		border-left: 3px solid var(--color-accent);
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-accent) 4%, var(--color-panel));
		text-decoration: none;
		color: var(--color-fg);
		transition:
			background-color 160ms ease,
			border-color 160ms ease;
	}
	.bible-card:hover {
		background: color-mix(in srgb, var(--color-accent) 8%, var(--color-panel));
	}
	.bible-card-eyebrow {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		font-family: var(--font-ui);
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.bible-card-tag {
		color: var(--color-accent);
	}
	.bible-card-ref {
		color: var(--color-muted);
	}
	.bible-card-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.bible-card-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 1.3rem;
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-fg);
	}
	.bible-card:hover .bible-card-title {
		color: var(--color-accent);
	}
	.bible-card-cta {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-accent);
		white-space: nowrap;
		align-self: flex-start;
	}
	.bible-card-verses {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.bible-card-excerpt {
		color: var(--color-fg);
		margin-bottom: 0.75rem;
	}
	.excerpt-gap {
		display: block;
		text-align: center;
		color: var(--color-muted);
		margin: 0.25rem 0 0.75rem;
	}
	.bible-verse-text {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.93rem;
		line-height: 1.6;
		color: var(--color-fg);
	}
	.bible-verse-num {
		font-family: var(--font-ui);
		font-style: normal;
		font-size: 0.6em;
		font-weight: 700;
		color: var(--color-accent);
		margin-right: 0.2em;
		vertical-align: super;
		font-variant-numeric: tabular-nums;
	}
	.bible-card-verse-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
	}
	.bible-card-verse-link {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
		white-space: nowrap;
		transition: color 120ms ease;
	}
	.bible-card-verse-link:hover {
		color: var(--color-fg);
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
		font-size: 12px;
		font-style: italic;
		color: var(--color-subtle);
		opacity: 0.75;
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

	/* Highlights · keep the 20% accent tint, drop the bold weight that made
	   results-heavy pages feel jittery. */
	:global(.search-highlight) {
		background: color-mix(in srgb, var(--color-accent) 20%, transparent);
		color: inherit;
		border-radius: 2px;
		padding: 1px 3px;
	}

	.suggestion-pill {
		display: inline-block;
		padding: 0.3rem 0.7rem;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		color: var(--color-fg);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-panel);
		text-decoration: none;
		transition:
			border-color 120ms ease,
			color 120ms ease,
			background-color 120ms ease;
	}
	.suggestion-pill:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
</style>
