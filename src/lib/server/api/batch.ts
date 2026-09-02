import type { ApiErrorCode } from './http';

export const FIRST = 1;
export const LAST = 2865;
export const MAX_ITEMS = 50;
/** numbers.length × resolved block count, so a wide include on a wide range is refused. */
export const MAX_BLOCK_FETCHES = 100;

export type NumbersResult =
	| { ok: true; numbers: number[] }
	| { ok: false; message: string; code: ApiErrorCode };

function outOfRange(detail: string): NumbersResult {
	return {
		ok: false,
		code: 'paragraph_out_of_range',
		message: `${detail} Le Catéchisme va de ${FIRST} à ${LAST}.`
	};
}

export function parseNumbers(numbers: string | null, range: string | null): NumbersResult {
	let list: number[];

	if (range && range.trim() !== '') {
		const m = range.trim().match(/^(\d+)-(\d+)$/);
		if (!m) return outOfRange(`Plage invalide : « ${range} ». Format attendu : 10-25.`);
		const from = Number(m[1]);
		const to = Number(m[2]);
		if (from > to) return outOfRange(`Plage inversée : « ${range} ».`);
		if (from < FIRST || to > LAST) return outOfRange(`Plage hors limites : « ${range} ».`);
		list = [];
		for (let i = from; i <= to; i++) list.push(i);
	} else if (numbers && numbers.trim() !== '') {
		const parts = numbers
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		list = [];
		for (const p of parts) {
			if (!/^\d+$/.test(p)) return outOfRange(`Numéro invalide : « ${p} ».`);
			const v = Number(p);
			if (v < FIRST || v > LAST) return outOfRange(`Numéro hors limites : ${v}.`);
			list.push(v);
		}
	} else {
		return outOfRange('Indiquez numbers=1,2,3 ou range=10-25.');
	}

	const unique = [...new Set(list)].sort((a, b) => a - b);

	if (unique.length > MAX_ITEMS) {
		return {
			ok: false,
			code: 'too_many_blocks',
			message: `Au plus ${MAX_ITEMS} paragraphes par requête (${unique.length} demandés). Découpez la demande.`
		};
	}

	return { ok: true, numbers: unique };
}
