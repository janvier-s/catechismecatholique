<script lang="ts">
	import { fly } from 'svelte/transition';
	import { suspendChrome } from '$lib/stores/chrome';
	import { cubicOut } from 'svelte/easing';
	import ReadingPrefs from './ReadingPrefs.svelte';

	let open = $state(false);

	// The overlay anchors to the header, so the header must not slide away
	// underneath it while it is open. The cleanup matters: this component
	// unmounts on navigation, and a suspender left in the Set would freeze
	// the bars permanently.
	$effect(() => {
		suspendChrome('prefs', open);
		return () => suspendChrome('prefs', false);
	});
	let triggerEl: HTMLButtonElement | undefined = $state();
	let popoverEl: HTMLElement | undefined = $state();

	// The popover used to sit `absolute right-0` under the trigger, but the
	// trigger isn't at the header's right edge (NavDrawer's button follows
	// it) · on narrow phones the fixed 320px width ran off the left edge of
	// the viewport. Position it in fixed coordinates instead and clamp so it
	// always stays on-screen, the same approach ReadingPrefs's font dropdown
	// already uses.
	const VIEWPORT_MARGIN = 16;
	let popoverPos: { top: number; left: number } = $state({ top: 0, left: 0 });

	function positionPopover() {
		if (!triggerEl) return;
		const rect = triggerEl.getBoundingClientRect();
		const width = popoverEl?.getBoundingClientRect().width ?? 320;
		const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
		const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.right - width, maxLeft));
		popoverPos = { top: rect.bottom + 8, left };
	}

	$effect(() => {
		if (!open) return;
		positionPopover();
		queueMicrotask(positionPopover);
		const onReposition = () => positionPopover();
		window.addEventListener('scroll', onReposition, true);
		window.addEventListener('resize', onReposition);
		return () => {
			window.removeEventListener('scroll', onReposition, true);
			window.removeEventListener('resize', onReposition);
		};
	});

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
		onclick={() => {
			if (!open) positionPopover();
			open = !open;
		}}
		aria-label="Options de lecture"
		title="Options de lecture"
		aria-haspopup="dialog"
		aria-expanded={open}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="gear-icon w-5 h-5"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
			/>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
			/>
		</svg>
	</button>

	{#if open}
		<div
			bind:this={popoverEl}
			role="dialog"
			aria-modal="false"
			aria-label="Options de lecture"
			class="fixed w-[min(20rem,calc(100vw-2rem))] rounded-sm border border-border bg-panel shadow-md z-[var(--z-dropdown)] px-4 pt-1 pb-5 max-h-[calc(100vh-100px)] overflow-y-auto styled-scroll"
			style:top="{popoverPos.top}px"
			style:left="{popoverPos.left}px"
			transition:fly={{ y: -6, duration: 160, easing: cubicOut }}
		>
			<ReadingPrefs />
		</div>
	{/if}
</div>

<style>
	.gear-icon {
		transform-origin: center;
		transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	button[aria-expanded='true'] .gear-icon {
		transform: rotate(30deg);
	}
</style>
