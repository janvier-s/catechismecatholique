<footer class="site-footer">
	<nav class="footer-cols" aria-label="Navigation du pied de page">
		<div class="footer-col">
			<p class="footer-col-head">Catéchisme</p>
			<ul>
				<li><a href="/ccc">Lire le Catéchisme</a></li>
				<li><a href="/ccc/sommaire">Sommaire</a></li>
				<li><a href="/ccc/panorama">Panorama</a></li>
				<li><a href="/glossaire">Glossaire</a></li>
				<li><a href="/recherche">Recherche</a></li>
			</ul>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Bible</p>
			<ul>
				<li><a href="/bible">Lire la Bible</a></li>
				<li><a href="/bible">Concordance</a></li>
			</ul>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Le site</p>
			<ul>
				<li><a href="/a-propos">À propos</a></li>
				<li><a href="/mentions-legales">Mentions légales</a></li>
			</ul>
		</div>
	</nav>

	<p class="footer-motto">
		<span class="footer-cross" aria-hidden="true">✠</span>
		<span
			>MMXXVI · Pour la plus grande gloire de Dieu ·
			<abbr title="Ad Majorem Dei Gloriam">A.M.D.G.</abbr></span
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
		padding: 3rem 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.75rem;
		background: var(--color-bg);
	}

	.footer-cols {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, auto));
		gap: 2rem clamp(2rem, 6vw, 4rem);
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
