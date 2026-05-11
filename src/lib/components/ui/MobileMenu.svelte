<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';

	let open = $state(false);
	let triggerEl: HTMLButtonElement | undefined = $state();
	let sheetEl: HTMLElement | undefined = $state();

	function close() {
		open = false;
		queueMicrotask(() => triggerEl?.focus());
	}
	function toggle() {
		open = !open;
		if (open) {
			// Defer until the sheet has mounted so we can focus its first link.
			queueMicrotask(() => {
				const first = sheetEl?.querySelector<HTMLElement>('a, button');
				first?.focus();
			});
		}
	}

	// Focus trap — keep Tab cycling inside the sheet while it's open.
	function onSheetKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab' || !sheetEl) return;
		const focusables = Array.from(
			sheetEl.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
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
	}

	afterNavigate(() => {
		open = false;
	});

	// Lock body scroll while the sheet is open. The home page already toggles
	// `body.home-route` to suppress its scrollbar — we coexist by setting
	// overflow on documentElement (html) instead, which the home logic doesn't
	// touch.
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

	// Esc to close
	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});

	type Link = { href: string; label: string };
	type Group = { title: string; links: Link[] };
	const groups: Group[] = [
		{
			title: 'Catéchisme',
			links: [
				{ href: '/cec', label: 'Lire le Catéchisme' },
				{ href: '/cec/sommaire', label: 'Sommaire' },
				{ href: '/cec/panorama', label: 'Panorama' },
				{ href: '/compendium', label: 'Compendium' },
				{ href: '/trente', label: 'Catéchisme de Trente' },
				{ href: '/grand-catechisme', label: 'Grand Catéchisme' },
				{ href: '/petit-catechisme', label: 'Petit Catéchisme' },
				{ href: '/catechisme-illustre', label: 'Catéchisme illustré' },
				{ href: '/doctrine-catholique', label: 'La Doctrine Catholique' },
				{ href: '/denzinger', label: 'Denzinger' },
				{ href: '/doctrine-sociale', label: 'Doctrine sociale' },
				{ href: '/calendrier', label: 'Calendrier liturgique' },
				{ href: '/prieres-formules', label: 'Prières & Formules' },
				{ href: '/glossaire', label: 'Glossaire' },
				{ href: '/recherche', label: 'Recherche' }
			]
		},
		{
			title: 'Bible',
			links: [
				{ href: '/bible', label: 'Lire la Bible' },
				{ href: '/bible', label: 'Concordance' }
			]
		},
		{
			title: 'Le site',
			links: [
				{ href: '/a-propos', label: 'À propos' },
				{ href: '/mentions-legales', label: 'Mentions légales' }
			]
		}
	];

	// Active entry: only the longest matching href across all groups (exact
	// match or path-prefix). On /cec/sommaire that means /cec/sommaire wins,
	// not the broader /cec entry.
	const activeHref = $derived.by(() => {
		const p: string = page.url.pathname;
		let best: string | null = null;
		for (const group of groups) {
			for (const link of group.links) {
				if (link.href === p) return link.href;
				if (p.startsWith(link.href + '/')) {
					if (!best || link.href.length > best.length) best = link.href;
				}
			}
		}
		return best;
	});

	function isActive(href: string): boolean {
		return href === activeHref;
	}
</script>

<button
	bind:this={triggerEl}
	type="button"
	class="hamburger md:hidden"
	aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
	aria-expanded={open}
	aria-controls="mobile-menu"
	onclick={toggle}
>
	<span class="bars" class:is-open={open} aria-hidden="true">
		<span class="bar b1"></span>
		<span class="bar b2"></span>
		<span class="bar b3"></span>
	</span>
</button>

{#if open}
	<div
		class="backdrop md:hidden"
		onclick={close}
		role="presentation"
		transition:fade={{ duration: 180 }}
	></div>

	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<nav
		bind:this={sheetEl}
		id="mobile-menu"
		class="sheet md:hidden"
		aria-label="Menu mobile"
		onkeydown={onSheetKeydown}
		transition:fly={{ y: -6, duration: 220, opacity: 0 }}
	>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>

		{#each groups as group, gi (group.title)}
			{#if gi > 0}
				<p class="group-eyebrow">{group.title}</p>
			{:else}
				<p class="group-eyebrow group-eyebrow-first">{group.title}</p>
			{/if}
			<ul class="links">
				{#each group.links as link (link.label)}
					<li>
						<a class="link" class:is-active={isActive(link.href)} href={link.href}>
							<span class="link-label">{link.label}</span>
							<span class="link-arrow" aria-hidden="true">›</span>
						</a>
					</li>
				{/each}
			</ul>
		{/each}
	</nav>
{/if}

<style>
	/* Hamburger — hairline icon, no fill, matches editorial topbar register. */
	.hamburger {
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
	}
	@media (min-width: 768px) {
		.hamburger {
			display: none;
		}
	}
	.hamburger:hover {
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

	/* Backdrop — soft warm parchment scrim, not a black SaaS overlay. */
	.backdrop {
		position: fixed;
		inset: var(--topbar-height, 80px) 0 0 0;
		background: color-mix(in srgb, var(--color-fg) 36%, transparent);
		backdrop-filter: blur(2px);
		z-index: calc(var(--z-modal) - 1);
		cursor: pointer;
	}

	/* Sheet — slides down from the topbar bottom edge. */
	.sheet {
		position: fixed;
		top: var(--topbar-height, 80px);
		left: 0;
		right: 0;
		max-height: calc(100dvh - var(--topbar-height, 80px));
		background: var(--color-bg);
		color: var(--color-fg);
		border-bottom: 1px solid var(--color-border);
		z-index: var(--z-modal);
		padding: 1.1rem 1.5rem 1.4rem;
		overflow-y: auto;
		box-shadow: 0 8px 24px -16px color-mix(in srgb, var(--color-fg) 22%, transparent);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Top fleuron — same ornamental rhythm used elsewhere on the site. */
	.ornament {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		margin: 0 auto 0.2rem;
		max-width: 280px;
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 0.85rem;
		color: var(--color-accent);
		line-height: 1;
		user-select: none;
	}
	.rule {
		flex: 1 1 auto;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 22%, transparent)
		);
	}
	.rule-r {
		background: linear-gradient(
			to left,
			transparent,
			color-mix(in srgb, var(--color-fg) 22%, transparent)
		);
	}

	/* Links — hairline-ruled rows, large 56 px touch targets. */
	.links {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 0.25rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
		text-decoration: none;
		color: var(--color-fg);
		min-height: 56px;
	}
	.link:hover {
		color: var(--color-accent);
	}
	.link-label {
		font-family: var(--font-heading);
		font-size: 1.15rem;
		line-height: 1;
	}
	.link.is-active .link-label {
		color: var(--color-accent);
	}
	.link.is-active::before {
		content: '';
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--color-accent);
		position: absolute;
		margin-left: -0.85rem;
		margin-top: 0.5rem;
	}
	.link {
		position: relative;
	}
	.link-arrow {
		font-family: var(--font-heading);
		font-size: 1.2rem;
		color: color-mix(in srgb, var(--color-fg) 30%, transparent);
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			color 140ms ease;
	}
	.link:hover .link-arrow {
		color: var(--color-accent);
		transform: translateX(3px);
	}

	/* Group eyebrow — small accent caps separating the three corpus
	   groups (Catéchisme, Bible, Le site). Mirrors the footer columns. */
	.group-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 1.25rem 0 0.1rem 0.25rem;
	}
	.group-eyebrow-first {
		margin-top: 0.2rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.bar,
		.link-arrow {
			transition: none;
		}
	}
</style>
