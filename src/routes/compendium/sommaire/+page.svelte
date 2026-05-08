<script lang="ts">
	import type { PageData } from './$types';
	import type { CompendiumPart, CompendiumFlowNode } from '$lib/data/types';

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
		return r[0] === r[1] ? `Q. ${r[0]}` : `Q. ${r[0]}–${r[1]}`;
	}
</script>

<svelte:head>
	<title>Sommaire · Compendium du Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="Table des matières complète du Compendium du Catéchisme de l'Église catholique : quatre parties, sections, chapitres, sous-sections — 598 questions et réponses."
	/>
</svelte:head>

<main class="toc">
	<header class="toc-head">
		<p class="eyebrow">Table des matières</p>
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

	<ol class="parts">
		{#each data.parts as part, i (part.slug)}
			{@const partNum = data.structure.parts[i]?.number}
			{@const headings = nestHeadings(part)}
			<li class="part">
				<a class="part-link" href={`/compendium/${part.slug}`}>
					{#if partNum}
						<span class="part-kicker">Partie {partNum}</span>
					{/if}
					<span class="part-title">{part.title}</span>
				</a>
				{#if headings.length > 0}
					<ol class="sections">
						{#each headings as h2 (h2.id)}
							<li class="section">
								<a class="section-link" href={`/compendium/${part.slug}#${h2.id}`}>
									<span class="section-title">{h2.title}</span>
									{#if h2.qRange}<span class="range">{fmtRange(h2.qRange)}</span>{/if}
								</a>
								{#if h2.children.length > 0}
									<ol class="subsections">
										{#each h2.children as h3 (h3.id)}
											<li class="subsection">
												<a class="subsection-link" href={`/compendium/${part.slug}#${h3.id}`}>
													{#if h3.kicker}<span class="sub-kicker">{h3.kicker}</span>{/if}
													<span class="subsection-title">{h3.title}</span>
													{#if h3.qRange}<span class="range">{fmtRange(h3.qRange)}</span>{/if}
												</a>
												{#if h3.children.length > 0}
													<ol class="subsubsections">
														{#each h3.children as h4 (h4.id)}
															<li class="subsubsection">
																<a
																	class="subsubsection-link"
																	href={`/compendium/${part.slug}#${h4.id}`}
																>
																	<span class="subsubsection-title">{h4.title}</span>
																	{#if h4.qRange}<span class="range range-small"
																			>{fmtRange(h4.qRange)}</span
																		>{/if}
																</a>
															</li>
														{/each}
													</ol>
												{/if}
											</li>
										{/each}
									</ol>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</li>
		{/each}
	</ol>

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

	.parts {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.part {
		margin-bottom: 2.25rem;
	}
	.part-link {
		display: block;
		text-decoration: none;
		color: inherit;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0.75rem;
	}
	.part-link:hover .part-title {
		color: var(--color-accent);
	}
	.part-kicker {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin-bottom: 0.25rem;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-fg);
		transition: color 150ms ease;
	}

	.sections {
		list-style: none;
		margin: 0;
		padding: 0 0 0 0.5rem;
	}
	.section {
		margin-bottom: 0.75rem;
	}
	.section-link {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		font-family: var(--font-ui);
		text-decoration: none;
		color: inherit;
		padding: 0.15rem 0;
	}
	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg);
		transition: color 150ms ease;
	}
	.section-link:hover .section-title {
		color: var(--color-accent);
	}

	.subsections {
		list-style: none;
		margin: 0.35rem 0 0;
		padding: 0 0 0 1.25rem;
		border-left: 1px solid color-mix(in srgb, var(--color-fg) 10%, transparent);
	}
	.subsection {
		margin-bottom: 0.4rem;
	}
	.subsection-link {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
		padding: 0.15rem 0;
	}
	.sub-kicker {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
	}
	.subsection-title {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		font-weight: 500;
		color: var(--color-fg);
		transition: color 150ms ease;
	}
	.subsection-link:hover .subsection-title {
		color: var(--color-accent);
	}

	.subsubsections {
		list-style: none;
		margin: 0.3rem 0 0.5rem;
		padding: 0 0 0 1.25rem;
		border-left: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	.subsubsection {
		margin-bottom: 0.15rem;
	}
	.subsubsection-link {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 400;
		color: var(--color-subtle);
		text-decoration: none;
		font-style: italic;
		padding: 0.1rem 0;
	}
	.subsubsection-link:hover {
		color: var(--color-accent);
	}

	.range {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		font-style: normal;
		color: var(--color-muted);
		letter-spacing: 0.04em;
		white-space: nowrap;
	}
	.range-small {
		font-size: 0.68rem;
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
