<script lang="ts">
	import { page } from '$app/state';
	import { corpusForPath } from '$lib/corpora';

	// The back-link only renders on shelved corpora.
	const target = $derived.by(() => {
		const p = page.url.pathname;
		const c = corpusForPath(p);
		if (c) return `/bibliotheque#shelf-${c.shelf}`;
		if (p === '/bon-pasteur' || p.startsWith('/bon-pasteur/')) {
			if (p.startsWith('/bon-pasteur/dieu/')) return null;
			if (p.startsWith('/bon-pasteur/liturgie/')) return null;
			return '/bibliotheque#shelf-I';
		}
		return null;
	});
</script>

{#if target}
	<div class="back-row">
		<a class="back-to-biblio" href={target}>
			<span class="arrow" aria-hidden="true">←</span>
			Retour à la Bibliothèque
		</a>
	</div>
{/if}

<style>
	.back-row {
		padding: 0.85rem clamp(1rem, 4vw, 2.5rem) 0;
	}
	.back-to-biblio {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
		padding: 0.25rem 0;
		transition: color 140ms ease;
	}
	.back-to-biblio:hover {
		color: var(--color-fg);
	}
	.arrow {
		display: inline-block;
		line-height: 1;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.back-to-biblio:hover .arrow {
		transform: translateX(-3px);
	}
</style>
