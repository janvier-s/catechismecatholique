<script lang="ts">
	type Range = { from: number; to: number };
	type Heading = { id: string; title: string; paragraph_start: number };
	type Article = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
		headings?: Heading[];
	};
	type Chapter = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
		articles: Article[];
		headings?: Heading[];
	};
	type Section = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
		chapters: Chapter[];
		articles_direct?: Article[];
	};
	type Part = {
		slug: string;
		title: string;
		number?: number;
		prologue?: boolean;
		range?: Range;
		sections: Section[];
	};

	let { parts, headingLevel = 2 }: { parts: Part[]; headingLevel?: 2 | 3 } = $props();

	const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
	const ROMAN_ORD = ['', 'Une', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept'];

	function fmtRange(r: Range | undefined): string {
		if (!r) return '';
		return r.from === r.to ? `${r.from}` : `${r.from} – ${r.to}`;
	}

	function chapterNumLabel(n: number | undefined): string {
		if (n === undefined) return '';
		return ROMAN_ORD[n] ? `Chapitre ${ROMAN_ORD[n]}` : `Chapitre ${n}`;
	}
	function articleNumLabel(n: number | undefined): string {
		if (n === undefined) return '';
		return `Article ${n}`;
	}
</script>

<div class="panorama">
	{#each parts as part (part.slug)}
		<article class="pano-part" class:is-prologue={part.prologue}>
			{#if !part.prologue}
				<p class="pano-part-eyebrow">Partie {ROMAN[part.number ?? 0] ?? part.number ?? ''}</p>
			{/if}
			{#if headingLevel === 2}
				<h2 class="pano-part-title">
					<a href="/ccc/{part.slug}">{part.title}</a>
				</h2>
			{:else}
				<h3 class="pano-part-title">
					<a href="/ccc/{part.slug}">{part.title}</a>
				</h3>
			{/if}

			{#each part.sections as section (section.slug)}
				{@const cards =
					section.chapters.length > 0
						? section.chapters.map((c) => ({
								kind: 'chapter' as const,
								slug: c.slug,
								title: c.title,
								number: c.number,
								numLabel: chapterNumLabel(c.number),
								range: c.range,
								items: c.articles
							}))
						: (section.articles_direct ?? []).map((a) => ({
								kind: 'article' as const,
								slug: a.slug,
								title: a.title,
								number: a.number,
								numLabel: articleNumLabel(a.number),
								range: a.range,
								items: [] as Article[]
							}))}
				<section class="pano-section" style="--cols: {Math.min(cards.length, 3)}">
					<header class="pano-section-head">
						{#if section.number}
							<p class="pano-section-eyebrow">Section {section.number}</p>
						{/if}
						<a class="pano-section-title-link" href="/ccc/{part.slug}/{section.slug}">
							<h3 class="pano-section-title">{section.title}</h3>
						</a>
					</header>

					<div class="pano-section-cards">
						{#each cards as card (card.slug)}
							{@const href =
								card.kind === 'chapter'
									? `/ccc/${part.slug}/${section.slug}/${card.slug}`
									: `/ccc/${part.slug}/${section.slug}/${card.slug}`}
							<div class="pano-cell">
								<a class="pano-cell-banner" {href}>
									<p class="pano-cell-banner-title">{card.title}</p>
									{#if card.numLabel}
										<p class="pano-cell-banner-sub">{card.numLabel}</p>
									{/if}
								</a>
								<div class="pano-cell-well">
									{#if card.kind === 'chapter' && card.items.length > 0}
										<ul>
											{#each card.items as article (article.slug)}
												<li>
													<a href="{href}/{article.slug}">
														<span class="pano-cell-art">{article.title}</span>
														{#if article.number !== undefined}
															<span class="pano-cell-art-num">(Article {article.number})</span>
														{/if}
													</a>
												</li>
											{/each}
										</ul>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					<div class="pano-section-ranges" aria-hidden="true">
						{#each cards as card (card.slug + '-range')}
							<div class="pano-range-cell">{fmtRange(card.range)}</div>
						{/each}
					</div>
				</section>
			{/each}
		</article>
	{/each}
</div>

<style>
	.panorama {
		display: flex;
		flex-direction: column;
		gap: clamp(2.5rem, 6vw, 4rem);
		font-family: var(--font-ui);
		color: var(--color-fg);
	}

	/* Part — quiet eyebrow + display-serif title above the section blocks */
	.pano-part {
		display: flex;
		flex-direction: column;
		gap: clamp(1.75rem, 4vw, 2.75rem);
	}
	.pano-part-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0;
		text-align: center;
	}
	.pano-part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.3rem, 2.2vw, 1.6rem);
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-fg);
		text-align: center;
		margin: -0.25rem 0 0;
	}
	.pano-part-title a {
		color: inherit;
		text-decoration: none;
	}
	.pano-part-title a:hover {
		color: var(--color-accent);
	}
	.pano-part.is-prologue .pano-part-title {
		font-size: 1.2rem;
	}

	/* Section block — title → cards row → range band, all aligned to the
	   same N-column grid via --cols on the section root. */
	.pano-section {
		--cols: 3;
		display: grid;
		grid-template-columns: 1fr;
		row-gap: clamp(1.25rem, 3vw, 2rem);
	}
	.pano-section-head {
		text-align: center;
	}
	.pano-section-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.35rem;
	}
	.pano-section-title-link {
		text-decoration: none;
		color: inherit;
	}
	.pano-section-title {
		font-family: var(--font-heading);
		font-size: clamp(1.15rem, 2vw, 1.4rem);
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-heading, var(--color-fg));
		margin: 0;
	}
	.pano-section-title-link:hover .pano-section-title {
		color: var(--color-accent);
	}

	/* Card row */
	.pano-section-cards,
	.pano-section-ranges {
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		gap: 0;
	}

	.pano-cell {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.pano-cell-banner {
		display: block;
		text-align: center;
		text-decoration: none;
		color: inherit;
		background: color-mix(in srgb, var(--color-accent) 7%, transparent);
		border-top: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		padding: 1rem 0.85rem 0.95rem;
	}
	.pano-cell-banner-title {
		font-family: var(--font-heading);
		font-weight: 600;
		font-size: clamp(0.95rem, 1.4vw, 1.1rem);
		line-height: 1.3;
		color: var(--color-fg);
		margin: 0;
		transition: color 150ms ease;
	}
	.pano-cell-banner:hover .pano-cell-banner-title {
		color: var(--color-accent);
	}
	.pano-cell-banner-sub {
		font-family: var(--font-ui);
		font-style: normal;
		font-weight: 500;
		font-size: 0.7rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		line-height: 1.4;
		color: var(--color-muted);
		margin: 0.45rem 0 0;
	}

	.pano-cell-well {
		flex: 1;
		padding: 1.4rem 0.6rem 0;
		text-align: center;
	}
	.pano-cell-well ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.pano-cell-well a {
		text-decoration: none;
		color: inherit;
	}
	.pano-cell-art {
		display: block;
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 500;
		font-size: 1rem;
		line-height: 1.3;
		color: var(--color-fg);
		transition: color 150ms ease;
	}
	.pano-cell-well a:hover .pano-cell-art {
		color: var(--color-accent);
	}
	.pano-cell-art-num {
		display: block;
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 400;
		font-size: 0.82rem;
		color: var(--color-subtle);
		margin-top: 0.15rem;
	}

	/* Range band — quiet tinted footer that mirrors the cards grid */
	.pano-section-ranges {
		background: color-mix(in srgb, var(--color-accent) 7%, transparent);
		border-top: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
		color: var(--color-accent);
		margin-top: 0;
	}
	.pano-range-cell {
		padding: 0.6rem 0.5rem;
		text-align: center;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		font-variant-numeric: tabular-nums lining-nums;
		box-shadow: inset 1px 0 0 color-mix(in srgb, var(--color-accent) 18%, transparent);
	}
	.pano-range-cell:first-child {
		box-shadow: none;
	}

	@media (max-width: 720px) {
		.pano-section-cards,
		.pano-section-ranges {
			grid-template-columns: 1fr;
		}
		.pano-range-cell {
			box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-accent) 18%, transparent);
		}
		.pano-range-cell:first-child {
			box-shadow: none;
		}
	}
</style>
