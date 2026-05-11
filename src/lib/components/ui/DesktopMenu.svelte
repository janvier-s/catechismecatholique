<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';

	let open = $state(false);
	let triggerEl: HTMLButtonElement | undefined = $state();
	let panelEl: HTMLElement | undefined = $state();

	function close() {
		open = false;
		queueMicrotask(() => triggerEl?.focus());
	}

	afterNavigate(() => {
		open = false;
	});

	function onDocClick(e: MouseEvent) {
		if (!(e.target instanceof Element)) return;
		if (!e.target.closest('[data-desktop-menu]')) open = false;
	}
	$effect(() => {
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});

	// ESC close + focus trap inside the panel.
	$effect(() => {
		if (!open) return;
		queueMicrotask(() => {
			panelEl?.querySelector<HTMLElement>('a, button')?.focus();
		});
		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				close();
				return;
			}
			if (e.key !== 'Tab' || !panelEl) return;
			const focusables = Array.from(
				panelEl.querySelectorAll<HTMLElement>(
					'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
			);
			if (focusables.length === 0) return;
			const first = focusables[0]!;
			const last = focusables[focusables.length - 1]!;
			const active = document.activeElement;
			if (e.shiftKey && active === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		};
		document.addEventListener('keydown', onKeydown);
		return () => document.removeEventListener('keydown', onKeydown);
	});

	type Link = { href: string; label: string; description: string; eyebrow?: string };
	type Group = { title: string; links: Link[] };
	const groups: Group[] = [
		{
			title: 'Le Catéchisme',
			links: [
				{
					href: '/cec',
					label: 'Lecture intégrale',
					description: 'Les 2 865 paragraphes du Catéchisme.'
				},
				{
					href: '/cec/sommaire',
					label: 'Sommaire',
					description: 'La table des matières complète.'
				},
				{
					href: '/cec/panorama',
					label: 'Panorama',
					description: "Vue d'ensemble en un coup d'œil."
				},
				{
					href: '/recherche',
					label: 'Recherche',
					description: 'Mot, paragraphe ou référence biblique.'
				}
			]
		},
		{
			title: 'Études & outils',
			links: [
				{
					href: '/bible',
					label: 'Concordance biblique',
					description: 'Chaque verset croisé avec le Catéchisme.'
				},
				{
					href: '/glossaire',
					label: 'Glossaire',
					description: 'Les termes théologiques classés par thème.'
				},
				{
					href: '/calendrier',
					label: 'Calendrier liturgique',
					description: 'Le calendrier romain croisé au Catéchisme.'
				},
				{
					href: '/prieres-formules',
					label: 'Prières & Formules',
					description: 'Prières communes et formules de la doctrine Catholique.'
				}
			]
		},
		{
			title: 'Autres catéchismes',
			links: [
				{
					href: '/compendium',
					label: 'Compendium',
					eyebrow: '2005',
					description: 'Le Catéchisme en 598 questions et réponses.'
				},
				{
					href: '/trente',
					label: 'Catéchisme de Trente',
					eyebrow: '1566',
					description: 'Le Catéchisme du Concile de Trente.'
				},
				{
					href: '/grand-catechisme',
					label: 'Grand Catéchisme',
					eyebrow: '1905',
					description: 'Le Grand Catéchisme de saint Pie X en 989 questions.'
				},
				{
					href: '/petit-catechisme',
					label: 'Petit Catéchisme',
					eyebrow: '1912',
					description: 'Le Catéchisme de la Doctrine Chrétienne de Pie X.'
				},
				{
					href: '/catechisme-illustre',
					label: 'Catéchisme illustré',
					eyebrow: '1897',
					description: 'Les vérités nécessaires en 12 leçons illustrées.'
				},
				{
					href: '/doctrine-catholique',
					label: 'La Doctrine Catholique',
					eyebrow: '1927',
					description: 'Abbé Boulenger, 53 leçons en trois tomes.'
				}
			]
		},
		{
			title: 'Magistère',
			links: [
				{
					href: '/vatican-ii',
					label: 'Vatican II',
					eyebrow: '1962–1965',
					description: 'Les seize documents du concile œcuménique.'
				},
				{
					href: '/denzinger',
					label: 'Denzinger',
					eyebrow: 'Enchiridion Symbolorum',
					description: 'Recueil canonique des définitions du Magistère.'
				},
				{
					href: '/doctrine-sociale',
					label: 'Doctrine sociale',
					eyebrow: '2004',
					description: 'Compendium en 583 paragraphes, trois parties.'
				},
				{
					href: '/pgmr',
					label: 'Présentation Générale du Missel Romain',
					eyebrow: '2002',
					description: 'Norme liturgique de la messe romaine en 9 chapitres.'
				},
				{
					href: '/cic/1983',
					label: 'Code de Droit Canonique',
					eyebrow: '1983',
					description: 'Codex Iuris Canonici en vigueur — 1 752 canons.'
				},
				{
					href: '/cic/1917',
					label: 'Code Pio-Benedictin',
					eyebrow: '1917',
					description: "Premier code unifié du droit de l'Église latine."
				}
			]
		}
	];
	const allLinks: Link[] = groups.flatMap((g) => g.links);

	// Active entry: longest matching href (exact match or path-prefix). Returns
	// at most one href so only one row is highlighted on a given page.
	const activeHref = $derived.by(() => {
		const p = page.url.pathname;
		let best: string | null = null;
		for (const link of allLinks) {
			if (link.href === p) return link.href;
			if (p.startsWith(link.href + '/')) {
				if (!best || link.href.length > best.length) best = link.href;
			}
		}
		return best;
	});
