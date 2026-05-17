<script lang="ts">
	import { get } from 'svelte/store';
	import { studyPanel, openPanel, closePanel } from '$lib/stores/studyPanel';
	import ShareModal from './ShareModal.svelte';

	let {
		paragraphNumber,
		paragraphHtml
	}: {
		paragraphNumber: number;
		paragraphHtml: string;
	} = $props();

	const paragraphPath = $derived(`/cec/${paragraphNumber}`);
	const citation = $derived(`Catéchisme de l'Église catholique, §${paragraphNumber}`);

	let copyState = $state<'idle' | 'done'>('idle');
	let shareOpen = $state(false);

	// Open/close driven by JS so a brief excursion through the empty corridor
	// between digit and cards doesn't dismiss the menu. Mouseenter on the
	// number-wrap (digit) or any card resets the timer; mouseleave starts it.
	let rootEl: HTMLElement | undefined = $state();
	let isOpen = $state(false);
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	const CLOSE_DELAY = 260;

	function openMenu() {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = undefined;
		}
		isOpen = true;
	}
	function closeMenuSoon() {
		if (closeTimer) clearTimeout(closeTimer);
		closeTimer = setTimeout(() => {
			isOpen = false;
			closeTimer = undefined;
		}, CLOSE_DELAY);
	}

	$effect(() => {
		if (!rootEl) return;
		const wrap = rootEl.closest<HTMLElement>('.number-wrap');
		const targets = wrap ? [wrap, rootEl] : [rootEl];
		targets.forEach((el) => {
			el.addEventListener('mouseenter', openMenu);
			el.addEventListener('mouseleave', closeMenuSoon);
			el.addEventListener('focusin', openMenu);
			el.addEventListener('focusout', closeMenuSoon);
		});
		return () => {
			targets.forEach((el) => {
				el.removeEventListener('mouseenter', openMenu);
				el.removeEventListener('mouseleave', closeMenuSoon);
				el.removeEventListener('focusin', openMenu);
				el.removeEventListener('focusout', closeMenuSoon);
			});
			if (closeTimer) clearTimeout(closeTimer);
		};
	});

	function extractText(html: string): string {
		if (typeof document === 'undefined') return '';
		const div = document.createElement('div');
		div.innerHTML = html;
		div.querySelectorAll('sup, button, .footnote-marker').forEach((n) => n.remove());
		return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
	}

	async function onCopy() {
		const body = extractText(paragraphHtml);
		const out = `${body}\n\n— ${citation}`;
		try {
			await navigator.clipboard.writeText(out);
			copyState = 'done';
			setTimeout(() => (copyState = 'idle'), 1800);
		} catch {
			// Clipboard API unavailable; nothing graceful to do at this layer.
		}
	}

	function onPrint() {
		if (typeof window === 'undefined') return;
		const target = String(paragraphNumber);
		const others = Array.from(
			document.querySelectorAll<HTMLElement>('.ccc-paragraph[data-cec-paragraph]')
		).filter((el) => el.getAttribute('data-cec-paragraph') !== target);
		others.forEach((el) => el.setAttribute('data-print-hidden', ''));
		const cleanup = () => {
			others.forEach((el) => el.removeAttribute('data-print-hidden'));
			window.removeEventListener('afterprint', cleanup);
		};
		window.addEventListener('afterprint', cleanup);
		window.print();
	}

	async function onShare() {
		const canNativeShare =
			typeof navigator !== 'undefined' &&
			typeof navigator.share === 'function' &&
			typeof window !== 'undefined' &&
			window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
		if (canNativeShare) {
			const url = new URL(paragraphPath, window.location.origin).toString();
			try {
				await navigator.share({ title: citation, url });
				return;
			} catch {
				// fall through to modal
			}
		}
		shareOpen = true;
	}

	function onStudy() {
		const s = get(studyPanel);
		if (s.open && s.context?.kind === 'paragraph' && s.context.paragraph === paragraphNumber) {
			closePanel();
			return;
		}
		openPanel({ kind: 'paragraph', paragraph: paragraphNumber }, s.activeTab ?? 'cross-refs');
	}
