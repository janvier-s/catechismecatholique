/**
 * Curated "what's actually inside" entry points for the CCC landing page.
 *
 * The landing page used to describe each part abstractly ("Ce que l'Église
 * croit") and offer two or three hand-picked links. A reader who doesn't
 * already know the Catechism's shape has no way to guess that the sacrament of
 * marriage is in part two — so they stall on the front door. These lists answer
 * "what is in here?" with nouns a visitor recognises: le baptême, la
 * confession, le mariage, les Dix commandements.
 *
 * Only the *label and the slug path* are curated. The href and the paragraph
 * range are resolved from `structure-toc.json` at render time, so a renamed
 * slug can't leave a plausible-looking dead link behind, and the ranges can't
 * drift out of step with the corpus the way the previous hardcoded strings
 * could. `cecTopics.test.ts` fails loudly if a path stops resolving.
 */

type Range = { from: number; to: number };
/**
 * One structure node. Every level of the tree carries the same three fields and
 * differs only in which child array it holds, so a single permissive type lets
 * `resolveTopic` walk part → section → chapter → article without a cast per
 * level. Only the fields this module reads are declared.
 */
type Node = {
	slug: string;
	title?: string;
	range?: Range;
	prologue?: boolean;
	sections?: Node[];
	chapters?: Node[];
	articles?: Node[];
	articles_direct?: Node[];
};
export type TopicStructure = { parts: Node[] };

/** A curated entry: the words a visitor recognises, plus where it lives. */
export type TopicSpec = { label: string; path: string[] };
/** A resolved entry, ready to render. */
export type Topic = { label: string; href: string; range: Range | undefined };

/**
 * Paths are slug chains: part / section / chapter / article. Section-level
 * `articles_direct` are included: they have no route of their own and 307 to
 * the paragraph-range view, which costs one server-side hop but lands the
 * reader on the right text. Worth it for the two best-known entries in part
 * four — "Qu'est-ce que la prière ?" and "Les sept demandes".
 *
 * Counts are kept close to even across the four parts so no card in a row
 * shows a block of dead space. Equal card *height* is the grid's job, not
 * this list's — part titles wrap to different line counts, so matching the
 * number of links here could never guarantee it on its own.
 */
