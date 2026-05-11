<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type RefSegment = { label: string; first: number };

	function refSegments(refs: number[]): RefSegment[] {
		// "1373, 1374, 1375" → [{ label: "1373-1375", first: 1373 }] for
		// compact display when contiguous.
		if (refs.length === 0) return [];
		const out: RefSegment[] = [];
		let runStart = refs[0]!;
		let prev = refs[0]!;
		for (let i = 1; i <= refs.length; i++) {
			const cur = refs[i];
			if (cur !== undefined && cur === prev + 1) {
				prev = cur;
				continue;
			}
			out.push({
				label: runStart === prev ? String(runStart) : `${runStart}-${prev}`,
				first: runStart
			});
			if (cur !== undefined) {
				runStart = cur;
				prev = cur;
			}
		}
		return out;
	}

	function pluralFr(n: number, singular: string, plural: string): string {
		return n === 1 ? singular : plural;
	}
</script>

<svelte:head>
	<title>{data.entry.term}, glossaire du Catéchisme de l'Église Catholique</title>
	{#if data.entry.definition}
		<meta name="description" content={data.entry.definition.slice(0, 160)} />
	{/if}
</svelte:head>

{#snippet backLink()}
	<a
		href={data.cluster ? `/glossaire/c/${data.cluster.id}` : '/glossaire'}
		class="inline-flex items-center gap-1 font-ui text-sm text-muted hover:text-accent"
	>
		<span aria-hidden="true">←</span>
		<span>Retour à {data.cluster?.label ?? 'glossaire'}</span>
	</a>
{/snippet}

<main class="mx-auto max-w-reader px-6 py-10">
	<nav class="mb-6" aria-label="Fil d'Ariane">
		{@render backLink()}
	</nav>

	<header class="mb-6">
		<h1 class="font-heading text-4xl font-semibold mb-1">
			{#if data.entry.directRefs.length > 0 && data.entry.subEntries.length === 0}
				<a
					href="/cec/{data.entry.directRefs.length > 1
						? data.entry.directRefs.join(',')
						: data.entry.directRefs[0]}?label={encodeURIComponent(data.entry.term)}"
					class="hover:text-accent hover:underline">{data.entry.term}</a
				>
			{:else}
				{data.entry.term}
			{/if}
		</h1>
		{#if data.entry.latin}
			<p class="font-body italic text-muted text-[16px]">{data.entry.latin}</p>
		{/if}
	</header>

	{#if data.entry.definition}
		<section class="mb-10">
			<p class="font-body text-[17px] leading-relaxed">{data.entry.definition}</p>
		</section>
	{/if}

	{#if data.entry.directRefs.length > 0 && data.entry.subEntries.length === 0}
		<section class="mb-8">
			<p class="font-ui text-[12px] uppercase tracking-[0.15em] text-muted mb-2">
				{pluralFr(refSegments(data.entry.directRefs).length, 'Renvoi', 'Renvois')}
			</p>
			<p class="font-ui text-[20px] leading-snug">
				{#each refSegments(data.entry.directRefs) as seg, i (seg.first)}
					{#if i > 0}<span class="text-muted mr-[0.23rem]">,</span>{/if}
					<a href="/cec/{seg.first}" class="text-accent hover:underline tabular-nums">{seg.label}</a
					>
				{/each}
				{#if data.entry.directRefs.length > 1}
					<br /><a
						href="/cec/{data.entry.directRefs.join(',')}?label={encodeURIComponent(
							data.entry.term
						)}"
						class="font-ui text-[14px] text-muted hover:text-foreground hover:underline"
					>
						Lire les {data.entry.directRefs.length} paragraphes →
					</a>
				{/if}
			</p>
		</section>
	{/if}

	{#if data.entry.subEntries.length > 0}
		<section class="mb-8">
			<h2 class="font-ui text-[12px] uppercase tracking-[0.15em] text-muted mb-3">
				{data.entry.subEntries.length}
				{pluralFr(data.entry.subEntries.length, 'aspect', 'aspects')}
			</h2>
			<ul class="space-y-3">
				{#each data.entry.subEntries as sub, i (sub.label + i)}
					<li>
						{#if sub.refs.length > 0}
							<a
								href="/cec/{sub.refs.length > 1
									? sub.refs.join(',')
									: sub.refs[0]}?label={encodeURIComponent(sub.label)}"
								class="font-body text-[16px] font-semibold mb-1 hover:text-accent hover:underline"
								>{sub.label}</a
							>
						{:else}
							<p class="font-body text-[16px] font-semibold mb-1">{sub.label}</p>
						{/if}
						<p class="font-ui text-[16px] tabular-nums text-muted leading-snug">
							{#each refSegments(sub.refs) as seg, j (seg.first)}
								{#if j > 0}<span class="mr-[0.23rem]">,</span>{/if}
								<a href="/cec/{seg.first}" class="text-accent hover:underline">{seg.label}</a>
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
			<p class="font-ui text-[11px] uppercase tracking-[0.15em] text-muted mb-2">
				Thème{data.clusters.length > 1 ? 's' : ''}
			</p>
			<ul class="flex flex-wrap gap-2">
				{#each data.clusters as c (c.id)}
					<li>
						<a
							href="/glossaire/c/{c.id}"
							class="inline-block px-2.5 py-0.5 rounded-full text-[11px] border border-border text-muted hover:border-accent hover:text-accent font-ui"
						>
							{c.label}
						</a>
					</li>
				{/each}
			</ul>
		</aside>
	{/if}

	<nav class="mt-10" aria-label="Retour au glossaire">
		{@render backLink()}
	</nav>
</main>
