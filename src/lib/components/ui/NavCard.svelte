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
</script>

<a class="nav-card" class:prev={direction === 'prev'} class:next={direction === 'next'} {href}>
	<span class="nav-card-eyebrow">{eyebrow}</span>
	<span class="nav-card-title">{title}</span>
</a>

<style>
	.nav-card {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.85rem 1rem;
		background: var(--color-panel);
		border: 1px solid color-mix(in srgb, var(--color-fg) 22%, transparent);
		border-radius: 4px;
		color: var(--color-fg);
		text-decoration: none;
		transition:
			border-color 140ms ease,
			background 140ms ease,
			color 140ms ease;
	}
	.nav-card:hover {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		color: var(--color-accent-text);
	}
	.nav-card.prev {
		text-align: left;
	}
	.nav-card.next {
		text-align: right;
	}
	.nav-card-eyebrow {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-muted);
	}
	.nav-card-title {
		font-family: var(--font-heading);
		font-size: 15px;
		line-height: 1.3;
		color: var(--color-fg);
	}
	.nav-card:hover .nav-card-title {
		color: var(--color-accent-text);
	}
</style>
