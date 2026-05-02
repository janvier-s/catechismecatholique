/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				background: 'var(--color-bg)',
				foreground: 'var(--color-fg)',
				panel: 'var(--color-panel)',
				accent: 'var(--color-accent)',
				'accent-text': 'var(--color-accent-text)',
				muted: 'var(--color-muted)',
				subtle: 'var(--color-subtle)',
				border: 'var(--color-border)',
				heading: 'var(--color-heading)'
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
