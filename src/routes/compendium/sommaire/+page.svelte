<script lang="ts">
	import type { PageData } from './$types';
	import type { CompendiumPart, CompendiumFlowNode } from '$lib/data/types';
	import { frenchPunct } from '$lib/utils/typography';

	let { data }: { data: PageData } = $props();

	type Node = {
		id: string;
		title: string;
		level: 2 | 3 | 4;
		kicker?: string;
		qRange?: [number, number];
		children: Node[];
	};

	function nestHeadings(part: CompendiumPart): Node[] {
		const out: Node[] = [];
		let h2: Node | null = null;
		let h3: Node | null = null;
		for (const node of part.flow as CompendiumFlowNode[]) {
			if (node.kind !== 'heading') continue;
			const n: Node = {
				id: node.id,
				title: node.title,
				level: node.level,
				kicker: node.kicker,
				qRange: node.q_range,
				children: []
			};
			if (node.level === 2) {
				out.push(n);
				h2 = n;
				h3 = null;
			} else if (node.level === 3) {
				if (h2) h2.children.push(n);
				else out.push(n);
				h3 = n;
			} else {
				if (h3) h3.children.push(n);
				else if (h2) h2.children.push(n);
				else out.push(n);
			}
		}
		return out;
	}

	function fmtRange(r?: [number, number]): string {
		if (!r) return '';
		return r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`;
	}
</script>

<svelte:head>
	<title>Sommaire · Compendium du Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="Table des matières complète du Compendium du Catéchisme de l'Église catholique : quatre parties, sections, chapitres · 598 questions et réponses."
	/>
</svelte:head>

<main class="toc">
	<header class="toc-head">
		<p class="eyebrow">Compendium du Catéchisme</p>
		<h1 class="title">Sommaire</h1>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>
		<p class="lede">
			Quatre parties, 598 questions et réponses.<br />
			La foi professée, célébrée, vécue, et priée.
		</p>
	</header>

	<ul class="parts" role="list">
		{#each data.parts as part, i (part.slug)}
			{@const partNum = data.structure.parts[i]?.number}
			{@const headings = nestHeadings(part)}
			<li class="part-block">
				<a class="row row-part" href={`/compendium/${part.slug}`}>
					<span class="row-label">
						{#if partNum}<span class="label-tag">Partie {partNum}</span>{/if}
						<span class="label-title">{frenchPunct(part.title)}</span>
					</span>
				</a>
				{#if headings.length > 0}
					<ul class="sections" role="list">
						{#each headings as h2 (h2.id)}
							<li class="section-block">
								<a class="row row-section" href={`/compendium/${part.slug}#${h2.id}`}>
									<span class="row-label">
										<span class="label-title">{frenchPunct(h2.title)}</span>
									</span>
									<span class="dotleader" aria-hidden="true"></span>
									{#if h2.qRange}<span class="row-range">{fmtRange(h2.qRange)}</span>{/if}
								</a>
								{#if h2.children.length > 0}
									<ul class="chapters" role="list">
										{#each h2.children as h3 (h3.id)}
											<li class="chapter-block">
												<a class="row row-chapter" href={`/compendium/${part.slug}#${h3.id}`}>
													<span class="row-label">
														{#if h3.kicker}<span class="label-tag">{h3.kicker}</span>{/if}
														<span class="label-title">{frenchPunct(h3.title)}</span>
													</span>
													<span class="dotleader" aria-hidden="true"></span>
													{#if h3.qRange}<span class="row-range">{fmtRange(h3.qRange)}</span>{/if}
												</a>
												{#if h3.children.length > 0}
													<ul class="headings" role="list">
														{#each h3.children as h4 (h4.id)}
															<li>
																<a
																	class="row row-heading"
																	href={`/compendium/${part.slug}#${h4.id}`}
																>
																	<span class="row-label">
																		<span class="label-title">{frenchPunct(h4.title)}</span>
																	</span>
																	<span class="dotleader" aria-hidden="true"></span>
																	{#if h4.qRange}
																		<span class="row-range">{fmtRange(h4.qRange)}</span>
																	{/if}
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

	<nav class="toc-back" aria-label="Retour">
		<a href="/compendium" class="back-link">← Compendium</a>
	</nav>
</main>

<style>
	.toc {
		max-width: 50rem;
		margin: 0 auto;
		padding: 2.75rem 1.5rem 3.5rem;
	}
	.toc-head {
		text-align: center;
		max-width: 38rem;
		margin: 0 auto 3rem;
	}
	.eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.6rem;
	}
	.title {
		font-family: var(--font-heading);
		font-size: clamp(2rem, 4.5vw, 2.6rem);
		font-weight: 600;
		line-height: 1.1;
		color: var(--color-fg);
		margin: 0 0 1rem;
	}
	.ornament {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		margin: 0 auto 1rem;
		max-width: 16rem;
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 0.85rem;
		color: var(--color-accent);
		line-height: 1;
		user-select: none;
	}
	.rule {
		flex: 1 1 auto;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 22%, transparent)
		);
	}
	.rule-l {
		background: linear-gradient(
			to left,
			transparent,
			color-mix(in srgb, var(--color-fg) 22%, transparent)
		);
	}
	.lede {
		font-family: var(--font-body);
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--color-subtle);
		margin: 0;
	}

	/* Lists */
	.parts,
	.sections,
	.chapters,
	.headings {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.part-block {
		margin-bottom: 2.25rem;
	}
	.section-block {
		margin-bottom: 0.85rem;
	}
	.chapter-block {
		margin-bottom: 0.5rem;
	}
	.sections {
		padding-left: 0.5rem;
	}
	.chapters {
		padding-left: 1.25rem;
	}
	.headings {
		padding-left: 1.25rem;
	}

	/* Row scaffolding · same shape as /cec/sommaire: title, dotleader, range. */
	.row {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		text-decoration: none;
		color: inherit;
		padding: 0.2rem 0;
		transition: color 150ms ease;
	}
	.row-label {
		flex: 0 1 auto;
		min-width: 0;
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}
	.label-tag {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.label-title {
		font-family: var(--font-body);
		color: var(--color-fg);
	}
	.row:hover .label-title {
		color: var(--color-accent);
	}
	.row-range {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		color: var(--color-muted);
		font-feature-settings: 'tnum';
		letter-spacing: 0.02em;
		min-width: 3rem;
		text-align: right;
	}

	/* Per-level type sizing */
	.row-part {
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0.75rem;
	}
	.row-part .label-tag {
		font-size: 0.68rem;
	}
	.row-part .label-title {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.2;
	}
	.row-section .label-title {
		font-family: var(--font-ui);
		font-size: 1rem;
		font-weight: 600;
	}
	.row-chapter .label-title {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		font-weight: 500;
	}
	.row-heading .label-title {
		font-family: var(--font-ui);
		font-size: 0.88rem;
		font-weight: 400;
		font-style: italic;
		color: var(--color-subtle);
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

	@media (max-width: 600px) {
		.dotleader {
			display: none;
		}
		.row {
			flex-wrap: wrap;
		}
		.row-range {
			order: -1;
			min-width: 3rem;
			text-align: left;
		}
	}

	.toc-back {
		text-align: center;
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}
	.back-link {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}
	.back-link:hover {
		color: var(--color-accent);
	}
</style>
