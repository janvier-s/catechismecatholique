<script lang="ts">
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const totalLessons = $derived(data.structure.tomes.reduce((t, tm) => t + tm.lessons.length, 0));

	// Map slug → mini_toc for O(1) lookup while rendering lessons.
	const miniTocBySlug = $derived(
		new Map(data.sommaire.tomes.flatMap((t) => t.lessons.map((l) => [l.slug, l.mini_toc] as const)))
	);
</script>

<svelte:head>
	<title>Sommaire · Catéchisme Boulanger</title>
	<meta
		name="description"
		content="Table des matières de La Doctrine catholique de l'Abbé Boulenger : trois tomes et 53 leçons."
	/>
</svelte:head>

<main class="toc">
	<header class="toc-head">
		<p class="eyebrow">Abbé A. Boulenger · 1927</p>
		<h1 class="title">La Doctrine catholique</h1>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>
		<p class="lede">
			{data.structure.tomes.length} tomes · {totalLessons} leçons
		</p>
		<div class="toc-actions">
			<a class="index-link" href="/boulanger">← Retour à l'accueil</a>
		</div>
	</header>

	<div class="parts">
		{#each data.structure.tomes as tome (tome.n)}
			{@const firstSlug = tome.lessons[0]?.slug}
			<article class="part" id="tome-{tome.n}">
				<header class="part-head">
					<p class="part-kicker">Tome {tome.n}</p>
					{#if firstSlug}
						<h2 class="part-title">
							<a class="part-title-link" href="/boulanger/{firstSlug}">{tome.title}</a>
						</h2>
					{:else}
						<h2 class="part-title">{tome.title}</h2>
					{/if}
				</header>
				<div class="chapters">
					{#each tome.lessons as lesson (lesson.slug)}
						{@const miniToc = miniTocBySlug.get(lesson.slug) ?? []}
						<article class="lesson">
							<a class="row" href="/boulanger/{lesson.slug}">
								<span class="row-label">
									<span class="row-num">{lesson.n}.</span>
									<span class="label-title">{lesson.title}</span>
								</span>
								<span class="dotleader" aria-hidden="true"></span>
							</a>
							{#if miniToc.length > 0}
								<ol class="lesson-parts">
									{#each miniToc as item (item.anchor)}
										<li class="lesson-part">
											<a class="part-row" href="/boulanger/{lesson.slug}#{item.anchor}">
												<span class="part-roman">{item.roman}.</span>
												<span class="part-label">{frenchPunct(item.label)}</span>
											</a>
											{#if item.children.length > 0}
												<ol class="part-subs">
													{#each item.children as child (child.anchor)}
														<li>
															<a class="sub-row" href="/boulanger/{lesson.slug}#{child.anchor}">
																<span class="sub-num">{child.n}°</span>
																<span class="sub-label">{frenchPunct(child.label)}</span>
															</a>
														</li>
													{/each}
												</ol>
											{/if}
										</li>
									{/each}
								</ol>
							{/if}
						</article>
					{/each}
				</div>
			</article>
		{/each}
	</div>

	<footer class="toc-foot" aria-hidden="true">
		<span class="fleuron">✠</span>
	</footer>
</main>

<style>
	.toc {
		--rh: 1.5rem;
		--hover-tint: color-mix(in srgb, var(--color-accent) 6%, transparent);
		max-width: 920px;
		margin: 0 auto;
		padding: calc(var(--rh) * 2.5) clamp(1.25rem, 4vw, 2.5rem) calc(var(--rh) * 4);
		color: var(--color-fg);
		font-family: var(--font-body);
	}

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
	}
	.title {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: clamp(2.6rem, 7vw, 4.75rem);
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
	}
	.rule-l {
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent)
		);
	}
	.rule-r {
		background: linear-gradient(
			to left,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent)
		);
	}
	.lede {
		max-width: 36ch;
		margin: calc(var(--rh) * 1.1) auto 0;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}
	.toc-actions {
		margin-top: calc(var(--rh) * 1.25);
	}
	.index-link {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
	}
	.index-link:hover {
		text-decoration: underline;
	}

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
	.part-kicker {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.35rem;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		font-weight: 700;
		line-height: 1.2;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.part-title-link {
		color: inherit;
		text-decoration: none;
		transition: color 140ms ease;
	}
	.part-title-link:hover {
		color: var(--color-accent);
	}
	.part {
		scroll-margin-top: 5rem;
	}
	.chapters {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding-left: clamp(0.85rem, 2.4vw, 1.5rem);
	}
	.lesson {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.lesson-parts {
		list-style: none;
		margin: 0.2rem 0 0;
		padding: 0;
	}
	.lesson-part {
		margin: 0;
	}
	.part-row {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		padding: 0.18rem 0.5rem 0.18rem 1.75rem;
		text-decoration: none;
		color: var(--color-subtle);
		border-radius: 2px;
		border-left: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
		margin-left: 0.45rem;
		transition:
			background-color 120ms ease,
			color 120ms ease,
			border-color 120ms ease;
	}
	.part-row:hover {
		background-color: var(--hover-tint);
		color: var(--color-accent);
		border-left-color: var(--color-accent);
	}
	.part-roman {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-accent);
		min-width: 1.6rem;
	}
	.part-label {
		font-family: var(--font-body);
		font-size: 0.88rem;
		line-height: 1.4;
	}
	.part-subs {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.sub-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.1rem 0.5rem 0.1rem 3.25rem;
		text-decoration: none;
		color: var(--color-muted);
		border-radius: 2px;
		transition:
			background-color 120ms ease,
			color 120ms ease;
	}
	.sub-row:hover {
		background-color: var(--hover-tint);
		color: var(--color-accent);
	}
	.sub-num {
		font-family: var(--font-ui);
		font-size: 0.64rem;
		font-weight: 700;
		color: var(--color-accent);
		min-width: 1.2rem;
	}
	.sub-label {
		font-family: var(--font-body);
		font-size: 0.82rem;
		line-height: 1.4;
	}
	.row {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		text-decoration: none;
		color: var(--color-fg);
		padding: 0.3rem 0.5rem 0.3rem 0;
		margin-left: -0.5rem;
		padding-left: 0.5rem;
		border-radius: 2px;
		transition:
			background-color 140ms ease,
			color 140ms ease;
	}
	.row:hover {
		background-color: var(--hover-tint);
	}
	.row:hover .label-title {
		color: var(--color-accent);
	}
	.row-label {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.row-num {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-muted);
		min-width: 1.4rem;
		text-align: right;
	}
	.label-title {
		font-family: var(--font-ui);
		font-size: 1rem;
		font-weight: 500;
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

	.toc-foot {
		text-align: center;
		margin-top: calc(var(--rh) * 4);
		opacity: 0.6;
	}
	.toc-foot .fleuron {
		font-size: 1rem;
	}
</style>
