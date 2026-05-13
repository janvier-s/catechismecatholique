<script lang="ts">
	import { fade, fly } from 'svelte/transition';
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
	function toggle() {
		open = !open;
	}

	afterNavigate(() => {
		open = false;
	});

	// Esc + focus trap inside the panel.
	$effect(() => {
		if (!open) return;
		queueMicrotask(() => {
			panelEl?.querySelector<HTMLElement>('a, button')?.focus();
		});
		const onKey = (e: KeyboardEvent) => {
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
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});

	// Lock the page scroll behind the open drawer.
	$effect(() => {
		if (typeof document === 'undefined') return;
		if (!open) return;
		const html = document.documentElement;
		const prev = html.style.overflow;
		html.style.overflow = 'hidden';
		return () => {
			html.style.overflow = prev;
		};
	});

	import { corporaInNavGroup } from '$lib/corpora';

	type Link = { href: string; label: string; description?: string; eyebrow?: string };
	type Group = { title: string; links: Link[]; mobileOnly?: boolean };

	function fromRegistry(group: 'catechismes' | 'catechese' | 'magistere'): Link[] {
		return corporaInNavGroup(group).map((c) => ({
			href: c.urlPrefix,
			label: c.title,
			eyebrow: c.eyebrow
		}));
	}

	function withInsertAfter(links: Link[], afterHref: string, extra: Link): Link[] {
		const idx = links.findIndex((l) => l.href === afterHref);
		if (idx === -1) return [...links, extra];
		return [...links.slice(0, idx + 1), extra, ...links.slice(idx + 1)];
	}

	const groups: Group[] = [
		{
			title: 'Lecture',
			mobileOnly: true,
			links: [
				{
					href: '/cec',
					label: "Catéchisme de l'Église Catholique",
					description: 'Les 2865 paragraphes du Catéchisme.'
				},
				{
					href: '/bible',
					label: 'Bible',
					description: 'Texte intégral, croisé verset par verset avec le Catéchisme.'
				},
				{
					href: '/bibliotheque',
					label: 'Bibliothèque',
					description: 'Tous les textes hébergés sur le site.'
				}
			]
		},
		{
			title: 'Études & outils',
			links: [
				{
					href: '/recherche',
					label: 'Recherche',
					description: 'Mot, paragraphe ou référence biblique.'
				},
				{
					href: '/glossaire',
					label: 'Glossaire',
					description: 'Les termes théologiques classés par thème.'
				},
				{
					href: '/bible',
					label: 'Concordance biblique',
					description: 'Chaque verset croisé avec le Catéchisme.'
				},
				{
					href: '/calendrier',
					label: 'Calendrier liturgique',
					description: 'Le calendrier romain croisé au Catéchisme.'
				},
				{
					href: '/prieres-formules',
					label: 'Prières & Formules',
					description: 'Prières communes et formules de la doctrine catholique.'
				}
			]
		},
		{
			title: 'Catéchismes',
			links: withInsertAfter(fromRegistry('catechismes'), '/grand-catechisme', {
				href: '/bon-pasteur',
				label: 'Institut du Bon Pasteur'
			})
		},
		{ title: 'Catéchèse & doctrine', links: fromRegistry('catechese') },
		{
			title: 'Magistère',
			// Custom order: Vatican II · Enchiridion · Encycliques (new) · Code
			// Pio-Benedictin · Code de Droit Canonique · PGMR. CIC 1917 and
			// Encycliques have no CorpusRecord, so they're inserted inline.
			links: (() => {
				const reg = new Map(fromRegistry('magistere').map((l) => [l.href, l] as const));
				return [
					reg.get('/vatican-ii'),
					reg.get('/enchiridion'),
					{ href: '/encycliques', label: 'Encycliques' },
					{ href: '/cic/1917', label: 'Code Pio-Benedictin', eyebrow: '1917' },
					reg.get('/cic'),
					reg.get('/pgmr')
				].filter((l): l is Link => !!l);
			})()
		}
	];

	const allLinks: Link[] = groups.flatMap((g) => g.links);

	// Longest-match active entry across all groups.
	const activeHref = $derived.by(() => {
		const p: string = page.url.pathname;
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

<button
	bind:this={triggerEl}
	type="button"
	class="drawer-trigger {open ? 'is-open' : ''}"
	aria-haspopup="dialog"
	aria-expanded={open}
	aria-controls="nav-drawer"
	aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
	onclick={toggle}
>
	<span class="bars" class:is-open={open} aria-hidden="true">
		<span class="bar b1"></span>
		<span class="bar b2"></span>
		<span class="bar b3"></span>
	</span>
</button>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={close} transition:fade={{ duration: 160, easing: cubicOut }}></div>

	<div
		bind:this={panelEl}
		id="nav-drawer"
		class="drawer"
		role="dialog"
		aria-modal="true"
		aria-label="Navigation"
		transition:fly={{ x: 360, duration: 240, easing: cubicOut }}
	>
		<nav class="body styled-scroll" aria-label="Sections">
			{#each groups as group (group.title)}
				<section
					class="group"
					class:group-tools={group.title === 'Études & outils'}
					class:group-mobile-only={group.mobileOnly}
				>
					<p class="group-eyebrow">{group.title}</p>
					<ul class="links">
						{#each group.links as link (link.href)}
							<li>
								<a
									class="link"
									class:is-active={link.href === activeHref}
									href={link.href}
									aria-current={link.href === activeHref ? 'page' : undefined}
								>
									<span class="link-body">
										<span class="link-label">{link.label}</span>
										{#if link.description}
											<span class="link-desc">{link.description}</span>
										{/if}
									</span>
									{#if link.eyebrow}
										<span class="link-eyebrow">{link.eyebrow}</span>
									{/if}
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</nav>

		<footer class="foot">
			<a href="/a-propos">À propos</a>
			<span aria-hidden="true">·</span>
			<a href="/mentions-legales">Mentions légales</a>
		</footer>
	</div>
{/if}

<style>
	/* Trigger: editorial hairline hamburger, no fill. */
	.drawer-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--color-fg);
		cursor: pointer;
		flex: 0 0 auto;
		border-radius: 6px;
		transition: color 140ms ease;
	}
	.drawer-trigger:hover,
	.drawer-trigger.is-open {
		color: var(--color-accent);
	}
	.bars {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		width: 22px;
		height: 22px;
		position: relative;
	}
	.bar {
		display: block;
		width: 100%;
		height: 1.5px;
		background: currentColor;
		border-radius: 1px;
		transform-origin: center;
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 160ms ease;
	}
	.bars.is-open .b1 {
		transform: translateY(6.5px) rotate(45deg);
	}
	.bars.is-open .b2 {
		opacity: 0;
		transform: scaleX(0.4);
	}
	.bars.is-open .b3 {
		transform: translateY(-6.5px) rotate(-45deg);
	}

	/* Backdrop sits below the topbar (so it doesn't dim the bar itself).
	   Always dim toward black so dark themes don't get a *lighter* scrim
	   from `color-mix` on `--color-fg`. */
	.backdrop {
		position: fixed;
		inset: var(--topbar-height, 80px) 0 0 0;
		background: rgba(0, 0, 0, 0.42);
		backdrop-filter: blur(2px);
		z-index: calc(var(--z-modal) - 1);
	}

	/* Right-side drawer panel.
	   - Desktop: 380 px fixed width
	   - Mobile: full-width sheet
	   Anchored just below the topbar so the bar stays visible. */
	.drawer {
		position: fixed;
		top: var(--topbar-height, 80px);
		right: 0;
		bottom: 0;
		width: min(380px, 100vw);
		background: var(--color-bg);
		color: var(--color-fg);
		border-left: 1px solid var(--color-border);
		z-index: var(--z-modal);
		display: flex;
		flex-direction: column;
		font-family: var(--font-ui);
	}
	@media (max-width: 480px) {
		.drawer {
			width: 100vw;
			border-left: 0;
		}
	}

	/* Body: scrollable list of grouped links. */
	.body {
		flex: 1 1 auto;
		overflow-y: auto;
		padding: 1rem 0;
	}
	.group + .group {
		margin-top: 0.5rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
		padding-top: 0.85rem;
	}
	.group-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0.85rem 1.25rem 0.4rem;
	}
	.links {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	/* Row: heading-style title + optional eyebrow on the right.
	   Hover/active = accent left-bar. */
	.link {
		display: flex;
		align-items: baseline;
		gap: 0.85rem;
		padding: 0.55rem 1.25rem;
		text-decoration: none;
		color: var(--color-fg);
		border-left: 2px solid transparent;
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}
	.link:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		border-left-color: var(--color-accent);
		color: var(--color-accent);
	}
	.link.is-active {
		background: color-mix(in srgb, var(--color-accent) 9%, transparent);
		border-left-color: var(--color-accent);
		color: var(--color-accent);
	}
	.link-body {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.link-label {
		font-family: var(--font-heading);
		font-style: normal;
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.3;
		text-wrap: balance;
	}
	/* Only the "Études & outils" group uses italics · it reads as tool-like,
	   matches how those entries appear elsewhere on the site. Italics
	   carry no extra weight; otherwise they read as shouty. */
	/* Hide mobile-only groups (e.g. Lecture: CCC + Bible) on md+ where
	   those links live in the topbar nav. */
	@media (min-width: 768px) {
		.group-mobile-only {
			display: none;
		}
	}
	.group-tools .link-label {
		font-style: italic;
		font-weight: 400;
	}
	.link-desc {
		font-family: var(--font-body);
		font-style: normal;
		font-size: 0.78rem;
		color: var(--color-subtle);
		margin-top: 0.15rem;
		line-height: 1.4;
	}
	.link-eyebrow {
		flex: 0 0 auto;
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.link.is-active .link-eyebrow,
	.link:hover .link-eyebrow {
		color: color-mix(in srgb, var(--color-accent) 70%, var(--color-muted));
	}

	/* Footer: lightweight secondary links. */
	.foot {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		padding: 0.9rem 1.25rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 10%, transparent);
		font-family: var(--font-ui);
		font-size: 0.72rem;
		color: var(--color-muted);
	}
	.foot a {
		color: inherit;
		text-decoration: none;
		transition: color 140ms ease;
	}
	.foot a:hover {
		color: var(--color-accent);
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			transition: none;
		}
	}
</style>
