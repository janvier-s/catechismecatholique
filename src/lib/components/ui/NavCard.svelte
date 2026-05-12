<script lang="ts">
	let {
		direction,
		href,
		eyebrow,
		title
	}: {
		direction: 'prev' | 'next';
		href: string;
		eyebrow: string;
		title: string;
	} = $props();

	// Existing callers embed the arrow in the eyebrow string ("← Chapitre précédent",
	// "Chapitre suivant →"). Strip it · the arrow is now its own rendered column.
	const label = $derived(eyebrow.replace(/^←\s*|\s*→$/g, '').trim());
</script>

<a class="nav-card" class:prev={direction === 'prev'} class:next={direction === 'next'} {href}>
	{#if direction === 'prev'}
		<span class="nav-arrow" aria-hidden="true">←</span>
	{/if}
	<span class="nav-body">
		<span class="nav-eyebrow">{label}</span>
		<span class="nav-title">{title}</span>
	</span>
	{#if direction === 'next'}
		<span class="nav-arrow" aria-hidden="true">→</span>
	{/if}
</a>

<style>
	.nav-card {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 1rem;
		background: var(--color-panel);
		border: 1px solid color-mix(in srgb, var(--color-fg) 22%, transparent);
		border-radius: 4px;
		color: var(--color-fg);
		text-decoration: none;
		transition:
			border-color 140ms ease,
			background 140ms ease;
	}
	.nav-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
	}
	.nav-card.next {
		justify-content: flex-end;
		text-align: right;
	}
	.nav-arrow {
		flex-shrink: 0;
		font-size: 1.05rem;
		color: var(--color-muted);
		transition: color 140ms ease;
		line-height: 1;
	}
	.nav-card:hover .nav-arrow {
		color: var(--color-accent);
	}
	.nav-body {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.nav-eyebrow {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-muted);
		transition: color 140ms ease;
	}
	.nav-card:hover .nav-eyebrow {
		color: var(--color-accent);
	}
	.nav-title {
		font-family: var(--font-heading);
		font-size: 15px;
		line-height: 1.3;
		color: var(--color-fg);
		transition: color 140ms ease;
	}
	.nav-card:hover .nav-title {
		color: var(--color-accent-text);
	}
</style>
