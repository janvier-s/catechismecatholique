<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import { goto } from '$app/navigation';
	import { detectIntent } from '$lib/utils/searchIntent';
	import { fmtParagraphRange } from '$lib/utils/paragraphRange';
	import { topicsForPart, type TopicStructure } from '$lib/cecTopics';

	let { data } = $props();

	// Supplied by the root +layout.ts, which now loads structure-toc.json for
	// /cec because the rail is shown here. So the part ranges and every topic
	// range below are read from the corpus at no extra network cost — they used
	// to be hardcoded strings on this page, which is how they drift.
	const structure = $derived((data.cecStructure ?? null) as TopicStructure | null);

	type PartCard = { slug: string; kicker: string; gloss: string };

	/** Titles and ranges come from the structure; only the eyebrow numbering
	 *  and the one-line gloss are editorial. */
	const PARTS: PartCard[] = [
		{
			slug: '1-profession-de-la-foi',
			kicker: 'Première partie',
			gloss: "Ce que l'Église croit"
		},
		{
			slug: '2-celebration-du-mystere',
			kicker: 'Deuxième partie',
			gloss: "Ce que l'Église célèbre"
		},
		{
			slug: '3-vie-dans-le-christ',
			kicker: 'Troisième partie',
			gloss: "Ce que l'Église vit"
		},
		{
			slug: '4-priere-chretienne',
			kicker: 'Quatrième partie',
			gloss: "Ce que l'Église prie"
		}
	];

	const cards = $derived(
		PARTS.map((c) => {
			const part = structure?.parts.find((p) => p.slug === c.slug);
			return {
				...c,
				title: part?.title ?? '',
				range: part?.range,
				topics: topicsForPart(structure, c.slug)
			};
		})
	);

	const prologue = $derived(structure?.parts.find((p) => p.prologue === true));
	const firstPart = $derived(structure?.parts.find((p) => p.slug === PARTS[0]!.slug));

	// Where "Commencer la lecture" goes · the first chapter of the first
	// section, which opens at 27. Part one's range starts at 26, but that
	// paragraph is the section's own one-line preamble, so the reader is
	// better off landing on the first real chapter. Derived rather than
	// hardcoded so a renumbered corpus moves the button with it.
	const firstChapter = $derived.by(() => {
		const section = firstPart?.sections?.[0];
		const chapter = section?.chapters?.[0];
		if (!firstPart || !section || !chapter) return null;
		return {
			href: `/cec/${firstPart.slug}/${section.slug}/${chapter.slug}`,
			from: chapter.range?.from
		};
	});

	// Highest paragraph in the corpus · bounds the jump-to field so a typo
	// lands on a hint here instead of a 404 two navigations later.
	const lastParagraph = $derived(
		structure?.parts.reduce((max, p) => Math.max(max, p.range?.to ?? 0), 0) || 2865
	);

	let jump = $state('');
	let jumpError = $state('');

	function submitJump(e: SubmitEvent) {
		e.preventDefault();
		const raw = jump.trim();
		if (!raw) return;
		const intent = detectIntent(raw);
		if (intent.kind === 'paragraph') {
			// detectIntent accepts a bare number, a range and a comma list; the
			// first number is enough to bounds-check any of those forms.
			const first = Number(raw.replace(/§/g, '').split(/[-–,]/)[0]!.trim());
			if (first < 1 || first > lastParagraph) {
				jumpError = `Le Catéchisme va du paragraphe 1 au paragraphe ${lastParagraph}.`;
				return;
			}
			jumpError = '';
			void goto(intent.href);
			return;
		}
		// Anything that isn't a paragraph reference is a word · hand it to the
		// search rather than rejecting it, since the field is the first thing
		// some readers will type into.
		jumpError = '';
		void goto(`/recherche?q=${encodeURIComponent(raw)}`);
	}
</script>

<MetaTags
	title="Catéchisme de l'Église Catholique · Lire l'édition française complète"
	description="Lisez le Catéchisme de l'Église Catholique en français : prologue, quatre parties, 2865 paragraphes. Recherche par mot-clé, référence biblique et thème."
	image="/img/bibliotheque/cec.webp"
	schema={{
		kind: 'book',
		name: "Catéchisme de l'Église Catholique",
		author: 'Saint Jean-Paul II',
		datePublished: '1992',
		bookEdition: 'editio typica · 1997',
		about: 'Exposé organique et systématique de la foi catholique'
	}}
/>

