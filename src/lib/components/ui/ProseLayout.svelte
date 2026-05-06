<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle = '',
		description = '',
		children
	}: {
		title: string;
		subtitle?: string;
		description?: string;
		children: Snippet;
	} = $props();

	const SITE = 'https://catechismecatholique.fr';

	const canonicalUrl = $derived(SITE + page.url.pathname);

	const scriptOpen = '<' + 'script type="application/ld+json">';
	const scriptClose = '</' + 'script>';

	const jsonLd = $derived(
		scriptOpen +
			JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'Article',
				headline: title,
				description: description || subtitle || title,
				url: canonicalUrl,
				inLanguage: 'fr-FR',
				author: {
					'@type': 'Organization',
					name: "Catéchisme de l'Église Catholique",
					url: SITE
				},
				publisher: {
					'@type': 'Organization',
					name: "Catéchisme de l'Église Catholique",
					url: SITE,
					logo: { '@type': 'ImageObject', url: SITE + '/favicon-96x96.png' }
				},
				isPartOf: { '@type': 'WebSite', name: "Catéchisme de l'Église Catholique", url: SITE }
			}) +
			scriptClose
	);

	// TOC: auto-built from h2 headings after mount
	let articleEl: HTMLElement | undefined = $state();
	let tocItems: { id: string; text: string }[] = $state([]);
	let activeId = $state('');

	function slugify(text: string): string {
		return text
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}

	$effect(() => {
		if (!articleEl) return;
		const headings = Array.from(articleEl.querySelectorAll('h2'));
		const items: { id: string; text: string }[] = [];
		for (const h of headings) {
			const text = (h.textContent ?? '').trim();
			if (!h.id) h.id = slugify(text);
			items.push({ id: h.id, text });
		}
		tocItems = items;
		if (items.length > 0) activeId = items[0]!.id;
	});

	$effect(() => {
		const onScroll = () => {
			if (!articleEl) return;
			const threshold = window.innerHeight * 0.25;
			let current = '';
			for (const h of Array.from(articleEl.querySelectorAll('h2[id]'))) {
				if ((h as HTMLElement).getBoundingClientRect().top <= threshold) {
					current = (h as HTMLElement).id;
				}
			}
			if (current) activeId = current;
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<svelte:head>
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description || subtitle || title} />
	{@html jsonLd}
</svelte:head>

<main id="main-content" class="prose-page">
	<header class="prose-header">
		<a href="/" class="prose-eyebrow">
			<span aria-hidden="true">✠</span> Catéchisme de l'Église Catholique
		</a>
		<h1 class="prose-title">{title}</h1>
		{#if subtitle}
			<p class="prose-subtitle">{subtitle}</p>
		{/if}
		<div class="prose-rule"></div>
	</header>

	<article class="prose-body" bind:this={articleEl}>
		{@render children()}
	</article>
</main>

{#if tocItems.length > 1}
	<aside class="prose-toc" aria-label="Sommaire">
		<p class="toc-label">Sommaire</p>
		<ul class="toc-list">
			{#each tocItems as item}
				<li class:toc-active={activeId === item.id}>
					<a href="#{item.id}">{item.text}</a>
				</li>
			{/each}
		</ul>
	</aside>
{/if}

<style>
	.prose-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 48px 24px 96px;
	}

	.prose-header {
		margin-bottom: 48px;
	}

	.prose-eyebrow {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.28em;
		color: var(--color-accent);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 16px;
		text-decoration: none;
	}

	.prose-title {
		font-family: var(--font-heading);
		font-size: clamp(1.9rem, 4vw, 2.6rem);
		font-weight: 700;
		color: var(--color-heading, var(--color-fg));
		letter-spacing: -0.02em;
		line-height: 1.15;
		margin: 0 0 12px;
	}

	.prose-subtitle {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--color-muted);
		margin: 0 0 20px;
		max-width: 560px;
	}

	.prose-rule {
		width: 40px;
		height: 1px;
		background: var(--color-accent);
		opacity: 0.7;
	}

	.prose-body {
		font-family: var(--font-body);
		font-size: 1.0625rem;
		line-height: 1.75;
		color: var(--color-fg);
	}

	.prose-body :global(h2) {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-fg));
		letter-spacing: -0.01em;
		margin: 52px 0 14px;
		line-height: 1.25;
		scroll-margin-top: 88px;
	}

	.prose-body :global(p) {
		margin: 0 0 20px;
	}

	.prose-body :global(a) {
		color: var(--color-accent-text);
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent-text) 40%, transparent);
		transition: text-decoration-color 150ms ease;
	}

	.prose-body :global(a:hover) {
		text-decoration-color: var(--color-accent-text);
	}

	.prose-body :global(ul) {
		margin: 0 0 20px;
		padding-left: 22px;
	}

	.prose-body :global(li) {
		margin-bottom: 7px;
	}

	.prose-body :global(hr) {
		border: none;
		height: 1px;
		background: var(--color-border);
		margin: 40px 0;
	}

	/* TOC */
	.prose-toc {
		position: fixed;
		right: 24px;
		top: 100px;
		width: 190px;
		max-height: calc(100vh - 120px);
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		opacity: 0;
		transform: translateX(6px);
		animation: toc-enter 400ms ease 300ms forwards;
	}

	@keyframes toc-enter {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.toc-label {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.24em;
		color: var(--color-accent-text);
		margin: 0 0 10px;
		opacity: 0.8;
	}

	.toc-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.toc-list li a {
		display: block;
		font-family: var(--font-ui);
		font-size: 12px;
		line-height: 1.5;
		padding: 3px 0;
		color: var(--color-subtle);
		text-decoration: none;
		opacity: 0.8;
		transition:
			color 200ms ease,
			opacity 200ms ease;
	}

	.toc-list li a:hover {
		color: var(--color-fg);
		opacity: 1;
	}

	.toc-list li.toc-active a {
		color: var(--color-accent-text);
		opacity: 1;
		font-weight: 600;
	}

	@media (max-width: 1100px) {
		.prose-toc {
			display: none;
		}
	}
</style>
