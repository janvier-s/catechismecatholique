<footer class="site-footer">
	<nav class="footer-nav" aria-label="Navigation du pied de page">
		<a href="/ccc">Catéchisme</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/bible">Bible</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/glossaire">Glossaire</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/a-propos">À propos</a>
		<span class="footer-sep" aria-hidden="true">·</span>
		<a href="/mentions-legales">Mentions légales</a>
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
		Tibériade (CC BY-SA 4.0)
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
		color: var(--color-subtle);
		opacity: 0.7;
		margin: 0;
		text-align: center;
		line-height: 1.6;
	}
</style>