</script>

<div class="paragraph-actions" class:is-open={isOpen} bind:this={rootEl}>
	<div class="action-card action-card-top">
		<button
			type="button"
			class="action-btn"
			disabled
			aria-label="Lecture audio (bientôt disponible)"
		>
			<span class="action-label">Audio</span>
			<span class="action-icon">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill="currentColor"
						d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10s10-4.49 10-10S17.51 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8"
					/>
					<path fill="currentColor" d="m9 17l8-5l-8-5z" />
				</svg>
			</span>
		</button>
		<button
			type="button"
			class="action-btn"
			onclick={onStudy}
			aria-label="Ouvrir le panneau d'étude"
		>
			<span class="action-label">Étudier</span>
			<span class="action-icon">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path fill="currentColor" d="M11 11h2v6h-2zm0-4h2v2h-2z" />
					<path
						fill="currentColor"
						d="M12 22c5.51 0 10-4.49 10-10S17.51 2 12 2S2 6.49 2 12s4.49 10 10 10m0-18c4.41 0 8 3.59 8 8s-3.59 8-8 8s-8-3.59-8-8s3.59-8 8-8"
					/>
				</svg>
			</span>
		</button>
	</div>

	<div class="action-card action-card-main">
		<a
			href={paragraphPath}
			target="_blank"
			rel="noopener"
			class="action-btn"
			aria-label={`Ouvrir paragraphe ${paragraphNumber} dans un nouvel onglet`}
		>
			<span class="action-label">Lien</span>
			<span class="action-icon">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path fill="currentColor" d="M14 4h4.59l-7.3 7.29l1.42 1.42L20 5.41V10h2V2h-8z" />
					<path
						fill="currentColor"
						d="M12 5V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7H5V5z"
					/>
				</svg>
			</span>
		</a>

		<button
			type="button"
			class="action-btn"
			class:is-done={copyState === 'done'}
			onclick={onCopy}
			aria-label="Copier le texte du paragraphe avec sa citation"
		>
			<span class="action-label">{copyState === 'done' ? 'Copié' : 'Copier'}</span>
			<span class="action-icon">
				{#if copyState === 'done'}
					<svg viewBox="0 0 24 24" aria-hidden="true" class="check-icon">
						<path
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M5 12.5l4.5 4.5L19 7"
						/>
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="currentColor"
							d="M20 2H10c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 12H10V4h10z"
						/>
						<path
							fill="currentColor"
							d="M14 20H4V10h2V8H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2h-2z"
						/>
					</svg>
				{/if}
			</span>
		</button>

		<button type="button" class="action-btn" onclick={onShare} aria-label="Partager ce paragraphe">
			<span class="action-label">Partager</span>
			<span class="action-icon">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill="currentColor"
						d="M5.5 15.5c1.07 0 2.02-.5 2.67-1.26l6.87 3.87c-.01.13-.04.26-.04.39c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5s-1.57-3.5-3.5-3.5c-1.07 0-2.02.5-2.67 1.26l-6.87-3.87c.01-.13.04-.26.04-.39s-.02-.26-.04-.39l6.87-3.87C16.47 8.5 17.42 9 18.5 9C20.43 9 22 7.43 22 5.5S20.43 2 18.5 2S15 3.57 15 5.5c0 .13.02.26.04.39L8.17 9.76A3.48 3.48 0 0 0 5.5 8.5C3.57 8.5 2 10.07 2 12s1.57 3.5 3.5 3.5m13 1.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5m0-13c.83 0 1.5.67 1.5 1.5S19.33 7 18.5 7S17 6.33 17 5.5S17.67 4 18.5 4m-13 6.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S4 12.83 4 12s.67-1.5 1.5-1.5"
					/>
				</svg>
			</span>
		</button>

		<button type="button" class="action-btn" onclick={onPrint} aria-label="Imprimer ce paragraphe">
			<span class="action-label">Imprimer</span>
			<span class="action-icon">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill="currentColor"
						d="M19 7h-1V2H6v5H5c-1.65 0-3 1.35-3 3v7c0 1.1.9 2 2 2h2v3h12v-3h2c1.1 0 2-.9 2-2v-7c0-1.65-1.35-3-3-3M8 4h8v3H8zm8 16H8v-4h8zm4-3h-2v-3H6v3H4v-7c0-.55.45-1 1-1h14c.55 0 1 .45 1 1z"
					/>
					<path fill="currentColor" d="M14 11h4v1h-4z" />
				</svg>
			</span>
		</button>
	</div>
</div>

<ShareModal bind:open={shareOpen} {paragraphNumber} {paragraphPath} {citation} />

<style>
	.paragraph-actions {
		position: absolute;
		right: 100%;
		top: 0;
		/* Span the digit's full height so the two cards anchor symmetrically
		   above and below the paragraph number. */
		bottom: 0;
	}

	.action-card {
		position: absolute;
		right: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 4px;
		margin-right: 8px;
		width: 124px;
		border-radius: 10px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		box-shadow: 0 8px 22px rgba(0, 0, 0, 0.1);
		opacity: 0;
		transform: translateY(2px);
		pointer-events: none;
		transition:
			opacity 140ms ease,
			transform 140ms ease;
	}

	.action-card-top {
		bottom: calc(100% - 10px);
	}
	.action-card-main {
		top: calc(100% - 10px);
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		padding: 6px 8px 6px 10px;
		border: none;
		background: transparent;
		color: var(--color-fg);
		text-decoration: none;
		cursor: pointer;
		border-radius: 6px;
		font-family: var(--font-ui, inherit);
		font-size: 0.82rem;
		font-weight: 500;
		line-height: 1;
		opacity: 0;
		transform: translateX(4px);
		transition:
			color 100ms ease,
			background 100ms ease,
			opacity 140ms ease,
			transform 140ms ease;
	}

	.action-label {
		color: var(--color-fg);
		white-space: nowrap;
	}
	.action-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		color: var(--color-subtle);
		flex: 0 0 auto;
	}

	.action-btn:hover,
	.action-btn:focus-visible {
		background: var(--color-bg);
	}
	.action-btn:hover .action-label,
	.action-btn:focus-visible .action-label,
	.action-btn:hover .action-icon,
	.action-btn:focus-visible .action-icon {
		color: var(--color-accent);
	}

	.action-btn[disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.action-btn[disabled]:hover {
		background: transparent;
	}
	.action-btn[disabled]:hover .action-label {
		color: var(--color-fg);
	}
	.action-btn[disabled]:hover .action-icon {
		color: var(--color-subtle);
	}

	.action-btn.is-done .action-label,
	.action-btn.is-done .action-icon {
		color: #16a34a;
	}
	.check-icon {
		animation: check-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes check-pop {
		0% {
			transform: scale(0.4);
			opacity: 0;
		}
		60% {
			transform: scale(1.18);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.action-icon svg {
		width: 16px;
		height: 16px;
	}

	/* JS-driven open state: when is-open is set, cards and their rows reveal
	   with the same staggered transitions used before. The delayed close (in
	   the script) covers the empty corridor between digit and cards so the
	   menu doesn't disappear mid-traversal. */
	.paragraph-actions.is-open .action-card {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}
	.paragraph-actions.is-open .action-btn {
		opacity: 1;
		transform: translateX(0);
	}

	.action-card-top .action-btn:nth-child(1) {
		transition-delay: 0ms;
	}
	.action-card-top .action-btn:nth-child(2) {
		transition-delay: 20ms;
	}
	.action-card-main .action-btn:nth-child(1) {
		transition-delay: 40ms;
	}
	.action-card-main .action-btn:nth-child(2) {
		transition-delay: 60ms;
	}
	.action-card-main .action-btn:nth-child(3) {
		transition-delay: 80ms;
	}
	.action-card-main .action-btn:nth-child(4) {
		transition-delay: 100ms;
	}

	@media (max-width: 640px) {
		.paragraph-actions {
			display: none;
		}
	}

	@media print {
		.paragraph-actions {
			display: none;
		}
	}
</style>
