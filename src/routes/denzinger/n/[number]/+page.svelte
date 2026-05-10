<script lang="ts">
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { frenchPunct } from '$lib/utils/typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>DH {data.entry.n} · Denzinger</title>
	<meta
		name="description"
		content={`Denzinger DH ${data.entry.n} — ${data.entry.title || data.entry.document || 'Enchiridion Symbolorum'}.`}
	/>
</svelte:head>

<main class="dz-reader">
	<header class="head">
		<BreadcrumbRail
			crumbs={[
				{ href: '/denzinger', title: 'Denzinger' },
				...(data.part
					? [{ href: `/denzinger/sommaire#${data.part.slug}`, title: data.part.title }]
					: []),
				{
					href: `/denzinger/n/${data.entry.n}`,
					kicker: `DH ${data.entry.n}`,
					title: data.entry.title || (data.entry.document ?? `DH ${data.entry.n}`)
				}
			]}
		/>
		<p class="kicker">DH {data.entry.n}</p>
		{#if data.entry.title}
			<h1 class="title">{frenchPunct(data.entry.title)}</h1>
		{:else}
			<h1 class="title title-num">N° {data.entry.n}</h1>
		{/if}
		{#if data.entry.document}
			<p class="document">{frenchPunct(data.entry.document)}</p>
		{/if}
	</header>

	<section class="prose" aria-label="Texte de l'entrée">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html frenchPunct(data.entry.html)}
	</section>

	<nav class="pager" aria-label="Entrées adjacentes">
		{#if data.prev !== null}
			<NavCard
				href="/denzinger/n/{data.prev}"
				eyebrow="Précédent"
				title="DH {data.prev}"
				direction="prev"
			/>
		{:else}
			<span></span>
		{/if}
		{#if data.next !== null}
			<NavCard
				href="/denzinger/n/{data.next}"
				eyebrow="Suivant"
				title="DH {data.next}"
				direction="next"
			/>
		{:else}
			<span></span>
		{/if}
	</nav>

	<p class="phase-note">
		<small
			>Cette édition (Phase 1) reproduit fidèlement le texte des entrées du recueil. La hiérarchie
			par pape, document et concile sera affinée dans une future version.</small
		>
	</p>
</main>

<style>
	.dz-reader {
		max-width: 760px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 2.5rem) 4rem;
		color: var(--color-fg);
		font-family: var(--font-body);
	}
	.head {
		text-align: center;
		margin-bottom: 2.5rem;
	}
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 1rem 0 0.5rem;
	}
	.title {
		font-family: var(--font-heading);
		font-size: clamp(1.6rem, 4vw, 2.4rem);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.005em;
		margin: 0;
		color: var(--color-heading, var(--color-fg));
	}
	.title-num {
		color: var(--color-muted);
		font-weight: 500;
	}
	.document {
		max-width: 44ch;
		margin: 0.85rem auto 0;
		font-style: italic;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--color-subtle);
	}
	.prose {
		font-family: var(--font-body);
		font-size: 1.02rem;
		line-height: 1.8;
	}
	.prose :global(p) {
		margin: 0 0 1em;
	}
	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 3rem;
	}
	.phase-note {
		margin-top: 3rem;
		text-align: center;
		color: var(--color-muted);
		font-style: italic;
	}
	@media (max-width: 640px) {
		.pager {
			grid-template-columns: 1fr;
		}
	}
</style>
