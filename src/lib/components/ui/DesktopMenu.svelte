<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { afterNavigate } from '$app/navigation';

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

	type Link = { href: string; label: string; gloss?: string };
	const links: Link[] = [
		{ href: '/ccc/sommaire', label: 'Sommaire', gloss: 'table des matières' },
		{ href: '/ccc/panorama', label: 'Panorama', gloss: 'vue d’ensemble' },
		{ href: '/glossaire', label: 'Glossaire', gloss: 'termes théologiques' },
		{ href: '/bible', label: 'Concordance biblique', gloss: 'verset par verset' },
		{ href: '/recherche', label: 'Recherche' }
	];
</script>

<div class="hidden md:block relative" data-desktop-menu>
	<button
		bind:this={triggerEl}
		type="button"
		class="desktop-menu-trigger {open ? 'is-open' : ''}"
		aria-expanded={open}
		aria-controls="desktop-menu-panel"
		aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
		onclick={() => (open = !open)}
	>
		<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
			<circle cx="4" cy="4" r="1.3" />
			<circle cx="9" cy="4" r="1.3" />
			<circle cx="14" cy="4" r="1.3" />
			<circle cx="4" cy="9" r="1.3" />
			<circle cx="9" cy="9" r="1.3" />
			<circle cx="14" cy="9" r="1.3" />
			<circle cx="4" cy="14" r="1.3" />
			<circle cx="9" cy="14" r="1.3" />
			<circle cx="14" cy="14" r="1.3" />
		</svg>
	</button>

	{#if open}
		<nav
			bind:this={panelEl}
			id="desktop-menu-panel"
			class="desktop-menu-panel"
			aria-label="Outils"
			transition:fly={{ y: -4, duration: 140, easing: cubicOut }}
		>
			<p class="menu-eyebrow">Outils</p>
			<ul class="menu-list">
				{#each links as link (link.href)}
					<li>
						<a class="menu-row" href={link.href} onclick={close}>
							<span class="menu-row-label">{link.label}</span>{#if link.gloss}<span
									class="menu-row-gloss">, {link.gloss}</span
								>{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
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
	/* Anchor flush to the bottom of the topbar — reads as a drawer of the
	   bar, not a tooltip parked beside it. No top border so the seam is
	   continuous with the topbar's own bottom border. */
	.desktop-menu-panel {
		position: absolute;
		right: 0;
		top: 100%;
		width: 300px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-top: 0;
		border-radius: 0 0 4px 4px;
		padding: 0.7rem 0 0.55rem;
		z-index: var(--z-dropdown);
	}
	.menu-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.5rem 1.25rem;
	}
	.menu-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	/* Type-driven hover: no left rail, no tinted box. Hover underlines the
	   label as a reader's affordance; keyboard focus uses a faint tint so
	   the active row stays obvious without a mouse. */
	.menu-row {
		display: block;
		padding: 0.45rem 1.25rem;
		text-decoration: none;
		color: var(--color-fg);
		transition: color 120ms ease;
	}
	.menu-row:hover .menu-row-label {
		color: var(--color-accent-text);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}
	.menu-row:focus-visible {
		outline: none;
		background: color-mix(in srgb, var(--color-fg) 4%, transparent);
	}
	.menu-row-label {
		font-family: var(--font-heading);
		font-size: 0.95rem;
		font-weight: 600;
		color: inherit;
		transition: color 120ms ease;
	}
	.menu-row-gloss {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.85rem;
		color: var(--color-subtle);
	}
</style>
