import { error } from '@sveltejs/kit';
import { loadStructure, loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

interface Heading {
	id: string;
	level: number;
	title: string;
	paragraph_start: number;
}
interface Section {
	slug: string;
	title: string;
	number?: number;
	chapters: { slug: string }[];
	articles_direct?: { slug: string }[];
}
interface Part {
	slug: string;
	title: string;
	number?: number;
	sections: Section[];
	intro_paragraphs?: number[];
	intro_headings?: Heading[];
}
interface Struct {
	parts: Part[];
}

export const load: PageLoad = async ({ params, fetch }) => {
	const struct = (await loadStructure(fetch)) as Struct;
	const part = struct.parts.find((p) => p.slug === params.part);
	if (!part) throw error(404, 'Partie introuvable');

	// Pre-load any part-level intro paragraphs (Part 2's "Pourquoi la
	// Liturgie?" §§1066-1075, Part 3's §§1691-1698) so the page renders
	// them inline above the section list.
	const introNumbers = part.intro_paragraphs ?? [];
	const introParagraphs = await Promise.all(introNumbers.map((n) => loadParagraph(n, fetch)));

	// Linear navigation: prev = last chapter of previous part, next = first
	// section of THIS part (so the reader keeps moving through the catechism).
	const partIdx = struct.parts.findIndex((p) => p.slug === part.slug);
	let prev: { href: string; label: string; title: string } | null = null;
	for (let i = partIdx - 1; i >= 0; i--) {
		const p = struct.parts[i]!;
		const lastSec = p.sections[p.sections.length - 1];
		const lastChap = lastSec?.chapters[lastSec.chapters.length - 1];
		if (lastChap) {
			prev = {
				href: `/ccc/${p.slug}/${lastSec!.slug}/${lastChap.slug}`,
				label: '← Chapitre précédent',
				title: p.title
			};
			break;
		}
		if (p.slug === 'prologue') {
			prev = { href: '/ccc/prologue', label: '← Prologue', title: 'Prologue' };
			break;
		}
	}
	const firstSec = part.sections[0] ?? null;
	const next = firstSec
		? {
				href: `/ccc/${part.slug}/${firstSec.slug}`,
				label: 'Première section →',
				title: firstSec.title
			}
		: null;

	return { part, introParagraphs, prev, next };
};
