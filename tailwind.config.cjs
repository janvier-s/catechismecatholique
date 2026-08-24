/** @type {import('tailwindcss').Config} */

// Theme colors are plain hex custom properties (--color-subtle: #5e5650),
// not the R,G,B-triplet form Tailwind's own opacity machinery expects · so
// `text-subtle/40` etc. generated no CSS rule at all and silently fell back
// to inherited color. color-mix() works with any valid CSS color, hex
// included, so this restores opacity modifiers without touching every
// theme's variable definitions.
//
// Tailwind calls this function for every color utility, not just ones with
// an explicit /NN modifier: plain `bg-background` still passes
// opacityValue: 'var(--tw-bg-opacity, 1)' (a CSS variable reference, not a
// number) so it can support the legacy bg-opacity-* utilities. Multiplying
// that string by 100 produces NaN, so the percentage must be built with
// calc() to work for both the numeric (explicit modifier) and CSS-var
// (implicit) cases.
function withOpacity(varName) {
	return ({ opacityValue }) =>
		opacityValue === undefined
			? `var(${varName})`
			: `color-mix(in srgb, var(${varName}) calc(${opacityValue} * 100%), transparent)`;
}

module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				background: withOpacity('--color-bg'),
				foreground: withOpacity('--color-fg'),
				panel: withOpacity('--color-panel'),
				accent: withOpacity('--color-accent'),
				'accent-text': withOpacity('--color-accent-text'),
				muted: withOpacity('--color-muted'),
				subtle: withOpacity('--color-subtle'),
				border: withOpacity('--color-border'),
				heading: withOpacity('--color-heading')
			},
			fontFamily: {
				body: 'var(--font-body)',
				ui: 'var(--font-ui)',
				heading: 'var(--font-heading)'
			},
			maxWidth: {
				reader: '750px'
			}
		}
	},
	plugins: []
};
