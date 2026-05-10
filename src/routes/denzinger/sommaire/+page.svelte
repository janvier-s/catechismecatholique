<script lang="ts">
	import type { PageData } from './$types';
	import type { DenzingerStructureUnit } from '$lib/data/types';

	let { data }: { data: PageData } = $props();

	type TreeNode = {
		title: string;
		// Direct children. The deepest leaves carry a `unit` reference (and
		// their breadcrumb's last segment matches `title`).
		children: TreeNode[];
		unit?: DenzingerStructureUnit;
	};

	function buildTree(units: DenzingerStructureUnit[]): TreeNode[] {
		const roots: TreeNode[] = [];
		for (const u of units) {
			let cur: TreeNode[] = roots;
			for (let i = 0; i < u.breadcrumb.length; i++) {
				const seg = u.breadcrumb[i] ?? '';
				let node: TreeNode | undefined = cur.find((c) => c.title === seg);
				if (!node) {
					node = { title: seg, children: [] };
					cur.push(node);
				}
				if (i === u.breadcrumb.length - 1) {
					node.unit = u;
				}
				cur = node.children;
			}
		}
		return roots;
	}
</script>

<svelte:head>
	<title>Sommaire · Denzinger</title>
	<meta
		name="description"
		content="Sommaire complet du Denzinger — hiérarchie des parties, sections et pontificats avec liens vers chaque section de lecture."
	/>
</svelte:head>

<main class="toc">
	<header class="toc-head">
		<p class="eyebrow">Denzinger — Enchiridion Symbolorum</p>
		<h1 class="title">Sommaire</h1>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>
		<p class="lede">
			{data.structure.total_entries.toLocaleString('fr-FR')} entrées (DH {data.structure
				.all_numbers[0]}–{data.structure.all_numbers[data.structure.all_numbers.length - 1]})
			organisées en {data.structure.total_units} sections.
		</p>
		<div class="toc-actions">
			<a class="index-link" href="/denzinger">← Retour à l'accueil</a>
		</div>
	</header>

	<div class="parts">
		{#each data.structure.parts as part (part.slug)}
			{@const tree = buildTree(part.units)}
			<article class="part" id={part.slug}>
				<header class="part-head">
					<p class="part-eyebrow">
						{part.unit_count} sections · DH {part.first_n}–{part.last_n}
					</p>
					<h2 class="part-title">{part.title}</h2>
				</header>
				<ul class="tree">
					{#each tree as node (node.title)}
						{@render branch(node, 0)}
					{/each}
				</ul>
			</article>
		{/each}
	</div>

	<footer class="toc-foot" aria-hidden="true">
		<span class="fleuron">✠</span>
	</footer>
</main>

{#snippet branch(node: TreeNode, depth: number)}
	<li class="tree-node" data-depth={depth}>
		{#if node.unit}
			<a class="leaf" href="/denzinger/{node.unit.slug}">
				<span class="leaf-title">{node.title}</span>
				<span class="dotleader" aria-hidden="true"></span>
				<span class="leaf-range">
					{#if node.unit.first_n != null}
						DH {node.unit.first_n}{node.unit.last_n !== node.unit.first_n
							? `–${node.unit.last_n}`
							: ''}
					{/if}
				</span>
			</a>
		{:else}
			<p class="branch">{node.title}</p>
		{/if}
		{#if node.children.length > 0}
			<ul class="tree">
				{#each node.children as child (child.title)}
					{@render branch(child, depth + 1)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

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

	.parts {
		display: flex;
		flex-direction: column;
		gap: calc(var(--rh) * 4);
	}
	.part {
		scroll-margin-top: 5rem;
	}
	.part-head {
		margin-bottom: calc(var(--rh) * 1.25);
		padding-bottom: calc(var(--rh) * 0.5);
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		text-align: center;
	}
	.part-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.5rem;
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		font-weight: 700;
		line-height: 1.2;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}

	.tree {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.tree-node {
		margin: 0.05rem 0;
	}
	.tree-node[data-depth='1'] > .tree {
		padding-left: 1rem;
	}
	.tree-node[data-depth='2'] > .tree {
		padding-left: 1rem;
	}
	.tree-node[data-depth='3'] > .tree {
		padding-left: 1rem;
	}
	.tree-node[data-depth='4'] > .tree {
		padding-left: 1rem;
	}
	.tree-node[data-depth='5'] > .tree {
		padding-left: 1rem;
	}

	.branch {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0.85rem 0 0.4rem;
	}
	.tree-node[data-depth='0'] > .branch {
		font-size: 0.85rem;
		letter-spacing: 0.22em;
		color: var(--color-fg);
	}

	.leaf {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		text-decoration: none;
		color: var(--color-fg);
		padding: 0.3rem 0.5rem;
		margin-left: -0.5rem;
		border-radius: 2px;
		transition: background-color 120ms ease;
	}
	.leaf:hover {
		background: var(--hover-tint);
	}
	.leaf:hover .leaf-title {
		color: var(--color-accent);
	}
	.leaf-title {
		font-family: var(--font-body);
		font-size: 0.95rem;
	}
	.dotleader {
		flex: 1 1 auto;
		min-width: 1rem;
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
	.leaf-range {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		white-space: nowrap;
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
