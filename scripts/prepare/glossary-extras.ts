// Manual seed entries — concepts that are head terms in the English Ascension
// edition's analytical index but have no head-word in the French thematic
// index. Each entry was checked against the existing French glossary to
// confirm no overlap exists at the head or sub-entry level. Refs come from
// `bm_index.xhtml` in the Ascension source.
//
// These entries flow through `buildGlossary` as a third pass after the FR
// thematic index and the EN overlay. They are flagged `standalone: true`.
import type { ClusterId } from './glossary-clusters.ts';

export interface GlossaryExtraSubEntry {
	label: string;
	refs: number[];
}

export interface GlossaryExtra {
	term: string;
	slug: string;
	definition: string;
	latin?: string;
	directRefs: number[];
	subEntries: GlossaryExtraSubEntry[];
	seeAlso: string[];
	clusters: ClusterId[];
}

export const GLOSSARY_EXTRAS: GlossaryExtra[] = [
	{
		term: 'Engagement',
		slug: 'engagement',
		definition:
			"Réponse libre par laquelle la personne se lie à un état de vie, à une mission ou à une parole donnée. La foi elle-même est un engagement, comme l'est le mariage, la vie consacrée et le service apostolique.",
		directRefs: [],
		subEntries: [
			{ label: 'Chasteté comme engagement personnel', refs: [2344] },
			{ label: 'Engagement des chrétiens', refs: [1319, 2046] },
			{ label: 'Engagement de la famille envers la communauté', refs: [2208] },
			{ label: 'Engagement dans le mariage', refs: [2381, 2390] },
			{ label: 'Engagement missionnaire', refs: [854] },
			{ label: 'Foi comme engagement', refs: [1102, 1428] },
			{ label: 'Maîtrise de soi, engagement long et exigeant', refs: [2342] },
			{ label: 'Engagement dans la vie sociale', refs: [1913, 1940, 1947] }
		],
		seeAlso: ['Vocation', 'Foi'],
		clusters: ['morale']
	},
	{
		term: 'Divination',
		slug: 'divination',
		definition:
			"Recours à des moyens censés dévoiler l'avenir ou les secrets cachés en dehors de Dieu. Toutes les formes de divination sont à rejeter ; elles contredisent l'honneur et le respect dus à Dieu seul.",
		directRefs: [],
		subEntries: [{ label: 'Pratique contraire à Dieu', refs: [2115, 2138] }],
		seeAlso: ['Magie', 'Idolâtrie'],
		clusters: ['morale']
	},
	{
		term: 'Pédagogie divine',
		slug: 'pedagogie-divine',
		definition:
			"Manière dont Dieu se révèle progressivement à l'homme et le forme à recevoir le salut. Par étapes successives, depuis la création jusqu'à la plénitude des temps, Dieu prépare son peuple à accueillir le Christ et la grâce de l'Évangile.",
		directRefs: [53, 708, 1950, 1964],
		subEntries: [],
		seeAlso: ['Révélation', 'Alliance'],
		clusters: ['ecriture']
	},
	{
		term: 'Expiation',
		slug: 'expiation',
		definition:
			"Réparation offerte pour le péché. Dans l'Ancien Testament, des rites d'expiation étaient prescrits ; tous trouvent leur accomplissement dans la Passion du Christ, qui s'est offert lui-même comme victime d'expiation pour les péchés du monde.",
		directRefs: [],
		subEntries: [
			{
				label: "Jésus, victime d'expiation pour les péchés des hommes",
				refs: [457, 604, 615, 1476, 1992]
			},
			{ label: 'Expiation des péchés en Israël', refs: [433, 578] },
			{ label: 'Valeur expiatrice de la peine', refs: [2266] }
		],
		seeAlso: ['Réparation', 'Propitiation', 'Sacrifice'],
		clusters: ['christ', 'morale']
	},
	{
		term: 'Formation',
		slug: 'formation',
		definition:
			"Travail d'éducation continue qui prépare le chrétien à sa mission, qu'il soit catéchumène, fidèle, catéchiste ou ministre. La formation porte sur la doctrine, la prière, la conscience morale et la vie liturgique.",
		directRefs: [],
		subEntries: [
			{ label: 'Formation catéchétique', refs: [906] },
			{ label: 'Formation des catéchumènes', refs: [1248] },
			{ label: 'Formation de la conscience', refs: [1783] },
			{ label: 'Formation des évangélisateurs', refs: [428] },
			{ label: 'Formation à la prière', refs: [2686] },
			{ label: 'Médias et formation', refs: [2493] },
			{ label: 'Formation spirituelle des enfants', refs: [2221] }
		],
		seeAlso: ['Éducation', 'Catéchèse'],
		clusters: ['eglise', 'morale']
	},
	{
		term: 'Genres littéraires',
		slug: 'genres-litteraires',
		definition:
			"Modes d'expression utilisés par les auteurs sacrés pour transmettre la vérité révélée. L'interprétation de l'Écriture tient compte du genre littéraire de chaque livre, qui peut être historique, prophétique, poétique, sapientiel ou apocalyptique.",
		directRefs: [110],
		subEntries: [],
		seeAlso: ['Écriture sainte', 'Bible'],
		clusters: ['ecriture']
	},
	{
		term: 'Immortalité',
		slug: 'immortalite',
		definition:
			"Caractère de ce qui ne meurt pas. L'âme humaine est immortelle parce qu'elle est créée immédiatement par Dieu et qu'elle ne périt pas avec le corps. L'Eucharistie est appelée par les Pères « remède d'immortalité ».",
		directRefs: [],
		subEntries: [
			{ label: "Eucharistie, « remède d'immortalité »", refs: [1405, 2837] },
			{ label: "Immortalité de l'âme", refs: [366, 382] }
		],
		seeAlso: ['Âme', 'Résurrection'],
		clusters: ['creation-homme', 'fins-dernieres']
	},
	{
		term: "Mariage à l'essai",
		slug: 'mariage-a-l-essai',
		definition:
			"Union où les conjoints se réservent la possibilité de rompre le lien selon les résultats de l'expérience. Cette pratique est contraire à la vocation du mariage, qui exige le don total et définitif des époux l'un à l'autre.",
		directRefs: [2391],
		subEntries: [],
		seeAlso: ['Mariage', 'Union libre et concubinage'],
		clusters: ['morale', 'sacrements']
	},
	{
		term: 'Serment',
		slug: 'serment',
		definition:
			"Acte par lequel on prend Dieu à témoin de la vérité d'une affirmation ou de la sincérité d'une promesse. Le serment honore le saint nom de Dieu lorsqu'il est prêté pour des causes graves et conformes à la vérité ; il est interdit pour des motifs futiles.",
		directRefs: [],
		subEntries: [
			{ label: "Serment selon la tradition de l'Église", refs: [2154] },
			{ label: 'Faux serment', refs: [2150] },
			{ label: 'Parole de Jésus : « Ne jurez pas du tout »', refs: [2153] },
			{ label: 'Parjure', refs: [2152, 2476] },
			{ label: 'Refus du serment pour des motifs frivoles', refs: [2155] }
		],
		seeAlso: ['Parjure'],
		clusters: ['morale']
	},
	{
		term: 'Lieux du culte',
		slug: 'lieux-du-culte',
		definition:
			"Édifices sacrés où la communauté chrétienne se rassemble pour célébrer la liturgie. L'église est à la fois maison de Dieu et lieu de réunion du peuple de Dieu ; sa disposition exprime le mystère qu'on y célèbre.",
		directRefs: [1179, 1198],
		subEntries: [],
		seeAlso: ['Culte', 'Église'],
		clusters: ['liturgie']
	},
	{
		term: 'Groupes de prière',
		slug: 'groupes-de-priere',
		definition:
			"Rassemblements de fidèles qui prient ensemble, soutiennent la vie spirituelle de leurs membres et nourrissent la prière personnelle. Ils sont des écoles de prière où l'on apprend à se tenir devant Dieu en Église.",
		directRefs: [2689, 2695],
		subEntries: [],
		seeAlso: ['Prière'],
		clusters: ['priere']
	},
	{
		term: 'Présentation de Jésus au Temple',
		slug: 'presentation-de-jesus-au-temple',
		definition:
			"Mystère où Marie et Joseph présentent l'Enfant Jésus au Temple de Jérusalem, quarante jours après sa naissance. Selon la Loi, l'enfant premier-né appartient à Dieu ; Siméon et Anne y reconnaissent en lui le Messie attendu d'Israël.",
		directRefs: [529],
		subEntries: [],
		seeAlso: ['Jésus', 'Temple'],
		clusters: ['christ', 'liturgie']
	},
	{
		term: 'Tristesse',
		slug: 'tristesse',
		definition:
			"Passion par laquelle l'âme s'afflige d'un mal présent. La tristesse devient péché lorsqu'elle naît de l'envie ou détourne de la prière ; elle est salutaire lorsqu'elle accompagne la conversion du cœur et la contrition pour le péché.",
		directRefs: [],
		subEntries: [
			{ label: "Tristesse dans l'envie", refs: [2539, 2553] },
			{ label: 'Tristesse, obstacle à la prière', refs: [2728] },
			{ label: 'Tristesse, passion principale', refs: [1772] },
			{ label: 'Tristesse salutaire dans la conversion du cœur', refs: [1431] }
		],
		seeAlso: ['Acédie', 'Conversion'],
		clusters: ['morale']
	}
];