<main class="ccc-index">
	<header class="hero">
		<p class="hero-kicker">Édition française</p>
		<h1 class="hero-title">Catéchisme de l'Église Catholique</h1>
		<p class="hero-lede">
			Toute la foi catholique en 2&nbsp;865 paragraphes numérotés : ce qu'elle croit, ce qu'elle
			célèbre, comment elle vit et comment elle prie.
		</p>

		<!-- Two ways in, both concrete. The rail on the left is the third · it
		     carries the whole tree, so this row doesn't repeat it.

		     The primary action opens the book proper, not the prologue: the
		     prologue is front matter about the Catechism's own plan, which is
		     not what a visitor came to read. -->
		<div class="hero-actions">
			<a
				class="cta-primary"
				href={firstChapter?.href ??
					'/cec/1-profession-de-la-foi/1-je-crois-nous-croyons/1-homme-est-capable-de-dieu'}
			>
				<span class="cta-label">Commencer la lecture</span>
				<span class="cta-meta">
					Première partie · à partir du paragraphe {firstChapter?.from ?? 27}
				</span>
			</a>

			<form class="jump" onsubmit={submitJump}>
				<label class="jump-label" for="jump-input">Aller à un paragraphe</label>
				<div class="jump-row">
					<input
						id="jump-input"
						class="jump-input"
						type="text"
						inputmode="numeric"
						autocomplete="off"
						placeholder="1324"
						bind:value={jump}
						oninput={() => (jumpError = '')}
						aria-describedby="jump-hint"
					/>
					<button class="jump-go" type="submit" aria-label="Aller au paragraphe">→</button>
				</div>
				<p class="jump-hint" id="jump-hint" class:is-error={jumpError !== ''}>
					{jumpError || `Un numéro, ou une plage : 1322-1419`}
				</p>
			</form>
		</div>

		<!-- Prologue kept reachable, but as a sentence rather than a button ·
		     it's the plan of the book, useful to some readers and the first
		     thing almost nobody actually wants. -->
		<p class="hero-secondary">
			Le <a href="/cec/prologue">prologue</a>
			({prologue?.range ? fmtParagraphRange(prologue.range) : '1 – 25'}) expose le plan du livre et
			la transmission de la foi.
		</p>
	</header>

	<!--
		Part cards · each one answers "what is actually in here?" with names a
		visitor recognises, because the abstract gloss alone ("Ce que l'Église
		célèbre") gives a newcomer nothing to aim at. Titles, ranges and the
		topic links all come from the corpus.
	-->
	<section class="parts" aria-label="Les quatre parties du Catéchisme">
		{#each cards as p (p.slug)}
			<article class="part-card">
				<a href="/cec/{p.slug}" class="part-head">
					<span class="part-kicker"
						>{p.kicker}{p.range ? ` · ${fmtParagraphRange(p.range)}` : ''}</span
					>
					<h2 class="part-title">{p.title}</h2>
					<span class="part-gloss">{p.gloss}</span>
				</a>
				{#if p.topics.length > 0}
					<ul class="topics">
						{#each p.topics as t (t.href)}
							<li>
								<a href={t.href} class="topic">
									<span class="topic-label">{t.label}</span>
									{#if t.range}
										<span class="topic-range">{fmtParagraphRange(t.range)}</span>
									{/if}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</article>
		{/each}
	</section>

	<!--
		Tool row · one copy (it used to be printed identically in the hero and
		again at the foot), and each name carries a line of explanation. Cold,
		"Panorama" and "Sommaire complet" don't tell a visitor which to pick.
	-->
	<nav class="tools" aria-labelledby="tools-title">
		<h2 class="tools-title" id="tools-title">Autres façons de parcourir</h2>
		<a class="tool" href="/cec/sommaire">
			<span class="tool-name">Sommaire</span>
			<span class="tool-desc">La table des matières complète, jusqu'aux articles.</span>
		</a>
		<a class="tool" href="/cec/panorama">
			<span class="tool-name">Panorama</span>
			<span class="tool-desc">Les grandes divisions d'un seul coup d'œil.</span>
		</a>
		<a class="tool" href="/glossaire">
			<span class="tool-name">Glossaire</span>
			<span class="tool-desc">Les mots du Catéchisme, définis.</span>
		</a>
		<a class="tool" href="/recherche">
			<span class="tool-name">Recherche</span>
			<span class="tool-desc">Par mot, par paragraphe ou par référence biblique.</span>
		</a>
	</nav>
</main>

<style>
	.ccc-index {
		max-width: 60rem;
		margin: 0 auto;
		padding: 2.75rem 1.5rem 3.5rem;
	}

	/* Hero ------------------------------------------------------------- */
	.hero {
		text-align: center;
		max-width: 44rem;
		margin: 0 auto 2.75rem;
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.85rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-size: clamp(1.15rem, 4.5vw, 2.6rem);
		font-weight: 600;
		line-height: 1.1;
		color: var(--color-fg);
		margin: 0 0 1.25rem;
		white-space: nowrap;
	}
	.hero-lede {
		font-family: var(--font-body);
		font-size: clamp(1rem, 1.5vw, 1.1rem);
		line-height: 1.65;
		color: var(--color-subtle);
		margin: 0 auto;
		max-width: 34rem;
		text-wrap: pretty;
	}

	/* Ways in ---------------------------------------------------------- */
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: stretch;
		gap: 0.85rem;
		margin-top: 1.75rem;
		text-align: left;
	}
	.cta-primary {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.15rem;
		padding: 0.7rem 1.15rem;
		border-radius: 6px;
		background: var(--color-accent);
		text-decoration: none;
		transition: background 150ms ease;
	}
	.cta-primary:hover,
	.cta-primary:focus-visible {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
	}
	.cta-label {
		font-family: var(--font-ui);
		font-size: 0.95rem;
		font-weight: 600;
		color: #fff;
	}
	.cta-meta {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		color: rgba(255, 255, 255, 0.8);
	}

	.jump {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.jump-label {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.jump-row {
		display: flex;
		align-items: stretch;
		gap: 0.35rem;
	}
	.jump-input {
		width: 6.5rem;
		padding: 0.4rem 0.6rem;
		font-family: var(--font-ui);
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-fg);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 5px;
	}
	.jump-input:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
		outline-offset: 1px;
		border-color: var(--color-accent);
	}
	.jump-go {
		padding: 0 0.7rem;
		font-family: var(--font-heading);
		font-size: 1rem;
		color: var(--color-fg);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		cursor: pointer;
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}
	.jump-go:hover {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}
	.jump-hint {
		margin: 0;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
	}
	.jump-hint.is-error {
		color: var(--color-accent);
	}

	.hero-secondary {
		margin: 1.15rem 0 0;
		font-family: var(--font-body);
		font-size: 0.875rem;
		color: var(--color-muted);
		text-align: center;
	}
	.hero-secondary a {
		color: var(--color-fg);
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 30%, transparent);
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}
	.hero-secondary a:hover,
	.hero-secondary a:focus-visible {
		color: var(--color-accent);
		border-bottom-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}

	/* Parts grid ------------------------------------------------------- */
	/* Cards in a row are equal height. This is the grid's default stretch —
	   don't reintroduce `align-items: start`. Balancing the number of topic
	   links per card is not a substitute: part two's title wraps to two lines
	   where the others take one, so equal counts still give ragged heights. */
	.parts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
		margin-bottom: 2.75rem;
	}
	@media (max-width: 860px) {
		.parts {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}

	.part-card {
		display: flex;
		flex-direction: column;
		padding: 1.35rem 1.35rem 1.15rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-border) 12%, transparent);
		transition: border-color 150ms ease;
	}
	.part-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}
	.part-head {
		display: block;
		text-decoration: none;
		color: inherit;
	}
	.part-kicker {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		margin-bottom: 0.35rem;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1.25;
		color: var(--color-fg);
		margin: 0;
		transition: color 150ms ease;
	}
	.part-head:hover .part-title {
		color: var(--color-accent);
	}
	.part-gloss {
		display: block;
		font-family: var(--font-body);
		font-size: 0.9rem;
		font-style: italic;
		color: var(--color-subtle);
		margin-top: 0.3rem;
	}

	/* Topic list · the "what's inside" answer. Range right-aligned in a
	   tabular column, matching the rail immediately to its left. */
	.topics {
		list-style: none;
		padding: 0.85rem 0 0;
		margin: 0.95rem 0 0;
		display: flex;
		flex-direction: column;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}
	.topic {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.28rem 0;
		font-family: var(--font-ui);
		font-size: 0.875rem;
		color: var(--color-fg);
		text-decoration: none;
		transition: color 150ms ease;
	}
	.topic:hover {
		color: var(--color-accent);
	}
	.topic-range {
		flex: none;
		font-size: 0.72rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		color: var(--color-muted);
		transition: color 150ms ease;
	}
	.topic:hover .topic-range {
		color: var(--color-accent);
	}

	/* Tools ------------------------------------------------------------ */
	.tools {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}
	/* The site footer, a few hundred pixels below, lists Sommaire / Panorama /
	   Glossaire again as bare links. The heading is what stops this row from
	   reading as a stray second footer: here the names carry an explanation,
	   which is the whole reason it exists. */
	.tools-title {
		grid-column: 1 / -1;
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.25rem;
	}
	@media (max-width: 640px) {
		.tools {
			grid-template-columns: 1fr;
		}
	}
	.tool {
		text-decoration: none;
		color: inherit;
	}
	.tool-name {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-fg);
		transition: color 150ms ease;
	}
	.tool:hover .tool-name {
		color: var(--color-accent);
	}
	.tool-desc {
		display: block;
		font-family: var(--font-body);
		font-size: 0.85rem;
		line-height: 1.45;
		color: var(--color-muted);
		margin-top: 0.15rem;
	}

	@media (max-width: 640px) {
		.hero-title {
			white-space: normal;
			text-wrap: balance;
		}
		.hero-actions {
			flex-direction: column;
			align-items: stretch;
		}
		.cta-primary {
			align-items: flex-start;
		}
		.jump-input {
			flex: 1;
			width: auto;
		}
	}
</style>
