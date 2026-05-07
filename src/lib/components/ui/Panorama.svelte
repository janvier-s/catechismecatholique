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

	function fmtRange(r: Range | undefined): string {
		if (!r) return '';
		return r.from === r.to ? `§${r.from}` : `§§ ${r.from}–${r.to}`;
	}
</script>

<div class="panorama">
	{#each parts as part (part.slug)}
		<article class="pano-part" class:is-prologue={part.prologue}>
			<header class="pano-part-head">
				{#if !part.prologue}
					<p class="pano-eyebrow">
						Partie {ROMAN[part.number ?? 0] ?? part.number ?? ''}
					</p>
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
				{#if part.range}
					<p class="pano-part-range">{fmtRange(part.range)}</p>
				{/if}
			</header>

			{#each part.sections as section (section.slug)}
				<section class="pano-section">
					<div class="pano-section-head">
						<a class="pano-section-title" href="/ccc/{part.slug}/{section.slug}">
							{#if section.number}<span class="pano-tag">Section {section.number}</span>{/if}
							<span>{section.title}</span>
						</a>
						{#if section.range}
							<span class="pano-range">{fmtRange(section.range)}</span>
						{/if}
					</div>

					{#if section.chapters.length > 0}
						<div class="pano-grid">
							{#each section.chapters as chapter (chapter.slug)}
								{@const href = `/ccc/${part.slug}/${section.slug}/${chapter.slug}`}
								<div class="pano-card">
									<a class="pano-card-head" {href}>
										{#if chapter.number !== undefined}
											<span class="pano-tag">Chapitre {chapter.number}</span>
										{/if}
										<span class="pano-card-title">{chapter.title}</span>
									</a>
									{#if chapter.range}
										<p class="pano-card-range">{fmtRange(chapter.range)}</p>
									{/if}
									{#if chapter.articles.length > 0}
										<ul class="pano-card-list">
											{#each chapter.articles as article (article.slug)}
												<li>
													<a href="{href}/{article.slug}">
														{#if article.number !== undefined}
															<span class="pano-art-num">Art.&nbsp;{article.number}</span>
														{/if}
														<span>{article.title}</span>
													</a>
												</li>
											{/each}
										</ul>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					{#if section.articles_direct && section.articles_direct.length > 0}
						<div class="pano-grid">
							{#each section.articles_direct as article (article.slug)}
								{@const href = `/ccc/${part.slug}/${section.slug}/${article.slug}`}
								<div class="pano-card">
									<a class="pano-card-head" {href}>
										{#if article.number !== undefined}
											<span class="pano-tag">Article {article.number}</span>
										{/if}
										<span class="pano-card-title">{article.title}</span>
									</a>
									{#if article.range}
										<p class="pano-card-range">{fmtRange(article.range)}</p>
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
		gap: 2.5rem;
		font-family: var(--font-ui);
	}

	/* Part block ------------------------------------------------------- */
	.pano-part {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.pano-part-head {
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.85rem;
	}
	.pano-eyebrow {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.4rem;
	}
	.pano-part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.45rem, 2.4vw, 1.85rem);
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-fg);
		margin: 0;
	}
	.pano-part-title a {
		color: inherit;
		text-decoration: none;
	}
	.pano-part-title a:hover {
		color: var(--color-accent);
	}
	.pano-part-range {
		font-size: 0.78rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.04em;
		color: var(--color-subtle);
		margin: 0.4rem 0 0;
	}
	.pano-part.is-prologue .pano-part-title {
		font-size: 1.2rem;
		font-weight: 600;
	}

	/* Section block ---------------------------------------------------- */
	.pano-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.pano-section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.85rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px dashed color-mix(in srgb, var(--color-border) 70%, transparent);
	}
	.pano-section-title {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.55rem;
		font-family: var(--font-heading);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-fg);
		text-decoration: none;
		line-height: 1.35;
	}
	.pano-section-title:hover {
		color: var(--color-accent);
	}
	.pano-range {
		flex: 0 0 auto;
		font-size: 0.72rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-subtle);
		white-space: nowrap;
	}

	/* Card grid -------------------------------------------------------- */
	.pano-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.85rem;
	}
	.pano-card {
		display: flex;
		flex-direction: column;
		padding: 0.85rem 0.95rem 0.95rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-border) 12%, transparent);
		transition: border-color 150ms ease;
	}
	.pano-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
	}
	.pano-card-head {
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.pano-card-head:hover .pano-card-title {
		color: var(--color-accent);
	}
	.pano-tag {
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.pano-card-title {
		font-family: var(--font-heading);
		font-size: 0.98rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-fg);
		transition: color 150ms ease;
	}
	.pano-card-range {
		font-size: 0.7rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-subtle);
		margin: 0.45rem 0 0;
	}
	.pano-card-list {
		list-style: none;
		margin: 0.7rem 0 0;
		padding: 0.55rem 0 0;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.pano-card-list a {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		font-family: var(--font-body);
		font-size: 0.82rem;
		line-height: 1.45;
		color: var(--color-muted);
		text-decoration: none;
	}
	.pano-card-list a:hover {
		color: var(--color-accent);
	}
	.pano-art-num {
		flex: 0 0 auto;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-subtle);
		min-width: 2.6rem;
	}

	@media (max-width: 640px) {
		.pano-grid {
			grid-template-columns: 1fr;
		}
		.pano-section-head {
			flex-wrap: wrap;
		}
	}
</style>
