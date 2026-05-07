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

	type Link = { href: string; label: string; description: string };
	const links: Link[] = [
		{ href: '/ccc/sommaire', label: 'Sommaire', description: 'La table des matières complète.' },
		{ href: '/ccc/panorama', label: 'Panorama', description: 'Vue d’ensemble en un coup d’œil.' },
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
			href: '/recherche',
			label: 'Recherche',
			description: 'Mot, paragraphe ou référence biblique.'
		}
	];
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
			width="18"
			height="18"
			viewBox="0 0 18 18"
			fill="currentColor"
			aria-hidden="true"
		>
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
		<div
			bind:this={panelEl}
			id="desktop-menu-panel"
			class="desktop-menu-panel"
			role="dialog"
			aria-label="Outils et navigation"
			transition:fly={{ y: -6, duration: 160, easing: cubicOut }}
		>
			<p class="menu-eyebrow">Outils</p>
			<ul class="menu-list">
				{#each links as link (link.href)}
					<li>
						<a class="menu-row" href={link.href} onclick={close}>
							<span class="menu-row-label">{link.label}</span>
							<span class="menu-row-desc">{link.description}</span>
						</a>
					</li>
				{/each}
			</ul>
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
	.desktop-menu-panel {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		width: 280px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.75rem 0;
		z-index: var(--z-dropdown);
	}
	.menu-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.45rem 1.1rem;
	}
	.menu-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.menu-row {
		display: block;
		padding: 0.5rem 1.1rem;
		text-decoration: none;
		color: var(--color-fg);
		border-left: 2px solid transparent;
		transition:
			border-color 120ms ease,
			color 120ms ease;
	}
	.menu-row:hover {
		border-left-color: var(--color-accent);
		color: var(--color-accent-text);
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
