<footer class="site-footer">
	<nav class="footer-nav" aria-label="Navigation du pied de page">
		<a href="/ccc">Catéchisme</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/bible">Bible</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/a-propos">À propos</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/mentions-legales">Mentions légales</a>
	</nav>
	<div class="footer-divider" aria-hidden="true"></div>
	<nav class="footer-nav footer-nav-tools" aria-label="Outils du Catéchisme">
		<a href="/ccc/sommaire">Sommaire</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/ccc/panorama">Panorama</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/glossaire">Glossaire</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/bible">Concordance</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/recherche">Recherche</a>
	</nav>
	<p class="footer-motto">
		<span class="footer-cross" aria-hidden="true">✠</span>
		<span
			>MMXXVI · Pour la plus grande gloire de Dieu · <abbr title="Ad Majorem Dei Gloriam"
				>A.M.D.G.</abbr
			></span
		>
	</p>
	<p class="footer-copy">
		Texte du Catéchisme © Libreria Editrice Vaticana &nbsp;·&nbsp; Bible © 2022 Fraternité de
		Tibériade
	</p>
</footer>

<style>
	.site-footer {
		border-top: 1px solid var(--color-border);
		padding: 2.5rem 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		background: var(--color-bg);
	}

	.footer-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.footer-nav a {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.footer-nav a:hover {
		color: var(--color-accent-text);
	}

	.footer-sep {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		color: var(--color-border);
	}

	/* Hairline rule between primary nav and the tools row. Width matches
	   typical decorative dividers used elsewhere on the site. */
	.footer-divider {
		width: 56px;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 25%, transparent),
			transparent
		);
		margin: 0.15rem 0 0.05rem;
	}

	.footer-nav-tools a {
		color: var(--color-subtle);
		font-size: 0.68rem;
		letter-spacing: 0.1em;
	}
	.footer-nav-tools a:hover {
		color: var(--color-accent-text);
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

	.footer-motto abbr {
		text-decoration: none;
	}

	@media (max-width: 640px) {
		.site-footer {
			gap: 1.25rem;
			padding: 2rem 1rem 1.75rem;
		}
		.footer-nav {
			gap: 0.5rem 0.85rem;
			row-gap: 0.5rem;
		}
		.footer-motto {
			gap: 0.45rem;
		}
		.footer-copy {
			line-height: 1.8;
		}
	}
</style>
