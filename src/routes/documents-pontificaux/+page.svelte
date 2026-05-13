<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import CollectionPage from '$lib/components/ui/CollectionPage.svelte';
	import type { CollectionGroup } from '$lib/components/ui/CollectionPage.svelte';

	// One record per planned document. `present: true` flips a card from
	// stub (not clickable) to a real link once content lands · until then
	// every card stays href: null.
	type DocKind = 'encyclique' | 'exhortation' | 'constitution' | 'note' | 'concile';
	type Doc = {
		slug: string;
		kind: DocKind;
		title: string;
		author: string;
		date: string; // YYYY or YYYY-YYYY
		blurb: string;
		present: boolean;
	};

	const DOCS: Doc[] = [
		// ── Léon XIII ────────────────────────────────────────────────────
		{
			slug: 'aeterni-patris',
			kind: 'encyclique',
			title: 'Aeterni Patris',
			author: 'Léon XIII',
			date: '1879',
			blurb: "Sur la restauration de la philosophie chrétienne selon saint Thomas d'Aquin.",
			present: false
		},
		{
			slug: 'libertas-praestantissimum',
			kind: 'encyclique',
			title: 'Libertas Praestantissimum',
			author: 'Léon XIII',
			date: '1888',
			blurb: 'Sur la nature de la liberté humaine et les libertés modernes.',
			present: false
		},
		{
			slug: 'sapientiae-christianae',
			kind: 'encyclique',
			title: 'Sapientiae Christianae',
			author: 'Léon XIII',
			date: '1890',
			blurb: 'Sur les principaux devoirs des chrétiens comme citoyens.',
			present: false
		},
		{
			slug: 'rerum-novarum',
			kind: 'encyclique',
			title: 'Rerum Novarum',
			author: 'Léon XIII',
			date: '1891',
			blurb: 'Sur la condition des ouvriers · acte fondateur de la doctrine sociale.',
			present: false
		},
		// ── Pie X ────────────────────────────────────────────────────────
		{
			slug: 'pascendi-dominici-gregis',
			kind: 'encyclique',
			title: 'Pascendi Dominici Gregis',
			author: 'Saint Pie X',
			date: '1907',
			blurb: 'Sur les doctrines du modernisme.',
			present: false
		},
		// ── Pie XII ──────────────────────────────────────────────────────
		{
			slug: 'mystici-corporis-christi',
			kind: 'encyclique',
			title: 'Mystici Corporis Christi',
			author: 'Pie XII',
			date: '1943',
			blurb: "Sur le Corps mystique du Christ qu'est l'Église.",
			present: false
		},
		{
			slug: 'divino-afflante-spiritu',
			kind: 'encyclique',
			title: 'Divino Afflante Spiritu',
			author: 'Pie XII',
			date: '1943',
			blurb: 'Sur la promotion des études bibliques.',
			present: false
		},
		{
			slug: 'mediator-dei',
			kind: 'encyclique',
			title: 'Mediator Dei',
			author: 'Pie XII',
			date: '1947',
			blurb: 'Sur la sainte liturgie.',
			present: false
		},
		{
			slug: 'humani-generis',
			kind: 'encyclique',
			title: 'Humani Generis',
			author: 'Pie XII',
			date: '1950',
			blurb: 'Sur certaines opinions fausses menaçant les fondements de la doctrine catholique.',
			present: false
		},
		{
			slug: 'ad-caeli-reginam',
			kind: 'encyclique',
			title: 'Ad Cæli Reginam',
			author: 'Pie XII',
			date: '1954',
			blurb: 'Sur la royauté de Marie.',
			present: false
		},
		// ── Paul VI ──────────────────────────────────────────────────────
		{
			slug: 'humanae-vitae',
			kind: 'encyclique',
			title: 'Humanae Vitae',
			author: 'Saint Paul VI',
			date: '1968',
			blurb: 'Sur le mariage et la transmission de la vie.',
			present: false
		},
		// ── Jean-Paul II ─────────────────────────────────────────────────
		{
			slug: 'catechesi-tradendae',
			kind: 'exhortation',
			title: 'Catechesi Tradendae',
			author: 'Saint Jean-Paul II',
			date: '1979',
			blurb: 'Sur la catéchèse en notre temps.',
			present: false
		},
		{
			slug: 'fidei-depositum',
			kind: 'constitution',
			title: 'Fidei Depositum',
			author: 'Saint Jean-Paul II',
			date: '1992',
			blurb: "Constitution apostolique de promulgation du Catéchisme de l'Église Catholique.",
			present: false
		},
		{
			slug: 'veritatis-splendor',
			kind: 'encyclique',
			title: 'Veritatis Splendor',
			author: 'Saint Jean-Paul II',
			date: '1993',
			blurb: "Sur quelques questions fondamentales de l'enseignement moral de l'Église.",
			present: false
		},
		{
			slug: 'fides-et-ratio',
			kind: 'encyclique',
			title: 'Fides et Ratio',
			author: 'Saint Jean-Paul II',
			date: '1998',
			blurb: 'Sur les rapports entre la foi et la raison.',
			present: false
		},
		// ── Congrégation pour la doctrine de la foi ──────────────────────
		{
			slug: 'engagement-politique',
			kind: 'note',
			title: "Note doctrinale sur l'engagement en politique",
			author: 'Congrégation pour la doctrine de la foi',
			date: '2002',
			blurb:
				"Sur certaines questions concernant l'engagement et le comportement des catholiques dans la vie politique.",
			present: false
		},
		// ── Concile de Trente ────────────────────────────────────────────
		{
			slug: 'trente-sessions',
			kind: 'concile',
			title: 'Sessions du Concile de Trente',
			author: 'Concile œcuménique',
			date: '1545-1563',
			blurb: 'Vingt-cinq sessions, décrets dogmatiques et canons disciplinaires.',
			present: false
		}
	];

	const KIND_LABEL: Record<DocKind, string> = {
		encyclique: 'Encycliques',
		exhortation: 'Exhortations apostoliques',
		constitution: 'Constitutions apostoliques',
		note: 'Documents doctrinaux',
		concile: 'Documents conciliaires'
	};
	const KIND_KICKER: Record<DocKind, string> = {
		encyclique: 'Lettres encycliques des Souverains Pontifes',
		exhortation: 'Exhortations apostoliques post-synodales',
		constitution: "Actes solennels d'organisation et de promulgation",
		note: 'Notes de la Congrégation pour la doctrine de la foi',
		concile: 'Décrets et canons des conciles œcuméniques'
	};
	const KIND_ORDER: DocKind[] = ['encyclique', 'exhortation', 'constitution', 'note', 'concile'];

	const grouped: Record<DocKind, Doc[]> = {
		encyclique: [],
		exhortation: [],
		constitution: [],
		note: [],
		concile: []
	};
	for (const d of DOCS) grouped[d.kind].push(d);
	for (const k of KIND_ORDER) grouped[k].sort((a, b) => a.date.localeCompare(b.date));

	const totalCount = DOCS.length;
	const presentCount = DOCS.filter((d) => d.present).length;

	const groups: CollectionGroup[] = KIND_ORDER.filter((k) => grouped[k].length > 0).map((kind) => ({
		title: KIND_LABEL[kind],
		kicker: KIND_KICKER[kind],
		count: `${grouped[kind].length}`,
		columns: 4,
		items: grouped[kind].map((doc) => ({
			slug: doc.slug,
			href: doc.present ? `/documents-pontificaux/${doc.slug}` : null,
			image: `/img/bibliotheque/dp-${doc.slug}.webp`,
			eyebrow: `${doc.author} · ${doc.date}`,
			title: doc.title,
			blurb: doc.blurb
		}))
	}));
</script>

<MetaTags
	title="Documents pontificaux · Magistère"
	description="Encycliques, exhortations, constitutions et documents doctrinaux du Magistère pontifical, de Léon XIII à nos jours, et sessions du Concile de Trente."
	image="/img/bibliotheque/documents-pontificaux.webp"
/>

<div class="dp-wrap">
	<CollectionPage kicker="Magistère pontifical" title="Documents<br />pontificaux" {groups}>
		{#snippet lede()}
			Encycliques, exhortations apostoliques, constitutions apostoliques et notes doctrinales du
			Magistère pontifical, de Léon XIII à nos jours, ainsi que les sessions du Concile de Trente.
			{presentCount} document{presentCount > 1 ? 's' : ''} disponible{presentCount > 1 ? 's' : ''} sur
			{totalCount}.
		{/snippet}
	</CollectionPage>
</div>

<style>
	.dp-wrap :global(.hero-title) {
		font-style: normal;
	}
</style>
