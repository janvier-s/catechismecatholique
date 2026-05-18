<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	let {
		open = $bindable(false),
		paragraphNumber,
		paragraphPath,
		citation
	}: {
		open?: boolean;
		paragraphNumber: number;
		paragraphPath: string;
		citation: string;
	} = $props();

	let dialogEl: HTMLElement | undefined = $state();
	let lastTrigger: HTMLElement | null = null;
	let linkCopied = $state(false);

	const fullUrl = $derived.by(() => {
		if (typeof window === 'undefined') return paragraphPath;
		return new URL(paragraphPath, window.location.origin).toString();
	});
	const shareText = $derived(citation);

	function close() {
		open = false;
		linkCopied = false;
	}

	function openShareUrl(href: string) {
		if (typeof window === 'undefined') return;
		window.open(href, '_blank', 'noopener,noreferrer');
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(fullUrl);
			linkCopied = true;
			setTimeout(() => (linkCopied = false), 1800);
		} catch {
			// ignore
		}
	}

	const twitterHref = $derived(
		`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`
	);
	const facebookHref = $derived(
		`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`
	);
	const whatsappHref = $derived(
		`https://wa.me/?text=${encodeURIComponent(`${shareText} ${fullUrl}`)}`
	);
	const emailHref = $derived(
		`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`
	);
	const telegramHref = $derived(
		`https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`
	);

	$effect(() => {
		if (!open) return;
		if (typeof document === 'undefined') return;

		lastTrigger = document.activeElement as HTMLElement | null;
		const html = document.documentElement;
		const prevOverflow = html.style.overflow;
		html.style.overflow = 'hidden';

		queueMicrotask(() => {
			const closeBtn = dialogEl?.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]');
			closeBtn?.focus();
		});

		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				close();
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
		class="overlay"
		transition:fade={{ duration: 150 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
		role="presentation"
	>
		<div
			class="dialog"
			bind:this={dialogEl}
			role="dialog"
			aria-modal="true"
			aria-labelledby="share-dialog-title"
			tabindex="-1"
			transition:fly={{ y: 12, duration: 200 }}
		>
			<div class="header">
				<h2 id="share-dialog-title" class="title">
					Partager le paragraphe {paragraphNumber} via
				</h2>
				<button type="button" class="close-btn" onclick={close} aria-label="Fermer">
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="currentColor"
							d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"
						/>
					</svg>
				</button>
			</div>

			<div class="divider"></div>

			<div class="socials">
				<button
					type="button"
					class="social social-fb"
					onclick={() => openShareUrl(facebookHref)}
					aria-label="Partager sur Facebook"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="currentColor"
							d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978c.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036a26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103l-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"
						/>
					</svg>
				</button>
				<button
					type="button"
					class="social social-x"
					onclick={() => openShareUrl(twitterHref)}
					aria-label="Partager sur X"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="currentColor"
							d="M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
						/>
					</svg>
				</button>
				<button
					type="button"
					class="social social-whatsapp"
					onclick={() => openShareUrl(whatsappHref)}
					aria-label="Partager sur WhatsApp"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="currentColor"
							d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488a11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592c5.448 0 9.886-4.434 9.889-9.885c.002-5.462-4.415-9.89-9.881-9.892c-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l.6.953l-.999 3.648zm11.387-5.464c-.074-.124-.272-.198-.57-.347c-.297-.149-1.758-.868-2.031-.967c-.272-.099-.47-.149-.669.149c-.198.297-.768.967-.941 1.165c-.173.198-.347.223-.644.074c-.297-.149-1.255-.462-2.39-1.475c-.883-.788-1.48-1.761-1.653-2.059c-.173-.297-.018-.458.13-.606c.134-.133.297-.347.446-.521c.151-.172.2-.296.3-.495c.099-.198.05-.372-.025-.521c-.075-.148-.669-1.611-.916-2.206c-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372c-.272.297-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487c.709.306 1.263.489 1.694.626c.712.226 1.36.194 1.872.118c.571-.085 1.758-.719 2.006-1.413c.248-.694.248-1.289.173-1.413"
						/>
					</svg>
				</button>
				<button
					type="button"
					class="social social-telegram"
					onclick={() => openShareUrl(telegramHref)}
					aria-label="Partager sur Telegram"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="currentColor"
							d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0m4.962 7.224c.1-.002.321.023.464.139a.5.5 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z"
						/>
					</svg>
				</button>
				<a class="social social-email" href={emailHref} aria-label="Partager par e-mail">
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="currentColor"
							d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 4l-8 5l-8-5V6l8 5l8-5z"
						/>
					</svg>
				</a>
			</div>

			<p class="section-label section-label-spaced">Ou copier le lien</p>

			<div class="link-row">
				<input type="text" readonly value={fullUrl} aria-label="Lien à copier" />
				<button type="button" class="copy-btn" class:is-done={linkCopied} onclick={copyLink}>
					{linkCopied ? 'Copié' : 'Copier'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.dialog {
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
		width: 100%;
		max-width: 460px;
		padding: 1.5rem 1.5rem 1.25rem;
		color: var(--color-fg);
		font-family: var(--font-ui, inherit);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.title {
		font-family: var(--font-ui, inherit);
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1.3;
		margin: 0;
		color: var(--color-fg);
	}
	.close-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 50%;
		padding: 0;
		cursor: pointer;
		color: var(--color-subtle);
		transition:
			color 120ms ease,
			background 120ms ease,
			border-color 120ms ease;
	}
	.close-btn:hover,
	.close-btn:focus-visible {
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
	.close-btn svg {
		width: 16px;
		height: 16px;
	}

	.divider {
		margin: 1rem 0 1.25rem;
		height: 1px;
		background: var(--color-border);
	}

	.section-label {
		margin: 0 0 0.9rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-fg);
	}
	.section-label-spaced {
		margin-top: 1.5rem;
	}

	.socials {
		display: flex;
		justify-content: space-between;
		gap: 6px;
		flex-wrap: wrap;
	}
	.social {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		border: 1.5px solid var(--brand, var(--color-border));
		color: var(--brand, var(--color-fg));
		background: var(--color-panel);
		text-decoration: none;
		transition:
			background 140ms ease,
			color 140ms ease,
			transform 140ms ease;
	}
	.social:hover,
	.social:focus-visible {
		background: var(--brand, var(--color-bg));
		color: #fff;
		transform: translateY(-2px);
	}
	.social svg {
		width: 22px;
		height: 22px;
	}
	.social-fb {
		--brand: #1877f2;
	}
	.social-x {
		--brand: #0f1419;
	}
	.social-whatsapp {
		--brand: #25d366;
	}
	.social-telegram {
		--brand: #229ed9;
	}
	.social-email {
		--brand: var(--color-accent);
	}

	/* X's brand is near-black, which disappears on dark themes. Swap to white
	   so the outline + glyph stay legible regardless of background. */
	:global([data-theme='dark']) .social-x,
	:global([data-theme='oled']) .social-x {
		--brand: #ffffff;
	}
	@media (prefers-color-scheme: dark) {
		:global([data-theme='auto']) .social-x {
			--brand: #ffffff;
		}
	}

	.link-row {
		display: flex;
		gap: 0;
		align-items: stretch;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
		background: var(--color-bg);
	}
	.link-row input {
		flex: 1;
		min-width: 0;
		padding: 10px 12px;
		border: none;
		background: transparent;
		font-size: 0.85rem;
		color: var(--color-fg);
		outline: none;
		font-family: var(--font-ui, inherit);
	}
	.copy-btn {
		padding: 10px 18px;
		border: none;
		background: var(--color-accent);
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 120ms ease,
			filter 120ms ease;
		font-family: var(--font-ui, inherit);
	}
	.copy-btn:hover,
	.copy-btn:focus-visible {
		filter: brightness(1.08);
	}
	.copy-btn.is-done {
		background: #16a34a;
	}
</style>