export const CEC_TOPICS: Record<string, TopicSpec[]> = {
	'1-profession-de-la-foi': [
		{
			label: 'La révélation et la sainte Écriture',
			path: ['1-je-crois-nous-croyons', '2-dieu-a-la-rencontre-de-lhomme', '3-sainte-ecriture']
		},
		{
			label: 'Dieu le Père et la création',
			path: [
				'2-profession-de-la-foi',
				'1-je-crois-en-dieu-le-pere',
				'1-je-crois-en-dieu-le-pere-tout'
			]
		},
		{
			label: 'Jésus-Christ, Fils unique de Dieu',
			path: ['2-profession-de-la-foi', '2-je-crois-en-jesus-christ']
		},
		{
			label: "L'Esprit Saint",
			path: ['2-profession-de-la-foi', '3-je-crois-en-lesprit-saint', '8-je-crois-en-lesprit-saint']
		},
		{
			label: "L'Église",
			path: [
				'2-profession-de-la-foi',
				'3-je-crois-en-lesprit-saint',
				'9-je-crois-a-la-sainte-eglise'
			]
		},
		{
			label: 'Le pardon des péchés',
			path: [
				'2-profession-de-la-foi',
				'3-je-crois-en-lesprit-saint',
				'10-je-crois-au-pardon-des-peches'
			]
		},
		{
			label: 'La résurrection de la chair',
			path: [
				'2-profession-de-la-foi',
				'3-je-crois-en-lesprit-saint',
				'11-je-crois-a-la-resurrection'
			]
		},
		{
			label: 'La vie éternelle',
			path: [
				'2-profession-de-la-foi',
				'3-je-crois-en-lesprit-saint',
				'12-je-crois-a-la-vie-eternelle'
			]
		}
	],
	'2-celebration-du-mystere': [
		{
			label: 'La liturgie et la messe',
			path: ['1-leconomie-sacramentelle', '2-celebration-sacramentelle', '1-celebrer-la-liturgie']
		},
		{
			label: 'Le baptême',
			path: [
				'2-sept-sacrements-de-leglise',
				'1-sacrements-de-linitiation',
				'1-sacrement-du-bapteme'
			]
		},
		{
			label: 'La confirmation',
			path: [
				'2-sept-sacrements-de-leglise',
				'1-sacrements-de-linitiation',
				'2-sacrement-de-la-confirmation'
			]
		},
		{
			label: "L'Eucharistie",
			path: [
				'2-sept-sacrements-de-leglise',
				'1-sacrements-de-linitiation',
				'3-sacrement-de-leucharistie'
			]
		},
		{
			label: 'La confession',
			path: [
				'2-sept-sacrements-de-leglise',
				'2-sacrements-de-guerison',
				'4-sacrement-de-la-penitence'
			]
		},
		{
			label: 'Le sacrement des malades',
			path: ['2-sept-sacrements-de-leglise', '2-sacrements-de-guerison', '5-lonction-des-malades']
		},
		{
			label: 'Le sacrement de l’ordre',
			path: ['2-sept-sacrements-de-leglise', '3-sacrements-du-service', '6-sacrement-de-lordre']
		},
		{
			label: 'Le mariage',
			path: ['2-sept-sacrements-de-leglise', '3-sacrements-du-service', '7-sacrement-du-mariage']
		}
	],
	'3-vie-dans-le-christ': [
		{
			label: 'La dignité de la personne humaine',
			path: ['1-vocation-de-lhomme-la-vie', '1-dignite-de-la-personne-humaine']
		},
		{
			label: 'La liberté et la conscience',
			path: [
				'1-vocation-de-lhomme-la-vie',
				'1-dignite-de-la-personne-humaine',
				'6-conscience-morale'
			]
		},
		{
			label: 'Les vertus',
			path: ['1-vocation-de-lhomme-la-vie', '1-dignite-de-la-personne-humaine', '7-vertus']
		},
		{
			label: 'Le péché',
			path: ['1-vocation-de-lhomme-la-vie', '1-dignite-de-la-personne-humaine', '8-peche']
		},
		{
			label: 'La justice sociale',
			path: ['1-vocation-de-lhomme-la-vie', '2-communaute-humaine', '3-justice-sociale']
		},
		{
			label: 'La loi morale',
			path: ['1-vocation-de-lhomme-la-vie', '3-salut-de-dieu-la-loi', '1-loi-morale']
		},
		{
			label: 'La grâce et la justification',
			path: ['1-vocation-de-lhomme-la-vie', '3-salut-de-dieu-la-loi', '2-grace-et-justification']
		},
		{ label: 'Les Dix commandements', path: ['2-dix-commandements'] }
	],
	'4-priere-chretienne': [
		{
			label: "Qu'est-ce que la prière ?",
			path: ['1-priere-dans-la-vie-chretienne', 'quest-ce-que-la-priere']
		},
		{
			label: "L'appel à la prière",
			path: ['1-priere-dans-la-vie-chretienne', '1-revelation-de-la-priere-lappel']
		},
		{
			label: 'La tradition de la prière',
			path: ['1-priere-dans-la-vie-chretienne', '2-tradition-de-la-priere']
		},
		{
			label: 'Les expressions de la prière',
			path: ['1-priere-dans-la-vie-chretienne', '3-vie-de-priere', '1-expressions-de-la-priere']
		},
		{
			label: 'Le combat de la prière',
			path: ['1-priere-dans-la-vie-chretienne', '3-vie-de-priere', '2-combat-de-la-priere']
		},
		{ label: 'Le Notre Père', path: ['2-priere-du-seigneur-notre-pere'] },
		{
			label: 'Les sept demandes',
			path: ['2-priere-du-seigneur-notre-pere', '3-sept-demandes']
		}
	]
};

/** Children of a structure node, whatever level it sits at. */
function childrenOf(node: Node): Node[] {
	return [
		...(node.sections ?? []),
		...(node.chapters ?? []),
		...(node.articles ?? []),
		...(node.articles_direct ?? [])
	];
}

/**
 * Walk `path` down from `partSlug` and return the node's href + range.
 * Returns null when any slug in the chain is missing, so a stale curated
 * entry disappears rather than rendering a 404 link.
 */
export function resolveTopic(
	structure: TopicStructure | null,
	partSlug: string,
	spec: TopicSpec
): Topic | null {
	if (!structure) return null;
	const part = structure.parts.find((p) => p.slug === partSlug);
	if (!part) return null;
	let node: Node = part;
	for (const slug of spec.path) {
		const next = childrenOf(node).find((c) => c.slug === slug);
		if (!next) return null;
		node = next;
	}
	return {
		label: spec.label,
		href: `/cec/${partSlug}/${spec.path.join('/')}`,
		range: node.range
	};
}

/** Every curated topic for a part that still resolves against the corpus. */
export function topicsForPart(structure: TopicStructure | null, partSlug: string): Topic[] {
	const specs = CEC_TOPICS[partSlug] ?? [];
	return specs
		.map((s) => resolveTopic(structure, partSlug, s))
		.filter((t): t is Topic => t !== null);
}
