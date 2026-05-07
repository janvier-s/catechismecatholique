<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let {
		open = $bindable(false),
		title = 'Panorama',
		children
	}: {
		open?: boolean;
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
</script>

{#if open}
	<div
		class="panorama-backdrop"
		onclick={close}
		role="presentation"
		transition:fade={{ duration: 160 }}
	></div>

	<div
		bind:this={dialogEl}
		class="panorama-dialog"
		role="dialog"
		aria-modal="true"
		aria-label={title}
		transition:fly={{ y: 12, duration: 200 }}
	>
		<header class="panorama-dialog-head">
			<h2 class="panorama-dialog-title">{title}</h2>
			<button type="button" class="panorama-dialog-close" aria-label="Fermer" onclick={close}>
				✕
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
		border-radius: 6px;
		box-shadow: 0 20px 60px -20px color-mix(in srgb, var(--color-fg) 30%, transparent);
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}
	.panorama-dialog-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-border) 10%, transparent);
	}
	.panorama-dialog-title {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0;
	}
	.panorama-dialog-close {
		appearance: none;
		border: 0;
		background: transparent;
		width: 32px;
		height: 32px;
		border-radius: 4px;
		font-size: 1rem;
		color: var(--color-muted);
		cursor: pointer;
	}
	.panorama-dialog-close:hover {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
	}
	.panorama-dialog-body {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding: 1.5rem clamp(1rem, 3vw, 2rem) 2rem;
	}
</style>
