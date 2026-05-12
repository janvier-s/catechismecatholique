<script lang="ts">
	import { loadDenzingerCitedBy, loadDenzingerRefs, loadDenzingerIndex } from '$lib/data/loaders';

	type Mode = 'cross-refs' | 'cited-by';
	let { n, mode }: { n: number; mode: Mode } = $props();

	type Entry = { n: number; title: string; unit_slug: string; document?: string | null };
	let items: Entry[] = $state([]);
	let loading = $state(true);

	$effect(() => {
		const _n = n;
		void mode;
		loading = true;
		(async () => {
			const [refs, citedBy, index] = await Promise.all([
				loadDenzingerRefs(),
				loadDenzingerCitedBy(),
				loadDenzingerIndex()
			]);
			const ns = (mode === 'cross-refs' ? refs[String(_n)] : citedBy[String(_n)]) ?? [];
			items = ns.map((target) => {
				const meta = index[String(target)];
				return {
					n: target,
					title: '',
					unit_slug: meta?.unit_slug ?? '',
					document: null
				};
			});
			loading = false;
		})();
	});
</script>

{#if loading}
	<p class="state">Chargement…</p>
{:else if items.length === 0}
	<p class="state state-empty">
		{#if mode === 'cross-refs'}
			Aucun renvoi détecté dans cette entrée.
		{:else}
			Cette entrée n'est citée par aucune autre.
		{/if}
	</p>
{:else}
	<ul class="list">
		{#each items as item (item.n)}
			<li>
				<a class="row" href="/enchiridion/{item.unit_slug}#dh-{item.n}">
					<span class="row-num">DH {item.n}</span>
					<span class="row-arrow" aria-hidden="true">→</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.state {
		margin: 1.5rem 1rem;
		font-family: var(--font-body);
		font-size: 0.9rem;
		font-style: italic;
		color: var(--color-muted);
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0.5rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.55rem 1rem;
		text-decoration: none;
		color: var(--color-fg);
		border-left: 2px solid transparent;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
	}
	.row:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		border-left-color: var(--color-accent);
	}
	.row-num {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-accent);
	}
	.row-arrow {
		color: var(--color-muted);
		font-size: 0.9rem;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.row:hover .row-arrow {
		transform: translateX(3px);
		color: var(--color-accent);
	}
</style>
