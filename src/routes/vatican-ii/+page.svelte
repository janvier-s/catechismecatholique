<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import CollectionPage from '$lib/components/ui/CollectionPage.svelte';
	import type { CollectionGroup } from '$lib/components/ui/CollectionPage.svelte';
	import type { PageData } from './$types';
	import type { VatIIDocKind } from '$lib/data/types';

	let { data }: { data: PageData } = $props();

	const KIND_LABEL: Record<VatIIDocKind, string> = {
		constitution: 'Constitutions',
		decree: 'Décrets',
		declaration: 'Déclarations'
	};
	const KIND_KICKER: Record<VatIIDocKind, string> = {
		constitution: 'Quatre constitutions doctrinales et pastorales',
		decree: `Neuf décrets sur la vie et la mission de l'Église`,
		declaration: `Trois déclarations sur l'éducation, les religions et la liberté`
	};
	const KIND_ORDER: VatIIDocKind[] = ['constitution', 'decree', 'declaration'];

	const grouped = $derived.by(() => {
		const out: Record<VatIIDocKind, typeof data.structure.docs> = {
			constitution: [],
			decree: [],
			declaration: []
		};
		for (const d of data.structure.docs) out[d.kind].push(d);
		for (const k of KIND_ORDER) out[k].sort((a, b) => a.date.localeCompare(b.date));
		return out;
	});

	const totalParagraphs = $derived(data.structure.docs.reduce((s, d) => s + d.totalParagraphs, 0));
	const presentCount = $derived(data.structure.docs.filter((d) => d.present).length);

	const groups = $derived<CollectionGroup[]>(
		KIND_ORDER.map((kind) => ({
			title: KIND_LABEL[kind],
			kicker: KIND_KICKER[kind],
			count: `${grouped[kind].filter((d) => d.present).length} / ${grouped[kind].length}`,
			...(kind === 'constitution' ? { columns: 4 } : {}),
			items: grouped[kind].map((doc) => ({
				slug: doc.slug,
				href: doc.present ? `/vatican-ii/${doc.slug}` : null,
				image: `/img/bibliotheque/vii-${doc.slug}.webp`,
				eyebrow: `${doc.abbr} · ${doc.date.slice(0, 4)}`,
				title: doc.title,
				subtitle: doc.subtitle
			}))
		}))
	);
</script>

<MetaTags
	title="Concile Vatican II"
	description="Les seize documents du concile Vatican II (1962-1965) : 4 constitutions, 9 décrets et 3 déclarations."
	image="/img/bibliotheque/vatican-ii.webp"
	schema={{
		kind: 'book',
		name: 'Documents du concile Vatican II',
		datePublished: '1965',
		about:
			"Constitutions, décrets et déclarations du XXIᵉ concile œcuménique de l'Église catholique"
	}}
/>

<CollectionPage kicker="Concile œcuménique · 1962–1965" title="Vatican II" {groups}>
	{#snippet lede()}
		Les seize documents du XXI<sup>e</sup> concile œcuménique (quatre constitutions, neuf décrets et
		trois déclarations), promulgués sous Jean XXIII et Paul VI.
		{presentCount} documents disponibles ({totalParagraphs} paragraphes).
	{/snippet}
</CollectionPage>
