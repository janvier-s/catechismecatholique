<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function refLabel(refs: number[]): string {
		// "1373, 1374, 1375" → "1373-1375" for compact display when contiguous.
		if (refs.length === 0) return '';
		const out: string[] = [];
		let runStart = refs[0]!;
		let prev = refs[0]!;
		for (let i = 1; i <= refs.length; i++) {
			const cur = refs[i];
			if (cur !== undefined && cur === prev + 1) {
				prev = cur;
				continue;
			}
			out.push(runStart === prev ? String(runStart) : `${runStart}-${prev}`);
			if (cur !== undefined) {
				runStart = cur;
				prev = cur;
			}
		}
		return out.join(', ');
	}
</script>

<svelte:head>
	<title>{data.entry.term} · Glossaire · Catéchisme</title>
	{#if data.entry.definition}
		<meta name="description" content={data.entry.definition.slice(0, 160)} />
	{/if}
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	<nav class="mb-6 font-ui text-sm flex items-center gap-2">
		<a
			href={data.cluster ? `/glossaire/c/${data.cluster.id}` : '/glossaire'}
			class="inline-flex items-center gap-1 text-muted hover:text-accent"
		>
			<span aria-hidden="true">←</span>
			<span>Retour à {data.cluster?.label ?? 'glossaire'}</span>
		</a>
	</nav>

	<header class="mb-6">
		<h1 class="font-heading text-4xl font-semibold mb-1">{data.entry.term}</h1>
		{#if data.entry.latin}
			<p class="font-body italic text-muted text-[16px]">{data.entry.latin}</p>
		{/if}
	</header>

	{#if data.entry.definition}
		<section class="mb-8 p-4 rounded-md bg-accent/5 border-l-4 border-accent">
			<p class="font-body text-[16px] leading-relaxed">{data.entry.definition}</p>
		</section>
	{/if}

	{#if data.entry.directRefs.length > 0 && data.entry.subEntries.length === 0}
		<section class="mb-8">
			<p class="font-ui text-[12px] uppercase tracking-[0.15em] text-muted mb-2">Renvois</p>
			<p class="font-body text-[15px]">
				{#each data.entry.directRefs as ref, i (ref)}
					{#if i > 0},
					{/if}
					<a href="/ccc/{ref}" class="text-accent hover:underline tabular-nums">§{ref}</a>
				{/each}
			</p>
		</section>
	{/if}

	{#if data.entry.subEntries.length > 0}
		<section class="mb-8">
			<h2 class="font-ui text-[12px] uppercase tracking-[0.15em] text-muted mb-3">
				{data.entry.subEntries.length} aspects
			</h2>
			<ul class="space-y-3">
				{#each data.entry.subEntries as sub, i (sub.label + i)}
					<li class="border-l-2 border-border pl-3">
						<p class="font-body text-[15px] mb-1">{sub.label}</p>
						<p class="font-ui text-[13px] tabular-nums">
							{#each sub.refs as ref, j (ref)}
								{#if j > 0}<span class="text-muted">,</span> {/if}
								<a href="/ccc/{ref}" class="text-accent hover:underline">§{ref}</a>
							{/each}
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.seeAlsoLinks.some((l) => l.slug)}
		<section class="mb-8">
			<p class="font-ui text-[12px] uppercase tracking-[0.15em] text-muted mb-2">Voir aussi</p>
			<ul class="flex flex-wrap gap-2">
				{#each data.seeAlsoLinks.filter((l) => l.slug) as link, i (link.label + i)}
					<li>
						<a
							href="/glossaire/{link.slug}"
							class="inline-block px-3 py-1 rounded-full text-[13px] border border-border hover:border-accent hover:text-accent font-ui"
						>
							{link.term}
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.clusters.length > 0}
		<aside class="mt-12 pt-6 border-t border-border">
			<p class="font-ui text-[12px] text-muted">
				Thème{data.clusters.length > 1 ? 's' : ''} :
				{#each data.clusters as c, i (c.id)}
					{#if i > 0}<span class="text-muted">,</span> {/if}
					<a href="/glossaire/c/{c.id}" class="text-accent hover:underline">{c.label}</a>
				{/each}
			</p>
		</aside>
	{/if}
</main>
