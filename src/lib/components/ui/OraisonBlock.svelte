<script lang="ts">
	import type { Snippet } from 'svelte';
	import { frenchPunct } from '$lib/utils/typography';

	interface Props {
		html?: string;
		cite?: string;
		children?: Snippet;
		eyebrow?: string;
	}

	let { html, cite, children, eyebrow = 'Oraison' }: Props = $props();
</script>

<aside class="oraison" aria-label={eyebrow}>
	<p class="oraison-eyebrow">{eyebrow}</p>
	<span class="oraison-ornament" aria-hidden="true">✠</span>
	{#if children}
		<div class="oraison-text">{@render children()}</div>
	{:else if html}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<div class="oraison-text">{@html frenchPunct(html)}</div>
	{/if}
	{#if cite}
		<p class="oraison-cite">{cite}</p>
	{/if}
</aside>

<style>
	.oraison {
		position: relative;
		padding: 1.75rem clamp(1.25rem, 4vw, 2.5rem) 1.5rem;
		background: color-mix(in srgb, var(--color-fg) 5%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-fg) 9%, transparent);
		border-radius: 6px;
		text-align: center;
		margin: 1.5rem 0;
	}

	.oraison-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.4rem;
	}

	.oraison-ornament {
		display: block;
		font-family: var(--font-heading);
		font-size: 0.95rem;
		color: color-mix(in srgb, var(--color-accent) 70%, transparent);
		line-height: 1;
		margin: 0 auto 0.9rem;
		user-select: none;
	}

	.oraison-text {
		font-family: var(--font-heading);
		font-size: 1.02rem;
		font-style: italic;
		line-height: 1.85;
		color: var(--color-fg);
		max-width: 44ch;
		margin: 0 auto;
	}
	.oraison-text :global(p) {
		margin: 0 0 0.6em;
	}
	.oraison-text :global(p:last-child) {
		margin-bottom: 0;
	}

	.oraison-cite {
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 1rem 0 0;
	}
	.oraison-cite::before {
		content: '· ';
		opacity: 0.6;
	}
</style>
