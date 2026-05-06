import { error } from '@sveltejs/kit';
import { loadStructure, loadParagraph } from '$lib/data/loaders';
import type { Structure } from '$lib/data/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const struct = (await loadStructure(fetch)) as Structure;
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
	let next: { href: string; label: string; title: string } | null = firstSec
		? {
				href: `/ccc/${part.slug}/${firstSec.slug}`,
				label: 'Première section →',
				title: firstSec.title
			}
		: null;
	// Sections-less parts (the prologue) jump directly to the next part so
	// the linear reader keeps moving forward.
	if (!next) {
		const nextPart = struct.parts[partIdx + 1];
		if (nextPart) {
			next = {
				href: `/ccc/${nextPart.slug}`,
				label: 'Partie suivante →',
				title: nextPart.title
			};
		}
	}

	return { part, introParagraphs, prev, next };
};
