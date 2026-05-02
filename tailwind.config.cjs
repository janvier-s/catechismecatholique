/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				background: 'var(--color-bg)',
				foreground: 'var(--color-fg)',
				accent: 'var(--color-accent)',
				muted: 'var(--color-muted)',
				border: 'var(--color-border)'
			},
			fontFamily: {
				body: 'var(--font-body)',
				ui: 'var(--font-ui)'
			},
			maxWidth: {
				reader: '750px'
			}
		}
	},
	plugins: []
};
