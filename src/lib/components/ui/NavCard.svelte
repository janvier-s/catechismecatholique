<script lang="ts">
	let {
		direction,
		href,
		eyebrow,
		title,
		size = 'default'
	}: {
		direction: 'prev' | 'next';
		href: string;
		/** Omit for a bare card · the arrow alone carries the direction. */
		eyebrow?: string;
		title: string;
		/** 'sm' · compact card that hugs its content instead of filling half
		 *  the row. For nav where the title is a bare number. */
		size?: 'default' | 'sm';
	} = $props();

	// Existing callers embed the arrow in the eyebrow string ("← Chapitre précédent",
	// "Chapitre suivant →"). Strip it · the arrow is now its own rendered column.
	const label = $derived((eyebrow ?? '').replace(/^←\s*|\s*→$/g, '').trim());
</script>

<a
	class="nav-card"
	class:prev={direction === 'prev'}
	class:next={direction === 'next'}
	class:sm={size === 'sm'}
	{href}
>
	{#if direction === 'prev'}
		<span class="nav-arrow" aria-hidden="true">←</span>
	{/if}
	<span class="nav-body">
		{#if label}
			<span class="nav-eyebrow">{label}</span>
		{/if}
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
		font-family: var(--font-ui);
		font-size: 15px;
		font-weight: 500;
		line-height: 1.3;
		color: var(--color-fg);
		transition: color 140ms ease;
	}
	.nav-card:hover .nav-title {
		color: var(--color-accent-text);
	}

	/* Compact variant · a square tile that hugs its content (justify-between on
	   the parent still parks prev left and next right). Arrow stacks above the
	   number so the square holds any width of paragraph number, and both
	   directions read identically. */
	.nav-card.sm {
		flex: 0 0 auto;
		flex-direction: column;
		aspect-ratio: 1;
		min-width: 3.5rem;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		padding: 0.5rem;
		text-align: center;
	}
	.nav-card.sm .nav-arrow {
		order: -1;
		font-size: 1rem;
	}
	.nav-card.sm .nav-body {
		align-items: center;
	}
	.nav-card.sm .nav-title {
		font-size: 15px;
		font-variant-numeric: tabular-nums;
	}
</style>
