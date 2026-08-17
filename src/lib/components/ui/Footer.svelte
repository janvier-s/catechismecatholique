<script lang="ts">
	import { corporaInNavGroup } from '$lib/corpora';

	const catechismes = $derived(
		(() => {
			const base = corporaInNavGroup('catechismes')
				.filter((c) => c.id !== 'compendium')
				.map((c) => ({ href: c.entryHref ?? c.urlPrefix, title: c.title }));
			const ibpEntry = { href: '/bon-pasteur', title: 'Institut du Bon Pasteur' };
			const idx = base.findIndex((c) => c.href === '/grand-catechisme');
			if (idx === -1) return [...base, ibpEntry];
			return [...base.slice(0, idx + 1), ibpEntry, ...base.slice(idx + 1)];
		})()
	);
	const catechese = $derived(corporaInNavGroup('catechese'));
	// Magistère column · explicit order: Vatican II · Enchiridion · Documents
	// pontificaux · Code Pio-Benedictin (1917) · CIC · PGMR. The 1917 code
	// has no CorpusRecord and is inserted inline.
	const magistere = $derived(
		(() => {
			// Keyed by urlPrefix (the stable registry key) while the link itself
			// uses entryHref, so the CIC entry lands on /cic/1983 rather than the
			// two-code picker it sits next to.
			const reg = new Map(
				corporaInNavGroup('magistere').map(
					(c) => [c.urlPrefix, { href: c.entryHref ?? c.urlPrefix, title: c.title }] as const
				)
			);
			return [
				reg.get('/vatican-ii'),
				reg.get('/enchiridion'),
				reg.get('/documents-pontificaux'),
				{ href: '/cic/1917', title: 'Code Pio-Benedictin (1917)' },
				reg.get('/cic'),
				reg.get('/pgmr')
			].filter((l): l is { href: string; title: string } => !!l);
		})()
	);
</script>

<footer class="site-footer">
	<nav class="footer-cols" aria-label="Navigation du pied de page">
		<div class="footer-col">
			<p class="footer-col-head">Le Catéchisme</p>
			<ul>
				<li><a href="/cec">Lecture intégrale</a></li>
				<li><a href="/compendium">Compendium</a></li>
				<li><a href="/cec/sommaire">Sommaire</a></li>
				<li><a href="/cec/panorama">Panorama</a></li>
				<li><a href="/recherche">Recherche</a></li>
			</ul>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Études & outils</p>
			<ul>
				<li><a href="/bible">Lire la Bible</a></li>
				<li><a href="/bible">Concordance biblique</a></li>
				<li><a href="/glossaire">Glossaire</a></li>
				<li><a href="/calendrier">Calendrier liturgique</a></li>
				<li><a href="/prieres-formules">Prières & Formules</a></li>
			</ul>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Catéchismes</p>
			<ul>
				{#each catechismes as c (c.href)}
					<li><a href={c.href}>{c.title}</a></li>
				{/each}
			</ul>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Catéchèse &amp; doctrine</p>
			<ul>
				{#each catechese as c (c.id)}
					<li><a href={c.entryHref ?? c.urlPrefix}>{c.title}</a></li>
				{/each}
			</ul>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Magistère</p>
			<ul>
				{#each magistere as c (c.href)}
					<li><a href={c.href}>{c.title}</a></li>
				{/each}
			</ul>
		</div>
	</nav>

	<nav class="footer-meta" aria-label="Pages secondaires">
		<a href="/bibliotheque">Bibliothèque</a>
		<span aria-hidden="true">·</span>
		<a href="/a-propos">À propos</a>
		<span aria-hidden="true">·</span>
		<a href="/mentions-legales">Mentions légales</a>
	</nav>

	<p class="footer-motto">
		<span class="footer-cross" aria-hidden="true">✠</span>
		<span>
			MMXXVI · Pour la plus grande gloire de Dieu ·
			<button type="button" class="amdg" aria-label="Ad Maiorem Dei Gloriam">
				<abbr>A.M.D.G.</abbr>
				<span class="amdg-tip" role="tooltip">Ad Maiorem Dei Gloriam</span>
			</button>
		</span>
	</p>
	<p class="footer-copy">
		Texte du Catéchisme © 1997
		<a
			href="https://www.vatican.va/roman_curia/institutions_connected/lev/index_it.htm"
			target="_blank"
			rel="noopener noreferrer">Libreria Editrice Vaticana</a
		>
		&nbsp;·&nbsp; Bible © 2022
		<a href="https://www.tiberiade.be/" target="_blank" rel="noopener noreferrer"
			>Fraternité de Tibériade</a
		>
	</p>
</footer>

<style>
	.site-footer {
		border-top: 1px solid var(--color-border);
		padding: 3rem 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.75rem;
		background: var(--color-bg);
	}

	.footer-cols {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 2rem clamp(1rem, 2vw, 2rem);
		max-width: 76rem;
		width: 100%;
		text-align: left;
	}

	.footer-col-head {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.65rem;
	}

	.footer-col ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.footer-col a {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}
	.footer-col a:hover {
		color: var(--color-accent-text);
	}

	/* Secondary nav row: À propos · Mentions légales. Sits on its own
	   line below the column nav, separated by a hairline rule. */
	.footer-meta {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		max-width: 64rem;
		padding-top: 1.25rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		color: var(--color-muted);
	}
	.footer-meta a {
		color: inherit;
		text-decoration: none;
		transition: color 140ms ease;
	}
	.footer-meta a:hover {
		color: var(--color-accent);
	}

	.footer-motto {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-subtle);
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 0;
	}

	.footer-cross {
		color: var(--color-accent);
		font-size: 0.8rem;
	}

	.footer-copy {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		color: var(--color-muted);
		margin: 0;
		text-align: center;
		line-height: 1.6;
	}

	.footer-copy a {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.footer-copy a:hover {
		color: var(--color-text);
	}

	.footer-motto abbr {
		text-decoration: none;
	}

	.amdg {
		position: relative;
		display: inline-block;
		cursor: help;
		border: 0;
		border-bottom: 1px dotted color-mix(in srgb, var(--color-fg) 35%, transparent);
		background: transparent;
		padding: 0;
		color: inherit;
		font: inherit;
		letter-spacing: inherit;
		outline: none;
	}
	.amdg-tip {
		position: absolute;
		left: 50%;
		bottom: calc(100% + 0.5rem);
		transform: translateX(-50%);
		white-space: nowrap;
		padding: 0.45rem 0.75rem;
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 0.85rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		background: var(--color-panel);
		color: var(--color-fg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		box-shadow: 0 4px 14px color-mix(in srgb, var(--color-fg) 12%, transparent);
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 140ms ease,
			transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
		transform: translateX(-50%) translateY(4px);
	}
	.amdg:hover .amdg-tip,
	.amdg:focus-visible .amdg-tip {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}

	@media (max-width: 1100px) {
		.footer-cols {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			max-width: 44rem;
		}
	}
	@media (max-width: 720px) {
		.footer-cols {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			max-width: 32rem;
		}
	}

	@media (max-width: 640px) {
		.site-footer {
			gap: 1.5rem;
			padding: 2.25rem 1rem 1.75rem;
		}
		.footer-cols {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1.5rem 1.5rem;
			width: 100%;
			max-width: 24rem;
		}
		.footer-motto {
			gap: 0.45rem;
		}
		.footer-copy {
			line-height: 1.8;
		}
	}
</style>
