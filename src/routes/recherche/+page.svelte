<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function snippet(text: string, terms: string[]): string {
		if (terms.length === 0) return text.slice(0, 220) + (text.length > 220 ? '…' : '');
		const t = terms[0]!.toLowerCase();
		const i = text.toLowerCase().indexOf(t);
		if (i < 0) return text.slice(0, 220) + (text.length > 220 ? '…' : '');
		const start = Math.max(0, i - 80);
		const end = Math.min(text.length, i + 160);
		return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
	}

	function hitHref(h: PageData['hits'][number]): string {
		if (h.kind === 'paragraph') return `/ccc/${h.number}`;
		return `/ccc/${h.paragraph_start ?? ''}#${h.id.split('#')[1] ?? ''}`;
	}

	function hitMatchTerms(h: PageData['hits'][number]): string[] {
		return Object.keys(h.match);
	}
</script>

<svelte:head>
	<title>Recherche{data.q ? ` : ${data.q}` : ''} — Catéchisme</title>
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	<h1 class="font-heading text-4xl font-semibold mb-2">Recherche</h1>
	<form method="get" action="/recherche" class="mb-8">
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder="Chercher § 27, Mt 28:19, péché originel…"
			class="w-full h-12 px-4 rounded-md border border-border bg-background text-foreground font-ui text-base focus:outline-none focus:ring-2 focus:ring-accent"
			aria-label="Recherche"
		/>
	</form>

	{#if !data.q}
		<p class="text-muted">
			Tapez un mot, un numéro de paragraphe (§ 27) ou une référence biblique (Jn 1, 14).
		</p>
	{:else if data.hits.length === 0}
		<p class="text-muted italic">Aucun résultat pour « {data.q} ».</p>
	{:else}
		<p class="font-ui text-xs text-muted mb-4">{data.hits.length} résultat(s)</p>
		<ul class="space-y-5">
			{#each data.hits as h (h.id)}
				<li>
					<a href={hitHref(h)} class="block hover:bg-accent/5 p-3 -mx-3 rounded">
						<div class="font-ui text-xs text-accent font-semibold tabular-nums">
							{#if h.kind === 'paragraph'}CEC {h.number}{:else}Titre · CEC {h.paragraph_start}{/if}
						</div>
						{#if h.title}<div class="font-ui text-xs text-muted mt-0.5">{h.title}</div>{/if}
						<div class="font-body mt-1 text-[15px] leading-relaxed">
							{snippet(h.text, hitMatchTerms(h))}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>
