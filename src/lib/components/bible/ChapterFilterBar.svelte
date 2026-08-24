<script lang="ts">
	import { updatePref } from '$lib/stores/prefs';

	let {
		mode,
		hasConcordance = false,
		disabled = false,
		readerHref = null,
		concordanceHref = null,
		onchange
	}: {
		/** Which of the three pill states is current. 'concordance' means we're
		 *  on the concordance route itself, where Lecture/Étude become links
		 *  back to the reader rather than in-place toggles. */
		mode: 'lecture' | 'etude' | 'concordance';
		hasConcordance?: boolean;
		disabled?: boolean;
		/** Reader-page href, used for the Lecture/Étude buttons when mode is 'concordance'. */
		readerHref?: string | null;
		/** Concordance-page href, used for the Concordance button when hasConcordance. */
		concordanceHref?: string | null;
		/** In-place toggle between Lecture/Étude, used when mode isn't 'concordance'. */
		onchange?: (next: boolean) => void;
	} = $props();

	// Navigating to the reader page from the concordance route in Étude mode
	// should land already annotated · the reader picks bibleStudyMode straight
	// from the store, so set it before the navigation completes.
	function goEtude(): void {
		updatePref('bibleStudyMode', true);
	}
</script>

<div class="mode-pill" role="group" aria-label="Mode d'affichage du texte biblique">
	{#if mode === 'concordance'}
		<a href={readerHref} class="pill-option">
			<span class="pill-label">Lecture</span>
			<svg
				class="pill-icon"
				viewBox="0 0 16 16"
				aria-hidden="true"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
			>
				<path
					d="M2 3.5h4.5A1.5 1.5 0 0 1 8 5v8a1.2 1.2 0 0 0-1.2-1.2H2zM14 3.5H9.5A1.5 1.5 0 0 0 8 5v8a1.2 1.2 0 0 1 1.2-1.2H14z"
				/>
			</svg>
		</a>
	{:else}
		<button
			type="button"
			class="pill-option"
			class:is-active={mode === 'lecture'}
			{disabled}
			onclick={() => onchange?.(false)}
		>
			<span class="pill-label">Lecture</span>
			<svg
				class="pill-icon"
				viewBox="0 0 16 16"
				aria-hidden="true"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
			>
				<path
					d="M2 3.5h4.5A1.5 1.5 0 0 1 8 5v8a1.2 1.2 0 0 0-1.2-1.2H2zM14 3.5H9.5A1.5 1.5 0 0 0 8 5v8a1.2 1.2 0 0 1 1.2-1.2H14z"
				/>
			</svg>
		</button>
	{/if}

	{#if hasConcordance}
		<a href={concordanceHref} class="pill-option" class:is-active={mode === 'concordance'}>
			<span class="pill-label">Concordance</span>
			<svg
				class="pill-icon"
				viewBox="0 0 16 16"
				aria-hidden="true"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
			>
				<path d="M6.5 9.5 9.5 6.5" stroke-linecap="round" />
				<path
					d="M7.8 4.6 8.9 3.5a2.4 2.4 0 0 1 3.4 3.4L11.2 8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M8.2 11.4 7.1 12.5a2.4 2.4 0 0 1-3.4-3.4L4.8 8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</a>
	{:else}
		<span class="pill-option is-unavailable" aria-disabled="true">
			<span class="pill-label">Concordance</span>
			<svg
				class="pill-icon"
				viewBox="0 0 16 16"
				aria-hidden="true"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
			>
				<path d="M6.5 9.5 9.5 6.5" stroke-linecap="round" />
				<path
					d="M7.8 4.6 8.9 3.5a2.4 2.4 0 0 1 3.4 3.4L11.2 8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M8.2 11.4 7.1 12.5a2.4 2.4 0 0 1-3.4-3.4L4.8 8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</span>
	{/if}

	{#if mode === 'concordance'}
		<a href={readerHref} class="pill-option" onclick={goEtude}>
			<span class="pill-label">Étude</span>
			<svg
				class="pill-icon"
				viewBox="0 0 16 16"
				aria-hidden="true"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
			>
				<circle cx="7" cy="7" r="4.5" />
				<path d="M10.5 10.5 14 14" stroke-linecap="round" />
			</svg>
		</a>
	{:else}
		<button
			type="button"
			class="pill-option"
			class:is-active={mode === 'etude'}
			{disabled}
			onclick={() => onchange?.(true)}
		>
			<span class="pill-label">Étude</span>
			<svg
				class="pill-icon"
				viewBox="0 0 16 16"
				aria-hidden="true"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
			>
				<circle cx="7" cy="7" r="4.5" />
				<path d="M10.5 10.5 14 14" stroke-linecap="round" />
			</svg>
		</button>
	{/if}
</div>

<style>
	.mode-pill {
		display: inline-flex;
		border: 1px solid color-mix(in srgb, var(--color-fg) 18%, transparent);
		border-radius: 999px;
		padding: 2px;
		background: color-mix(in srgb, var(--color-fg) 4%, transparent);
	}
	.pill-option {
		display: inline-flex;
		align-items: center;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.25rem 0.9rem;
		border-radius: 999px;
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		text-decoration: none;
		transition:
			background 150ms ease,
			color 150ms ease;
	}
	.pill-option:hover:not(.is-active):not(.is-unavailable) {
		color: var(--color-fg);
	}
	.pill-option.is-active {
		background: color-mix(in srgb, var(--color-accent) 18%, transparent);
		color: var(--color-accent);
		font-weight: 600;
	}
	.pill-option:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
	.pill-option:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.pill-option.is-unavailable {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.pill-icon {
		display: none;
		width: 15px;
		height: 15px;
	}
	/* Below 640px the nav row has no space for three words beside the chapter
	   chevrons, so the labels collapse to icons. The label is visually hidden
	   rather than removed, so the accessible name survives at every width. */
	@media (max-width: 639px) {
		.pill-label {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		.pill-icon {
			display: block;
		}
		.pill-option {
			padding: 0.25rem 0.6rem;
		}
	}
</style>
