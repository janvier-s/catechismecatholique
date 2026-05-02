import { bookBySlug } from '$lib/utils/bibleBookSlug';
export const match = (param: string) => Boolean(bookBySlug(param));
