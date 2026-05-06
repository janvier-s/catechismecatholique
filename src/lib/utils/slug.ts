const LIGATURE_MAP: Record<string, string> = {
	œ: 'oe',
	Œ: 'oe',
	æ: 'ae',
	Æ: 'ae'
};

export function slugify(input: string): string {
	let s = input;
	for (const [from, to] of Object.entries(LIGATURE_MAP)) {
		s = s.split(from).join(to);
	}
	s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
	s = s.toLowerCase();
	s = s.replace(/['’ʼ]/g, '');
	s = s.replace(/[^a-z0-9]+/g, '-');
	s = s.replace(/^-+|-+$/g, '');
	return s;
}
