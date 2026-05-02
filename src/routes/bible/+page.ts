import { BOOKS } from '$lib/utils/bibleBookSlug';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const matIdx = BOOKS.findIndex((b) => b.usfx === 'MAT');
	const ot = BOOKS.slice(0, matIdx);
	const nt = BOOKS.slice(matIdx);
	return { ot, nt };
};
