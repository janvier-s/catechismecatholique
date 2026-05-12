<script lang="ts">
	import { page } from '$app/state';

	// Maps the leading path segment of every shelved corpus to the
	// Bibliothèque shelf it lives on. Returning null means the back-link
	// should not render on this route.
	const SHELF_BY_PREFIX: Array<[RegExp, string]> = [
		// Shelf I · catechisms
		[/^\/compendium(\/|$)/, 'I'],
		[/^\/trente(\/|$)/, 'I'],
		[/^\/petit-catechisme(\/|$)/, 'I'],
		[/^\/grand-catechisme(\/|$)/, 'I'],
		[/^\/catechisme-adultes(\/|$)/, 'I'],
		[/^\/catechisme-illustre(\/|$)/, 'I'],
		// Shelf II · patristic & doctrinal syntheses
		[/^\/didache(\/|$)/, 'II'],
		[/^\/catecheses-mystagogiques(\/|$)/, 'II'],
		[/^\/discours-catechetique(\/|$)/, 'II'],
		[/^\/breviloquium(\/|$)/, 'II'],
		[/^\/doctrine-catholique(\/|$)/, 'II'],
		[/^\/doctrine-sociale(\/|$)/, 'II'],
		// Shelf III · magisterium
		[/^\/vatican-ii(\/|$)/, 'III'],
		[/^\/denzinger(\/|$)/, 'III'],
		[/^\/cic(\/|$)/, 'III'],
		[/^\/pgmr(\/|$)/, 'III'],
		[/^\/encycliques(\/|$)/, 'III']
	];

	const target = $derived.by(() => {
		const p = page.url.pathname;
		for (const [re, shelf] of SHELF_BY_PREFIX) {
			if (re.test(p)) return `/bibliotheque#shelf-${shelf}`;
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
