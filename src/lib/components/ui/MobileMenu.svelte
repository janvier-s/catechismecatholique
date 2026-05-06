<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';
	import { detectIntent } from '$lib/utils/searchIntent';

	let open = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	function close() {
		open = false;
	}
	function toggle() {
		open = !open;
		if (open) {
			// Defer focus until the sheet has mounted
			queueMicrotask(() => inputEl?.focus());
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

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const q = (new FormData(form).get('q') as string | null)?.trim() ?? '';
		if (!q) return;
		const intent = detectIntent(q);
		close();
		if (intent.kind === 'paragraph' || intent.kind === 'bible') {
			void goto(intent.href);
		} else {
			void goto(`/recherche?q=${encodeURIComponent(intent.q)}`);
		}
	}

	const links: { href: string; label: string }[] = [
		{ href: '/ccc', label: 'Catéchisme' },
		{ href: '/bible', label: 'Bible' },
		{ href: '/glossaire', label: 'Glossaire' },
		{ href: '/recherche', label: 'Recherche' },
		{ href: '/a-propos', label: 'À propos' }
	];

	function isActive(href: string): boolean {
		const p: string = page.url.pathname;
		if (href === '/recherche' || href === '/a-propos') return p === href;
		return p === href || p.startsWith(href + '/');
	}
</script>

<button
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

	<nav
		id="mobile-menu"
		class="sheet md:hidden"
		aria-label="Menu mobile"
		transition:fly={{ y: -6, duration: 220, opacity: 0 }}
	>
		<div class="ornament" aria-hidden="true">
			<span class="rule rule-l"></span>
			<span class="fleuron">✠</span>
			<span class="rule rule-r"></span>
		</div>

		<form onsubmit={handleSearch} class="search-form" role="search">
			<input
				bind:this={inputEl}
				type="search"
				name="q"
				class="search-input"
				placeholder="Rechercher : Eucharistie ou 1324"
				aria-label="Recherche dans le Catéchisme"
				autocomplete="off"
				autocapitalize="none"
				autocorrect="off"
				spellcheck="false"
			/>
			<button type="submit" class="search-submit" aria-label="Lancer la recherche">
				<span aria-hidden="true">↵</span>
			</button>
		</form>

		<ul class="links">
			{#each links as link (link.href)}
				<li>
					<a class="link" class:is-active={isActive(link.href)} href={link.href}>
						<span class="link-label">{link.label}</span>
						<span class="link-arrow" aria-hidden="true">›</span>
					</a>
				</li>
			{/each}
		</ul>

		<a class="sommaire" href="/ccc/sommaire">
			<span>Sommaire complet</span>
			<span class="sommaire-arrow" aria-hidden="true">→</span>
		</a>
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

	/* Search — hairline bottom-rule input, italic placeholder. */
	.search-form {
		position: relative;
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.4rem;
	}
	.search-input {
		flex: 1 1 auto;
		min-width: 0;
		appearance: none;
		border: 0;
		background: transparent;
		font-family: var(--font-heading);
		font-size: 1rem;
		color: var(--color-fg);
		padding: 0.65rem 0.25rem;
	}
	.search-input::placeholder {
		font-style: italic;
		color: color-mix(in srgb, var(--color-fg) 42%, transparent);
		font-family: var(--font-heading);
	}
	.search-input:focus {
		outline: none;
	}
	.search-form:focus-within {
		border-bottom-color: var(--color-accent);
	}
	.search-submit {
		flex: 0 0 auto;
		appearance: none;
		border: 0;
		background: transparent;
		color: color-mix(in srgb, var(--color-fg) 42%, transparent);
		font-family: var(--font-heading);
		font-size: 1.1rem;
		padding: 0.4rem 0.6rem;
		cursor: pointer;
	}
	.search-form:focus-within .search-submit {
		color: var(--color-accent);
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

	/* Sommaire — eyebrow-styled link at the bottom, separated by border above. */
	.sommaire {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		margin-top: 0.4rem;
		padding: 0.85rem 0.6rem 0.2rem;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
	}
	.sommaire:hover {
		color: var(--color-accent);
	}
	.sommaire-arrow {
		font-family: var(--font-heading);
		font-size: 0.95rem;
		transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.sommaire:hover .sommaire-arrow {
		transform: translateX(3px);
	}

	@media (prefers-reduced-motion: reduce) {
		.bar,
		.link-arrow,
		.sommaire-arrow {
			transition: none;
		}
	}
</style>
