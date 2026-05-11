/**
 * Registry of the 16 Vatican II documents, ordered by promulgation date.
 * Each entry maps an EPUB filename to a stable slug + display metadata.
 * Three decrees (Apostolicam Actuositatem, Ad Gentes, Presbyterorum Ordinis)
 * are listed without an EPUB file — they're placeholders for when the source
 * is added; until then they're filtered out at build time.
 */

export type VatIIDocKind = 'constitution' | 'declaration' | 'decree';

export interface VatIIDocSpec {
	slug: string;
	abbr: string;
	kind: VatIIDocKind;
	date: string; // ISO YYYY-MM-DD
	title: string; // Latin incipit
	subtitle: string; // French descriptive title
	file: string | null; // EPUB filename relative to scripts/data-sources/vatican-ii/epubs
}

export const VATICAN_II_REGISTRY: VatIIDocSpec[] = [
	{
		slug: 'sacrosanctum-concilium',
		abbr: 'SC',
		kind: 'constitution',
		date: '1963-12-04',
		title: 'Sacrosanctum Concilium',
		subtitle: 'Constitution sur la sainte liturgie',
		file: 'vat-ii_const_1963-12-04_sacrosanctum-concilium_fr.epub'
	},
	{
		slug: 'inter-mirifica',
		abbr: 'IM',
		kind: 'decree',
		date: '1963-12-04',
		title: 'Inter Mirifica',
		subtitle: 'Décret sur les moyens de communication sociale',
		file: 'vat-ii_decree_1963-12-04_inter-mirifica_fr.epub'
	},
	{
		slug: 'lumen-gentium',
		abbr: 'LG',
		kind: 'constitution',
		date: '1964-11-21',
		title: 'Lumen Gentium',
		subtitle: "Constitution dogmatique sur l'Église",
		file: 'vat-ii_const_1964-11-21_lumen-gentium_fr.epub'
	},
	{
		slug: 'orientalium-ecclesiarum',
		abbr: 'OE',
		kind: 'decree',
		date: '1964-11-21',
		title: 'Orientalium Ecclesiarum',
		subtitle: 'Décret sur les Églises orientales catholiques',
		file: 'vat-ii_decree_1964-11-21_orientalium-ecclesiarum_fr.epub'
	},
	{
		slug: 'unitatis-redintegratio',
		abbr: 'UR',
		kind: 'decree',
		date: '1964-11-21',
		title: 'Unitatis Redintegratio',
		subtitle: "Décret sur l'œcuménisme",
		file: 'vat-ii_decree_1964-11-21_unitatis-redintegratio_fr.epub'
	},
	{
		slug: 'christus-dominus',
		abbr: 'CD',
		kind: 'decree',
		date: '1965-10-28',
		title: 'Christus Dominus',
		subtitle: "Décret sur la charge pastorale des évêques dans l'Église",
		file: 'vat-ii_decree_1965-10-28_christus-dominus_fr.epub'
	},
	{
		slug: 'perfectae-caritatis',
		abbr: 'PC',
		kind: 'decree',
		date: '1965-10-28',
		title: 'Perfectae Caritatis',
		subtitle: "Décret sur la rénovation et l'adaptation de la vie religieuse",
		file: 'vat-ii_decree_1965-10-28_perfectae-caritatis_fr.epub'
	},
	{
		slug: 'optatam-totius',
		abbr: 'OT',
		kind: 'decree',
		date: '1965-10-28',
		title: 'Optatam Totius',
		subtitle: 'Décret sur la formation des prêtres',
		file: 'vat-ii_decree_1965-10-28_optatam-totius_fr.epub'
	},
	{
		slug: 'gravissimum-educationis',
		abbr: 'GE',
		kind: 'declaration',
		date: '1965-10-28',
		title: 'Gravissimum Educationis',
		subtitle: "Déclaration sur l'éducation chrétienne",
		file: 'vat-ii_decl_1965-10-28_gravissimum-educationis_fr.epub'
	},
	{
		slug: 'nostra-aetate',
		abbr: 'NA',
		kind: 'declaration',
		date: '1965-10-28',
		title: 'Nostra Aetate',
		subtitle: "Déclaration sur les relations de l'Église avec les religions non chrétiennes",
		file: 'vat-ii_decl_1965-10-28_nostra-aetate_fr.epub'
	},
	{
		slug: 'dei-verbum',
		abbr: 'DV',
		kind: 'constitution',
		date: '1965-11-18',
		title: 'Dei Verbum',
		subtitle: 'Constitution dogmatique sur la révélation divine',
		file: 'vat-ii_const_1965-11-18_dei-verbum_fr.epub'
	},
	{
		slug: 'apostolicam-actuositatem',
		abbr: 'AA',
		kind: 'decree',
		date: '1965-11-18',
		title: 'Apostolicam Actuositatem',
		subtitle: "Décret sur l'apostolat des laïcs",
		file: null
	},
	{
		slug: 'dignitatis-humanae',
		abbr: 'DH',
		kind: 'declaration',
		date: '1965-12-07',
		title: 'Dignitatis Humanae',
		subtitle: 'Déclaration sur la liberté religieuse',
		file: 'vat-ii_decl_1965-12-07_dignitatis-humanae_fr.epub'
	},
	{
		slug: 'ad-gentes',
		abbr: 'AG',
		kind: 'decree',
		date: '1965-12-07',
		title: 'Ad Gentes',
		subtitle: "Décret sur l'activité missionnaire de l'Église",
		file: null
	},
	{
		slug: 'presbyterorum-ordinis',
		abbr: 'PO',
		kind: 'decree',
		date: '1965-12-07',
		title: 'Presbyterorum Ordinis',
		subtitle: 'Décret sur le ministère et la vie des prêtres',
		file: null
	},
	{
		slug: 'gaudium-et-spes',
		abbr: 'GS',
		kind: 'constitution',
		date: '1965-12-07',
		title: 'Gaudium et Spes',
		subtitle: "Constitution pastorale sur l'Église dans le monde de ce temps",
		file: 'vat-ii_const_1965-12-07_gaudium-et-spes_fr.epub'
	}
];
