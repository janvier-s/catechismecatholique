import type { Structure, Chapter } from '../../src/lib/data/types.ts';

export interface HeadingEntry {
	/** Display title */
	t: string;
	/** Breadcrumb subtitle (Partie · Section · …) */
	s: string;
	/** Navigation href */
	h: string;
	/** Entry kind for icon/label selection */
	k: 'part' | 'section' | 'chapter' | 'article' | 'heading';
}

export function buildHeadingsIndex(structure: Structure, chapters: Chapter[]): HeadingEntry[] {
	const entries: HeadingEntry[] = [];

	for (const part of structure.parts) {
		const partHref = part.slug === 'prologue' ? '/cec/prologue' : `/cec/${part.slug}`;
		entries.push({ t: part.title, s: '', h: partHref, k: 'part' });

		for (const hd of part.intro_headings ?? []) {
			if (hd.level <= 2)
				entries.push({ t: hd.title, s: part.title, h: `/cec/${hd.paragraph_start}`, k: 'heading' });
		}

		for (const sec of part.sections) {
			entries.push({
				t: sec.title,
				s: part.title,
				h: `/cec/${part.slug}/${sec.slug}`,
				k: 'section'
			});

			for (const hd of sec.intro_headings ?? []) {
				if (hd.level <= 2)
					entries.push({
						t: hd.title,
						s: `${part.title} · ${sec.title}`,
						h: `/cec/${hd.paragraph_start}`,
						k: 'heading'
					});
			}

			for (const ch of sec.chapters) {
				entries.push({
					t: ch.title,
					s: `${part.title} · ${sec.title}`,
					h: `/cec/${part.slug}/${sec.slug}/${ch.slug}`,
					k: 'chapter'
				});
			}
		}
	}

	// Articles and level-2 headings come from the full chapter objects.
	for (const ch of chapters) {
		const { part_slug, section_slug, slug: ch_slug, title: ch_title, section_title } = ch;

		for (const hd of ch.headings) {
			if (hd.level === 2)
				entries.push({ t: hd.title, s: ch_title, h: `/cec/${hd.paragraph_start}`, k: 'heading' });
		}

		for (const art of ch.articles) {
			const artHref = `/cec/${part_slug}/${section_slug}/${ch_slug}/${art.slug}`;
			entries.push({ t: art.title, s: `${section_title} · ${ch_title}`, h: artHref, k: 'article' });

			for (const hd of art.headings) {
				if (hd.level === 2)
					entries.push({
						t: hd.title,
						s: art.title,
						h: `/cec/${hd.paragraph_start}`,
						k: 'heading'
					});
			}
		}
	}

	return entries;
}
