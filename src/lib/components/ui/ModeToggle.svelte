<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import ReadingPrefs from './ReadingPrefs.svelte';

	let open = $state(false);
	let triggerEl: HTMLButtonElement | undefined = $state();
	let popoverEl: HTMLElement | undefined = $state();

	function onDocClick(e: MouseEvent) {
		if (!(e.target instanceof Element)) return;
		if (!e.target.closest('[data-prefs-menu]')) open = false;
	}

	function close() {
		open = false;
		queueMicrotask(() => triggerEl?.focus());
	}

	$effect(() => {
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});

	// ESC closes; focus trap inside popover; auto-focus first control on open.
	$effect(() => {
		if (!open) return;
		queueMicrotask(() => {
			const first = popoverEl?.querySelector<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
			);
			first?.focus();
		});

		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				close();
				return;
			}
			if (e.key !== 'Tab' || !popoverEl) return;
			const focusables = Array.from(
				popoverEl.querySelectorAll<HTMLElement>(
					'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
			).filter((el) => el.offsetParent !== null);
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
</script>

<div class="relative" data-prefs-menu>
	<button
		bind:this={triggerEl}
		type="button"
		class="ml-2 w-9 h-9 rounded-md flex items-center justify-center transition-colors
			{open ? 'bg-accent/10 text-accent' : 'bg-transparent text-foreground hover:text-accent'}"
		onclick={() => (open = !open)}
		aria-label="Options de lecture"
		aria-haspopup="dialog"
		aria-expanded={open}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 256 256"
			class="w-[18px] h-[18px]"
			aria-hidden="true"
		>
			<circle
				cx="128"
				cy="128"
				r="40"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="16"
			/>
			<path
				d="M130.05,206.11c-1.34,0-2.69,0-4,0L94,224a104.61,104.61,0,0,1-34.11-19.2l-.12-36c-.71-1.12-1.38-2.25-2-3.41L25.9,147.24a99.15,99.15,0,0,1,0-38.46l31.84-18.1c.65-1.15,1.32-2.29,2-3.41l.16-36A104.58,104.58,0,0,1,94,32l32,17.89c1.34,0,2.69,0,4,0L162,32a104.61,104.61,0,0,1,34.11,19.2l.12,36c.71,1.12,1.38,2.25,2,3.41l31.85,18.14a99.15,99.15,0,0,1,0,38.46l-31.84,18.1c-.65,1.15-1.32,2.29-2,3.41l-.16,36A104.58,104.58,0,0,1,162,224Z"
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
			bind:this={popoverEl}
			role="dialog"
			aria-modal="false"
			aria-label="Options de lecture"
			class="absolute right-0 mt-2 w-80 rounded-sm border border-border bg-panel shadow-md z-[var(--z-dropdown)] px-4 pt-1 pb-5 max-h-[calc(100vh-100px)] overflow-y-auto styled-scroll"
			transition:fly={{ y: -6, duration: 160, easing: cubicOut }}
		>
			<ReadingPrefs />
		</div>
	{/if}
</div>
