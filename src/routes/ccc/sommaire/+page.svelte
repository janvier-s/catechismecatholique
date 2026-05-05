<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Range = { from: number; to: number };
	type Heading = {
		id: string;
		level: number;
		title: string;
		paragraph_start: number;
	};
	type Article = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
		headings?: Heading[];
	};

	type HeadingNode = { heading: Heading; children: Heading[] };

	function nestHeadings(headings: Heading[] | undefined): HeadingNode[] {
		if (!headings) return [];
		const out: HeadingNode[] = [];
		const sorted = headings.slice().sort((a, b) => a.paragraph_start - b.paragraph_start);
		let current: HeadingNode | null = null;
		for (const h of sorted) {
			if (h.level >= 3 && current) {
				current.children.push(h);
			} else {
				current = { heading: h, children: [] };
				out.push(current);
			}
		}
		return out;
	}
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
	type Struct = { parts: Part[] };

	const struct = $derived(data.structure as Struct);

	const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

	function fmtRange(r: Range | undefined): string {
		if (!r) return '';
		return r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`;
	}
</script>

<svelte:head>
	<title>Sommaire — Catéchisme</title>
	<meta
		name="description"
		content="Table des matières complète du Catéchisme de l'Église catholique : prologue, quatre parties, sections, chapitres et articles."
	/>
</svelte:head>

<main class="toc">
	<header class="toc-head">
		<p class="eyebrow">Table des matières</p>
		<h1 class="title" aria-label="Sommaire complet">Sommaire</h1>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>
		<p class="lede">
			Un prologue, quatre parties.<br />
			La foi professée, célébrée, vécue, et priée.
		</p>
	</header>

	<div class="parts">
		{#each struct.parts as part, i (part.slug)}
			{@const roman = part.prologue ? '' : (ROMAN[part.number ?? i] ?? '')}
			<article class="part" class:is-prologue={part.prologue}>
				<header class="part-head">
					{#if !part.prologue}
						<p class="part-eyebrow">Partie {roman}</p>
					{/if}
					<h2 class="part-title">
						<a href="/ccc/{part.slug}">
							{#if !part.prologue}
								<span class="numeral-inline" aria-hidden="true">{roman}.</span>
								<span>{part.title}</span>
							{:else}
								<span>Prologue</span>
							{/if}
						</a>
					</h2>
					{#if part.range}
						<p class="part-range">{fmtRange(part.range)}</p>
					{/if}
				</header>

				{#if part.sections.length}
					<div class="sections">
						{#each part.sections as section (section.slug)}
							<section class="section">
								<a class="row row-section" href="/ccc/{part.slug}/{section.slug}">
									<span class="row-label">
										<span class="label-tag">
											{section.number ? `Section ${section.number}` : 'Section'}
										</span>
										<span class="label-title">{section.title}</span>
									</span>
									<span class="dotleader" aria-hidden="true"></span>
									{#if section.range}
										<span class="row-range">{fmtRange(section.range)}</span>
									{/if}
								</a>

								{#if section.chapters.length}
									<ul class="chapters" role="list">
										{#each section.chapters as chap (chap.slug)}
											<li class="chapter-block">
												<a
													class="row row-chapter"
													href="/ccc/{part.slug}/{section.slug}/{chap.slug}"
												>
													<span class="row-label">
														<span class="label-tag">Chapitre {chap.number}</span>
														<span class="label-title">{chap.title}</span>
													</span>
													<span class="dotleader" aria-hidden="true"></span>
													{#if chap.range}
														<span class="row-range">{fmtRange(chap.range)}</span>
													{/if}
												</a>
												{@const chapHref = `/ccc/${part.slug}/${section.slug}/${chap.slug}`}
												{#if chap.articles.length === 0 && chap.headings?.length}
													{@const tree = nestHeadings(chap.headings)}
													<ul class="headings headings-chapter" role="list">
														{#each tree as node (node.heading.id)}
															<li>
																<a class="row row-heading" href="{chapHref}#{node.heading.id}">
																	<span class="label-title">{node.heading.title}</span>
																	<span class="dotleader" aria-hidden="true"></span>
																	<span class="row-range">{node.heading.paragraph_start}</span>
																</a>
																{#if node.children.length > 0}
																	<ul class="sub-headings" role="list">
																		{#each node.children as sh (sh.id)}
																			<li>
																				<a class="row row-subheading" href="{chapHref}#{sh.id}">
																					<span class="label-title">{sh.title}</span>
																					<span class="dotleader" aria-hidden="true"></span>
																					<span class="row-range">{sh.paragraph_start}</span>
																				</a>
																			</li>
																		{/each}
																	</ul>
																{/if}
															</li>
														{/each}
													</ul>
												{/if}
												{#if chap.articles.length}
													<ul class="articles" role="list">
														{#each chap.articles as article (article.slug)}
															{@const articleHref = `/ccc/${part.slug}/${section.slug}/${chap.slug}/${article.slug}`}
															<li>
																<a class="row row-article" href={articleHref}>
																	<span class="row-label">
																		<span class="label-tag-sm">Article {article.number}</span>
																		<span class="label-title">{article.title}</span>
																	</span>
																	<span class="dotleader" aria-hidden="true"></span>
																	{#if article.range}
																		<span class="row-range">{fmtRange(article.range)}</span>
																	{/if}
																</a>
																{@const tree = nestHeadings(article.headings)}
																{#if tree.length > 0}
																	<ul class="headings" role="list">
																		{#each tree as node (node.heading.id)}
																			<li>
																				<a
																					class="row row-heading"
																					href="{articleHref}#{node.heading.id}"
																				>
																					<span class="label-title">{node.heading.title}</span>
																					<span class="dotleader" aria-hidden="true"></span>
																					<span class="row-range">{node.heading.paragraph_start}</span>
																				</a>
																				{#if node.children.length > 0}
																					<ul class="sub-headings" role="list">
																						{#each node.children as sh (sh.id)}
																							<li>
																								<a
																									class="row row-subheading"
																									href="{articleHref}#{sh.id}"
																								>
																									<span class="label-title">{sh.title}</span>
																									<span class="dotleader" aria-hidden="true"></span>
																									<span class="row-range">{sh.paragraph_start}</span>
																								</a>
																							</li>
																						{/each}
																					</ul>
																				{/if}
																			</li>
																		{/each}
																	</ul>
																{/if}
															</li>
														{/each}
													</ul>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}

								{#if section.articles_direct?.length}
									<ul class="articles articles-direct" role="list">
										{#each section.articles_direct as article (article.slug)}
											{@const articleHref = `/ccc/${part.slug}/${section.slug}/${article.slug}`}
											<li>
												<a class="row row-article" href={articleHref}>
													<span class="row-label">
														<span class="label-tag-sm">Article {article.number}</span>
														<span class="label-title">{article.title}</span>
													</span>
													<span class="dotleader" aria-hidden="true"></span>
													{#if article.range}
														<span class="row-range">{fmtRange(article.range)}</span>
													{/if}
												</a>
												{@const tree = nestHeadings(article.headings)}
												{#if tree.length > 0}
													<ul class="headings" role="list">
														{#each tree as node (node.heading.id)}
															<li>
																<a class="row row-heading" href="{articleHref}#{node.heading.id}">
																	<span class="label-title">{node.heading.title}</span>
																	<span class="dotleader" aria-hidden="true"></span>
																	<span class="row-range">{node.heading.paragraph_start}</span>
																</a>
																{#if node.children.length > 0}
																	<ul class="sub-headings" role="list">
																		{#each node.children as sh (sh.id)}
																			<li>
																				<a class="row row-subheading" href="{articleHref}#{sh.id}">
																					<span class="label-title">{sh.title}</span>
																					<span class="dotleader" aria-hidden="true"></span>
																					<span class="row-range">{sh.paragraph_start}</span>
																				</a>
																			</li>
																		{/each}
																	</ul>
																{/if}
															</li>
														{/each}
													</ul>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}
							</section>
						{/each}
					</div>
				{/if}
			</article>
		{/each}
	</div>

	<footer class="toc-foot" aria-hidden="true">
		<span class="fleuron">✠</span>
	</footer>
</main>

<style>
	/* Spacing rhythm — every vertical gap is a multiple of --rh. */
	.toc {
		--rh: 1.5rem;
		--rail: color-mix(in srgb, var(--color-accent) 35%, transparent);
		--rail-soft: color-mix(in srgb, var(--color-fg) 14%, transparent);
		--hover-tint: color-mix(in srgb, var(--color-accent) 6%, transparent);

		max-width: 920px;
		margin: 0 auto;
		padding: calc(var(--rh) * 2.5) clamp(1.25rem, 4vw, 2.5rem) calc(var(--rh) * 4);
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	/* ---- Title block ----------------------------------------------------- */
	.toc-head {
		text-align: center;
		margin-bottom: calc(var(--rh) * 4);
	}
	.eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 calc(var(--rh) * 0.75);
		padding-left: 0.32em;
	}
	.title {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: clamp(3rem, 7vw, 4.75rem);
		line-height: 1;
		letter-spacing: -0.01em;
		color: var(--color-heading, var(--color-fg));
		margin: 0;
	}
	.ornament {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.85rem;
		margin-top: calc(var(--rh) * 0.85);
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		color: var(--color-accent);
		line-height: 1;
		user-select: none;
	}
	.rule {
		display: block;
		width: 88px;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent),
			transparent
		);
	}
	.rule-l { background: linear-gradient(to right, transparent, color-mix(in srgb, var(--color-fg) 30%, transparent)); }
	.rule-r { background: linear-gradient(to left, transparent, color-mix(in srgb, var(--color-fg) 30%, transparent)); }

	.lede {
		max-width: 36ch;
		margin: calc(var(--rh) * 1.1) auto 0;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}

	/* ---- Parts ----------------------------------------------------------- */
	.parts {
		display: flex;
		flex-direction: column;
		gap: calc(var(--rh) * 4);
	}

	.part-head {
		margin-bottom: calc(var(--rh) * 1.25);
		padding-bottom: calc(var(--rh) * 0.5);
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
	}
	.numeral-inline {
		font-family: var(--font-heading);
		font-weight: 500;
		color: var(--color-accent);
		margin-right: 0.4em;
		letter-spacing: 0.02em;
	}
	.part-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 calc(var(--rh) * 0.35);
	}
	.part-range {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-subtle);
		font-variant-numeric: tabular-nums oldstyle-nums;
		margin: calc(var(--rh) * 0.3) 0 0;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.005em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.part-title a {
		color: inherit;
		text-decoration: none;
		background-image: linear-gradient(var(--color-accent), var(--color-accent));
		background-repeat: no-repeat;
		background-size: 0 1px;
		background-position: 0 100%;
		transition: background-size 220ms ease, color 160ms ease;
	}
	.part-title a:hover {
		color: var(--color-accent);
		background-size: 100% 1px;
	}

	/* Prologue: smaller, simpler — no eyebrow, smaller title, sits as a quiet
	   opener above the four parts. Negative margin compensates for the flex
	   gap on .parts so the prologue tucks closer to Partie I. */
	.part.is-prologue {
		margin-bottom: calc(var(--rh) * -2.5);
	}
	.part.is-prologue .part-head {
		margin-bottom: calc(var(--rh) * 0.25);
		padding-bottom: 0;
		border-bottom: none;
	}
	.part.is-prologue .part-title {
		font-size: 1.2rem;
		font-weight: 600;
	}

	/* ---- Sections (ribbon container) ------------------------------------ */
	.sections {
		display: flex;
		flex-direction: column;
		gap: calc(var(--rh) * 2.5);
	}
	.section {
		position: relative;
		padding-left: clamp(0.85rem, 2.4vw, 1.5rem);
		border-left: 1px solid var(--rail);
	}

	/* ---- Rows (shared) --------------------------------------------------- */
	.row {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		text-decoration: none;
		color: var(--color-fg);
		padding: 0.35rem 0.5rem 0.35rem 0;
		margin-left: -0.5rem;
		padding-left: 0.5rem;
		border-radius: 2px;
		line-height: 1.55;
		transition: background-color 140ms ease, color 140ms ease;
	}
	.row:hover {
		background-color: var(--hover-tint);
		color: var(--color-fg);
	}
	.row:hover .label-tag,
	.row:hover .label-tag-sm {
		color: var(--color-accent);
	}

	.row-label {
		display: inline;
		min-width: 0;
	}
	.label-tag {
		font-family: var(--font-ui);
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		transition: color 140ms ease;
	}
	.label-tag-sm {
		font-family: var(--font-ui);
		font-weight: 500;
		font-size: 0.85em;
		letter-spacing: 0.03em;
		color: var(--color-subtle);
		transition: color 140ms ease;
	}
	.label-title {
		margin-left: 0.4em;
	}

	.dotleader {
		flex: 1 1 auto;
		min-width: 1.5rem;
		align-self: end;
		height: 1px;
		margin-bottom: 0.5em;
		background-image: radial-gradient(
			circle,
			color-mix(in srgb, var(--color-fg) 28%, transparent) 0.5px,
			transparent 1px
		);
		background-size: 6px 2px;
		background-repeat: repeat-x;
		background-position: 0 50%;
		opacity: 0.7;
	}

	.row-range {
		flex: 0 0 auto;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums oldstyle-nums;
		letter-spacing: 0.04em;
		color: var(--color-subtle);
		white-space: nowrap;
	}

	/* ---- Section row ---------------------------------------------------- */
	.row-section {
		font-family: var(--font-heading);
		font-size: 1.2rem;
		font-weight: 700;
		line-height: 1.45;
		color: var(--color-heading, var(--color-fg));
		padding-top: 0.15rem;
		padding-bottom: 0.5rem;
	}
	.row-section .label-tag {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin-right: 0.55em;
		vertical-align: 0.12em;
	}
	.row-section .label-title {
		margin-left: 0;
	}
	.row-section .row-range {
		font-size: 0.78rem;
		color: var(--color-muted);
	}

	/* ---- Chapter row ---------------------------------------------------- */
	.chapters {
		list-style: none;
		padding: 0;
		margin: 0;
		padding-left: 2.5rem;
		display: flex;
		flex-direction: column;
		gap: calc(var(--rh) * 0.85);
	}
	.chapter-block {
		display: flex;
		flex-direction: column;
		gap: calc(var(--rh) * 0.15);
	}
	.row-chapter {
		font-family: var(--font-ui);
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-fg);
	}
	.row-chapter .label-tag {
		font-weight: 600;
		color: var(--color-accent-text, var(--color-accent));
		opacity: 0.85;
	}

	/* ---- Article row ---------------------------------------------------- */
	.articles {
		list-style: none;
		padding: 0;
		margin: 0;
		padding-left: 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}
	.articles-direct {
		padding-left: 0;
		margin-top: 0.25rem;
	}
	.row-article {
		font-family: var(--font-body);
		font-size: 0.93rem;
		font-weight: 400;
		color: var(--color-muted);
		line-height: 1.5;
		padding-top: 0.18rem;
		padding-bottom: 0.18rem;
	}
	.row-article .label-title {
		font-style: normal;
	}

	/* ---- Heading rows (Roman + sub-heading) ----------------------------- */
	.headings {
		list-style: none;
		padding: 0;
		margin: 0.15rem 0 0.4rem 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.headings-chapter {
		margin-left: 2.5rem;
	}
	.sub-headings {
		list-style: none;
		padding: 0;
		margin: 0 0 0 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.row-heading {
		font-family: var(--font-ui);
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--color-fg);
		line-height: 1.45;
		padding-top: 0.1rem;
		padding-bottom: 0.1rem;
	}
	.row-subheading {
		font-family: var(--font-body);
		font-size: 0.82rem;
		font-weight: 400;
		font-style: italic;
		color: var(--color-subtle);
		line-height: 1.45;
		padding-top: 0.05rem;
		padding-bottom: 0.05rem;
	}
	.row-heading .row-range,
	.row-subheading .row-range {
		font-size: 0.7rem;
	}

	/* ---- Footer fleuron ------------------------------------------------- */
	.toc-foot {
		text-align: center;
		margin-top: calc(var(--rh) * 4);
		opacity: 0.6;
	}
	.toc-foot .fleuron {
		font-size: 1rem;
	}

	/* ---- Focus ---------------------------------------------------------- */
	.row:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	/* ---- Small viewports ------------------------------------------------ */
	@media (max-width: 640px) {
		.toc {
			padding-top: calc(var(--rh) * 1.5);
			padding-bottom: calc(var(--rh) * 2);
		}
		.toc-head { margin-bottom: calc(var(--rh) * 2.5); }
		.parts { gap: calc(var(--rh) * 2.5); }

		.row { gap: 0.4rem; }
		/* On narrow screens dot leaders get cramped — collapse, push range
		   onto the next line instead. */
		.dotleader { display: none; }
		.row {
			flex-wrap: wrap;
		}
		.row-range {
			width: 100%;
			padding-left: 0;
			font-size: 0.72rem;
		}
		.row-section { font-size: 1.05rem; }
		.row-section .label-tag { display: block; margin-bottom: 0.2rem; }
		.row-section .label-title { display: block; }
	}

	/* ---- Reduced motion ------------------------------------------------- */
	@media (prefers-reduced-motion: reduce) {
		.row,
		.part-title a {
			transition: none;
		}
	}
</style>
