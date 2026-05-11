<footer class="site-footer">
	<nav class="footer-cols" aria-label="Navigation du pied de page">
		<div class="footer-col">
			<p class="footer-col-head">Catéchisme</p>
			<ul>
				<li><a href="/cec">Lire le Catéchisme</a></li>
				<li><a href="/cec/sommaire">Sommaire</a></li>
				<li><a href="/cec/panorama">Panorama</a></li>
				<li><a href="/glossaire">Glossaire</a></li>
				<li><a href="/recherche">Recherche</a></li>
			</ul>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Autres catéchismes</p>
			<ul>
				<li><a href="/compendium">Compendium</a></li>
				<li><a href="/trente">Catéchisme de Trente</a></li>
				<li><a href="/grand-catechisme">Grand Catéchisme</a></li>
				<li><a href="/petit-catechisme">Petit Catéchisme</a></li>
				<li><a href="/catechisme-illustre">Catéchisme illustré</a></li>
				<li><a href="/doctrine-catholique">La Doctrine Catholique</a></li>
				<li><a href="/denzinger">Denzinger</a></li>
				<li><a href="/doctrine-sociale">Doctrine sociale</a></li>
				<li><a href="/pgmr">Présentation Générale du Missel Romain</a></li>
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
		<span>
			MMXXVI · Pour la plus grande gloire de Dieu ·
			<span class="amdg" tabindex="0">
				<abbr>A.M.D.G.</abbr>
				<span class="amdg-tip" role="tooltip">Ad Maiorem Dei Gloriam</span>
			</span>
		</span>
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
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 2rem clamp(1.5rem, 3vw, 3rem);
		max-width: 64rem;
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

	.amdg {
		position: relative;
		display: inline-block;
		cursor: help;
		border-bottom: 1px dotted color-mix(in srgb, var(--color-fg) 35%, transparent);
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

	@media (max-width: 960px) {
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
