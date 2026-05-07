<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let {
		open = $bindable(false),
		eyebrow = 'Panorama',
		title = '',
		children
	}: {
		open?: boolean;
		eyebrow?: string;
		title?: string;
		children: Snippet;
	} = $props();

	let dialogEl: HTMLElement | undefined = $state();
	let lastTrigger: HTMLElement | null = null;

	function close() {
		open = false;
	}

	$effect(() => {
		if (!open) return;
		if (typeof document === 'undefined') return;

		lastTrigger = document.activeElement as HTMLElement | null;
		const html = document.documentElement;
		const prevOverflow = html.style.overflow;
		html.style.overflow = 'hidden';

		// Focus the close button on open.
		queueMicrotask(() => {
			const closeBtn = dialogEl?.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]');
			closeBtn?.focus();
		});

		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				close();
				return;
			}
			if (e.key !== 'Tab' || !dialogEl) return;
			const focusables = Array.from(
				dialogEl.querySelectorAll<HTMLElement>(
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

		return () => {
			html.style.overflow = prevOverflow;
			document.removeEventListener('keydown', onKeydown);
			lastTrigger?.focus?.();
			lastTrigger = null;
		};
	});

	const ariaLabel = $derived(title ? `${eyebrow} : ${title}` : eyebrow);

	// Portal the dialog + backdrop out of the page-fade wrapper (which
	// creates a stacking context via its opacity animation, trapping any
	// child z-index below the sticky topbar). Re-parents to document.body
	// on mount; cleaned up automatically when the action's node unmounts.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			}
		};
	}
</script>

{#if open}
	<div
		use:portal
		class="panorama-backdrop"
		onclick={close}
		role="presentation"
		transition:fade={{ duration: 160 }}
	></div>

	<div
		use:portal
		bind:this={dialogEl}
		class="panorama-dialog"
		role="dialog"
		aria-modal="true"
		aria-label={ariaLabel}
		transition:fly={{ y: 12, duration: 200 }}
	>
		<span class="panorama-dialog-accent" aria-hidden="true"></span>
		<header class="panorama-dialog-head">
			<div class="panorama-dialog-titles">
				<p class="panorama-dialog-eyebrow">{eyebrow}</p>
				{#if title}
					<h2 class="panorama-dialog-title">{title}</h2>
				{/if}
			</div>
			<button type="button" class="panorama-dialog-close" aria-label="Fermer" onclick={close}>
				<svg
					width="14"
					height="14"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5" />
				</svg>
			</button>
		</header>
		<div class="panorama-dialog-body styled-scroll">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.panorama-backdrop {
		position: fixed;
		inset: 0;
		z-index: calc(var(--z-modal) - 1);
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(2px);
		cursor: pointer;
	}
	.panorama-dialog {
		position: fixed;
		inset: 2.5vh 1rem 2.5vh 1rem;
		max-width: 1100px;
		margin: 0 auto;
		z-index: var(--z-modal);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		box-shadow:
			0 1px 0 color-mix(in srgb, var(--color-fg) 4%, transparent),
			0 24px 70px -18px color-mix(in srgb, var(--color-fg) 38%, transparent),
			0 8px 24px -12px color-mix(in srgb, var(--color-fg) 22%, transparent);
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}
	/* Thin accent strip across the top edge — quiet wayfinding cue that ties
	   the dialog to the site's accent color without shouting. */
	.panorama-dialog-accent {
		display: block;
		height: 3px;
		background: var(--color-accent);
		flex: 0 0 auto;
	}
	.panorama-dialog-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem 0.95rem;
		border-bottom: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-border) 14%, transparent);
	}
	.panorama-dialog-titles {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}
	.panorama-dialog-eyebrow {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0;
		line-height: 1;
	}
	.panorama-dialog-title {
		font-family: var(--font-heading);
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--color-heading);
		margin: 0;
		line-height: 1.25;
	}
	.panorama-dialog-close {
		appearance: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 34px;
		height: 34px;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-muted);
		cursor: pointer;
		transition:
			border-color 150ms ease,
			color 150ms ease,
			background 150ms ease;
	}
	.panorama-dialog-close:hover {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}
	.panorama-dialog-close svg {
		display: block;
	}
	.panorama-dialog-body {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding: 1.5rem clamp(1rem, 3vw, 2rem) 2rem;
	}
</style>
