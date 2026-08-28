import type { LiturgicalColor } from '$lib/data/types';

// CSS custom-property names, tuned per theme in app.css, so the accent stays
// legible in both light and dark themes instead of one hex value for all.
export const LITURGICAL_COLOR_VAR: Record<LiturgicalColor, string> = {
	violet: '--liturgical-violet',
	white: '--liturgical-white', // gold-leaning: a literal white border reads as "no accent"
	red: '--liturgical-red',
	green: '--liturgical-green',
	rose: '--liturgical-rose'
};