</script>

<div class="hidden md:block relative" data-desktop-menu>
	<button
		bind:this={triggerEl}
		type="button"
		class="desktop-menu-trigger {open ? 'is-open' : ''}"
		aria-haspopup="dialog"
		aria-expanded={open}
		aria-controls="desktop-menu-panel"
		aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
		onclick={() => (open = !open)}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 256 256"
			width="20"
			height="20"
			class="burger-icon"
			aria-hidden="true"
		>
			<line
				class="burger-top"
				x1="40"
				y1="64"
				x2="216"
				y2="64"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="16"
			/>
			<line
				class="burger-mid"
				x1="40"
				y1="128"
				x2="216"
				y2="128"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="16"
			/>
			<line
				class="burger-bot"
				x1="40"
				y1="192"
				x2="216"
				y2="192"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="16"
			/>
		</svg>
	</button>

	{#if open}
		<div
			bind:this={panelEl}
			id="desktop-menu-panel"
			class="desktop-menu-panel"
			role="dialog"
			aria-label="Outils et navigation"
			transition:fly={{ y: -6, duration: 160, easing: cubicOut }}
		>
			<div class="menu-grid">
				{#each groups as group (group.title)}
					<section class="menu-col" class:menu-col-featured={group.title === 'Le Catéchisme'}>
						<p class="menu-eyebrow">{group.title}</p>
						<ul class="menu-list">
							{#each group.links as link (link.href)}
								<li>
									<a
										class="menu-row"
										class:is-active={link.href === activeHref}
										href={link.href}
										aria-current={link.href === activeHref ? 'page' : undefined}
										onclick={close}
									>
										{#if link.eyebrow}
											<span class="menu-row-eyebrow">{link.eyebrow}</span>
										{/if}
										<span class="menu-row-label">{link.label}</span>
										<span class="menu-row-desc">{link.description}</span>
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.desktop-menu-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: 0;
		background: transparent;
		color: var(--color-fg);
		cursor: pointer;
		border-radius: 6px;
		transition:
			background-color 120ms ease,
			color 120ms ease;
	}
	.desktop-menu-trigger:hover {
		color: var(--color-accent);
	}
	.desktop-menu-trigger.is-open {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
	}
	/* Hamburger ↔ X morph: top and bottom bars rotate around the icon's
	   centre to cross at the middle, while the middle bar fades out.
	   Use transform-box: fill-box so transform-origin coordinates are
	   relative to each line's own bounding box (50% 50% = its midpoint),
	   then translate the midpoint to the SVG centre and rotate. */
	.burger-top,
	.burger-mid,
	.burger-bot {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 160ms ease;
	}
	.desktop-menu-trigger.is-open .burger-top {
		transform: translateY(64px) rotate(45deg);
	}
	.desktop-menu-trigger.is-open .burger-mid {
		opacity: 0;
	}
	.desktop-menu-trigger.is-open .burger-bot {
		transform: translateY(-64px) rotate(-45deg);
	}
	.desktop-menu-panel {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		width: min(1040px, calc(100vw - 2rem));
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 1rem 0.75rem;
		z-index: var(--z-dropdown);
	}
	.menu-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		grid-template-rows: auto repeat(6, 1fr);
		gap: 0.4rem 0;
	}
	.menu-col {
		display: grid;
		grid-template-rows: subgrid;
		grid-row: 1 / -1;
		min-width: 0;
		padding: 0 0.6rem;
		position: relative;
	}
	/* Hairline separators between columns — gradient-fade like the
	   Catéchisme dropdown. */
	.menu-col + .menu-col::before {
		content: '';
		position: absolute;
		top: 0.4rem;
		bottom: 0.4rem;
		left: 0;
		width: 1px;
		background: linear-gradient(
			to bottom,
			transparent,
			color-mix(in srgb, var(--color-fg) 14%, transparent) 20%,
			color-mix(in srgb, var(--color-fg) 14%, transparent) 80%,
			transparent
		);
		pointer-events: none;
	}
	.menu-col-featured .menu-eyebrow {
		color: var(--color-accent);
	}
	.menu-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.55rem;
		padding-left: 0.85rem;
	}
	.menu-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: contents;
	}
	.menu-list > li {
		min-width: 0;
		display: flex;
	}
	.menu-list > li > .menu-row {
		flex: 1;
	}
	.menu-row {
		display: block;
		padding: 0.45rem 0.85rem;
		text-decoration: none;
		color: var(--color-fg);
		border-left: 2px solid transparent;
		border-radius: 0 4px 4px 0;
		transition:
			border-color 120ms ease,
			background-color 120ms ease,
			color 120ms ease;
	}
	.menu-row:hover {
		border-left-color: var(--color-accent);
		color: var(--color-accent-text);
	}
	.menu-row.is-active {
		border-left-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
	.menu-row.is-active .menu-row-label {
		color: var(--color-accent);
	}
	.menu-row-eyebrow {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
		margin-bottom: 0.15rem;
	}
	.menu-row.is-active .menu-row-eyebrow {
		color: color-mix(in srgb, var(--color-accent) 70%, var(--color-muted));
	}
	.menu-row-label {
		display: block;
		font-family: var(--font-heading);
		font-size: 0.95rem;
		font-weight: 600;
		color: inherit;
	}
	.menu-row-desc {
		display: block;
		font-family: var(--font-body);
		font-size: 0.76rem;
		line-height: 1.4;
		color: var(--color-subtle);
		margin-top: 0.1rem;
	}
</style>
