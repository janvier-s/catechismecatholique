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

	// Render a paragraph range without the § symbol — just the bare numbers,
	// e.g. "26 – 49" or "27" for a single paragraph.
	function fmtRange(r: Range | undefined): string {
		if (!r) return '';
		return r.from === r.to ? `${r.from}` : `${r.from} – ${r.to}`;
	}
</script>

<div class="panorama">
	{#each parts as part (part.slug)}
		<article class="pano-part" class:is-prologue={part.prologue}>
			<header class="pano-banner">
				{#if !part.prologue}
					<p class="pano-banner-eyebrow">Partie {ROMAN[part.number ?? 0] ?? part.number ?? ''}</p>
				{/if}
				{#if headingLevel === 2}
					<h2 class="pano-banner-title">
						<a href="/ccc/{part.slug}">{part.title}</a>
					</h2>
				{:else}
					<h3 class="pano-banner-title">
						<a href="/ccc/{part.slug}">{part.title}</a>
					</h3>
				{/if}
				{#if part.range}
					<p class="pano-banner-range">{fmtRange(part.range)}</p>
				{/if}
			</header>

			{#each part.sections as section (section.slug)}
				<section class="pano-section">
					<a class="pano-section-head" href="/ccc/{part.slug}/{section.slug}">
						{#if section.number}
							<span class="pano-section-num">Section {section.number}</span>
						{/if}
						<h3 class="pano-section-title">{section.title}</h3>
						{#if section.range}
							<span class="pano-section-range">{fmtRange(section.range)}</span>
						{/if}
					</a>

					{#if section.chapters.length > 0}
						<div class="pano-grid" data-cols={Math.min(section.chapters.length, 3)}>
							{#each section.chapters as chapter (chapter.slug)}
								{@const href = `/ccc/${part.slug}/${section.slug}/${chapter.slug}`}
								<div class="pano-cell">
									<a class="pano-cell-head" {href}>
										{#if chapter.number !== undefined}
											<span class="pano-cell-tag">Chapitre {chapter.number}</span>
										{/if}
										<h4 class="pano-cell-title">{chapter.title}</h4>
									</a>
									{#if chapter.articles.length > 0}
										<ul class="pano-cell-list">
											{#each chapter.articles as article (article.slug)}
												<li>
													<a href="{href}/{article.slug}">
														<span class="pano-cell-art">{article.title}</span>
														{#if article.number !== undefined}
															<span class="pano-cell-art-num">Article {article.number}</span>
														{/if}
													</a>
												</li>
											{/each}
										</ul>
									{/if}
									{#if chapter.range}
										<p class="pano-cell-range">{fmtRange(chapter.range)}</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					{#if section.articles_direct && section.articles_direct.length > 0}
						<div class="pano-grid" data-cols={Math.min(section.articles_direct.length, 4)}>
							{#each section.articles_direct as article (article.slug)}
								{@const href = `/ccc/${part.slug}/${section.slug}/${article.slug}`}
								<div class="pano-cell">
									<a class="pano-cell-head" {href}>
										{#if article.number !== undefined}
											<span class="pano-cell-tag">Article {article.number}</span>
										{/if}
										<h4 class="pano-cell-title">{article.title}</h4>
									</a>
									{#if article.range}
										<p class="pano-cell-range">{fmtRange(article.range)}</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</article>
	{/each}
</div>

<style>
	.panorama {
		display: flex;
		flex-direction: column;
		gap: 3.5rem;
		font-family: var(--font-ui);
		color: var(--color-fg);
	}

	/* Part banner ------------------------------------------------------ */
	.pano-banner {
		text-align: center;
		padding: 1.5rem 1rem 1.4rem;
		border-top: 2px solid var(--color-accent);
		border-bottom: 2px solid var(--color-accent);
		margin-bottom: 1.5rem;
	}
	.pano-banner-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.5rem;
	}
	.pano-banner-title {
		font-family: var(--font-heading);
		font-size: clamp(1.65rem, 3vw, 2.25rem);
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.005em;
		color: var(--color-heading, var(--color-fg));
		margin: 0;
	}
	.pano-banner-title a {
		color: inherit;
		text-decoration: none;
	}
	.pano-banner-title a:hover {
		color: var(--color-accent);
	}
	.pano-banner-range {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.18em;
		color: var(--color-subtle);
		margin: 0.85rem 0 0;
	}
	.pano-part.is-prologue .pano-banner-title {
		font-size: 1.4rem;
		font-weight: 600;
	}

	/* Section ---------------------------------------------------------- */
	.pano-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin-bottom: 2rem;
	}
	.pano-section:last-child {
		margin-bottom: 0;
	}
	.pano-section-head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		text-align: center;
		text-decoration: none;
		color: inherit;
		padding: 0.5rem 0;
	}
	.pano-section-num {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.pano-section-title {
		font-family: var(--font-heading);
		font-size: clamp(1.2rem, 2.2vw, 1.55rem);
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-fg);
		margin: 0;
	}
	.pano-section-head:hover .pano-section-title {
		color: var(--color-accent);
	}
	.pano-section-range {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.14em;
		color: var(--color-subtle);
	}

	/* Cell grid -------------------------------------------------------- */
	.pano-grid {
		display: grid;
		gap: 1rem;
	}
	.pano-grid[data-cols='1'] {
		grid-template-columns: minmax(0, 32rem);
		justify-content: center;
	}
	.pano-grid[data-cols='2'] {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.pano-grid[data-cols='3'],
	.pano-grid[data-cols='4'] {
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}

	.pano-cell {
		display: flex;
		flex-direction: column;
		padding: 1rem 1.1rem 0.95rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-border) 12%, transparent);
		text-align: center;
	}
	.pano-cell:hover {
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.pano-cell-head {
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding-bottom: 0.7rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
		min-height: 4.5rem;
	}
	.pano-cell-head:hover .pano-cell-title {
		color: var(--color-accent);
	}
	.pano-cell-tag {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.pano-cell-title {
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-fg);
		margin: 0;
		transition: color 150ms ease;
	}
	.pano-cell-list {
		list-style: none;
		margin: 0.85rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.pano-cell-list a {
		display: block;
		text-decoration: none;
		color: inherit;
	}
	.pano-cell-list a:hover .pano-cell-art {
		color: var(--color-accent);
	}
	.pano-cell-art {
		display: block;
		font-family: var(--font-heading);
		font-size: 0.92rem;
		line-height: 1.35;
		color: var(--color-fg);
		font-style: italic;
		font-weight: 500;
	}
	.pano-cell-art-num {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-subtle);
		margin-top: 0.15rem;
	}
	.pano-cell-range {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.14em;
		color: var(--color-subtle);
		margin: 0.85rem 0 0;
		padding-top: 0.55rem;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}

	@media (max-width: 640px) {
		.pano-grid[data-cols='2'],
		.pano-grid[data-cols='3'],
		.pano-grid[data-cols='4'] {
			grid-template-columns: 1fr;
		}
		.pano-banner {
			padding: 1.1rem 0.5rem 1rem;
		}
		.pano-cell-head {
			min-height: 0;
		}
	}
</style>
