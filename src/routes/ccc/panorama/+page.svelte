<script lang="ts">
	import type { PageData } from './$types';
	import Panorama from '$lib/components/ui/Panorama.svelte';

	let { data }: { data: PageData } = $props();

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
	type Struct = { parts: Part[] };

	const struct = $derived(data.structure as Struct);
</script>

<svelte:head>
	<title>Panorama du Catéchisme de l'Église Catholique</title>
	<meta
		name="description"
		content="Panorama du Catéchisme de l'Église Catholique : prologue, quatre parties, sections, chapitres et articles vus d'un seul coup d'œil."
	/>
</svelte:head>

<main class="panorama-page">
	<header class="panorama-page-head">
		<p class="eyebrow">Vue d'ensemble</p>
		<h1 class="title">Panorama</h1>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>
		<p class="lede">
			Les 2&nbsp;865 paragraphes du Catéchisme, organisés d'un seul coup d'œil. Cliquez sur
			n'importe quel titre pour entrer dans la lecture.
		</p>
		<p class="back">
			<a href="/ccc/sommaire">← Sommaire détaillé</a>
		</p>
	</header>

	<Panorama parts={struct.parts} headingLevel={2} />
</main>

<style>
	.panorama-page {
		max-width: 1100px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vh, 2.75rem) clamp(1rem, 3vw, 2rem) clamp(2rem, 5vh, 3.5rem);
	}
	.panorama-page-head {
		text-align: center;
		margin-bottom: clamp(2rem, 5vh, 3.25rem);
	}
	.eyebrow {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.85rem;
		padding-left: 0.32em;
	}
	.title {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: clamp(2.5rem, 6vw, 4rem);
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
		margin-top: 1rem;
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		color: var(--color-accent);
		line-height: 1;
		user-select: none;
	}
	.rule {
		display: block;
		width: 80px;
		height: 1px;
	}
	.rule-l {
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent)
		);
	}
	.rule {
		background: linear-gradient(
			to left,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent)
		);
	}
	.lede {
		max-width: 38ch;
		margin: 1.25rem auto 0;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}
	.back {
		margin: 1.4rem 0 0;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
	.back a {
		color: var(--color-muted);
		text-decoration: none;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 1px;
	}
	.back a:hover {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}
</style>
