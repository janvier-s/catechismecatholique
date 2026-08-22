export interface FontDef {
	id: string;
	label: string;
	stack: string;
	dividerBefore?: boolean;
}

export const FONTS: FontDef[] = [
	{
		id: 'libre-baskerville',
		label: 'Libre Baskerville',
		stack: "'Libre Baskerville', Georgia, serif"
	},
	{ id: 'sentinel', label: 'Sentinel', stack: "'Sentinel', Georgia, serif" },
	{
		id: 'source-serif-4',
		label: 'Source Serif',
		stack: "'Source Serif 4', Georgia, serif"
	},
	{
		id: 'libre-franklin',
		label: 'Libre Franklin',
		stack: "'Libre Franklin', sans-serif",
		dividerBefore: true
	},
	{
		id: 'proxima-nova',
		label: 'Proxima Nova',
		stack: "'Proxima Nova', sans-serif"
	},
	{
		id: 'noto-sans',
		label: 'Noto Sans',
		stack: "'Noto Sans', sans-serif"
	}
];

export const DYSLEXIA_FONT: FontDef = {
	id: 'grace',
	label: 'Grace Dyslexic MD',
	stack: "'Grace Dyslexic MD', sans-serif"
};

export const DEFAULT_FONT_ID = 'proxima-nova';

export function getFontById(id: string): FontDef | undefined {
	if (id === DYSLEXIA_FONT.id) return DYSLEXIA_FONT;
	return FONTS.find((f) => f.id === id);
}
