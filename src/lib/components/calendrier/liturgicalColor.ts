import type { LiturgicalColor } from '$lib/data/types';

export const LITURGICAL_COLOR_HEX: Record<LiturgicalColor, string> = {
	violet: '#5b3a86',
	white: '#c9a227', // gold-leaning: a literal white border reads as "no accent"
	red: '#a4302d',
	green: '#3f6b4a',
	rose: '#c98a9c'
};
