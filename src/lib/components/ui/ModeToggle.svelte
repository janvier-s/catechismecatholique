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
			width="16"
			height="14"
			viewBox="0 0 16 14"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<line x1="1" y1="2" x2="15" y2="2" />
			<line x1="1" y1="7" x2="15" y2="7" />
			<line x1="1" y1="12" x2="15" y2="12" />
			<circle cx="5" cy="2" r="2" fill="currentColor" stroke="none" />
			<circle cx="11" cy="7" r="2" fill="currentColor" stroke="none" />
			<circle cx="7" cy="12" r="2" fill="currentColor" stroke="none" />
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
