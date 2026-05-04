<script lang="ts">
	import { loadStructure } from '$lib/data/loaders';

	type Range = { from: number; to: number };
	type Part = {
		slug: string;
		title: string;
		number?: number;
		prologue?: boolean;
		range?: Range;
	};

	const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

	let parts: Part[] = $state([]);
	let prologue: Part | null = $state(null);
	let open = $state(false);
	let activeIndex = $state(-1);
	let panelEl: HTMLDivElement | undefined = $state();
	let triggerEl: HTMLButtonElement | undefined = $state();
	let containerEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		(async () => {
			const struct = (await loadStructure()) as { parts: Part[] };
			prologue = struct.parts.find((p) => p.prologue) ?? null;
			parts = struct.parts.filter((p) => !p.prologue);
		})();
	});

	// Total navigable items (prologue + 4 parts + sommaire link)
	const itemCount = $derived(parts.length + (prologue ? 1 : 0) + 1);

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				close();
				triggerEl?.focus();
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				activeIndex = (activeIndex + 1) % itemCount;
				focusItem(activeIndex);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				activeIndex = (activeIndex - 1 + itemCount) % itemCount;
				focusItem(activeIndex);
			} else if (e.key === 'Home') {
				e.preventDefault();
				activeIndex = 0;
				focusItem(activeIndex);
			} else if (e.key === 'End') {
				e.preventDefault();
				activeIndex = itemCount - 1;
				focusItem(activeIndex);
			}
		};
		const onClick = (e: MouseEvent) => {
			const t = e.target as Node | null;
			if (containerEl && t && !containerEl.contains(t)) close();
		};
		document.addEventListener('keydown', onKey);
		document.addEventListener('mousedown', onClick);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('mousedown', onClick);
		};
	});

	function focusItem(i: number) {
		const items = panelEl?.querySelectorAll<HTMLElement>('[data-menuitem]');
		items?.[i]?.focus();
	}

	function close() {
		open = false;
		activeIndex = -1;
	}

	function toggle() {
		if (open) close();
		else {
			open = true;
			activeIndex = -1;
		}
	}

	function fmtRange(r: Range | undefined): string {
		if (!r) return '';
		return r.from === r.to ? `§${r.from}` : `§§ ${r.from}–${r.to}`;
	}
</script>

<div class="catdrop" bind:this={containerEl}>
	<button
		type="button"
		bind:this={triggerEl}
		class="catdrop-trigger font-ui text-sm font-semibold"
		class:is-open={open}
		onclick={toggle}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-controls="catechism-menu"
	>
		<span>Catéchisme</span>
		<span class="caret" aria-hidden="true">
			<svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
				<path d="M1 1.25 L5 4.75 L9 1.25" />
			</svg>
		</span>
	</button>

	{#if open}
		<div
			id="catechism-menu"
			class="catdrop-panel"
			role="menu"
			tabindex="-1"
			bind:this={panelEl}
		>
			<!-- Decorative top corners + hairline ornament -->
			<div class="ornament-top" aria-hidden="true">
				<span class="rule rule-l"></span>
				<span class="fleuron">✠</span>
				<span class="rule rule-r"></span>
			</div>

			<p class="eyebrow" aria-hidden="true">
				Catéchisme &middot; Table des Matières
			</p>

			<!-- Prologue: a slim line item set apart from the four parts -->
			{#if prologue}
				<a
					href="/ccc/{prologue.slug}"
					class="prologue"
					role="menuitem"
					data-menuitem
					tabindex="-1"
					onclick={close}
				>
					<span class="prologue-label">Prologue</span>
					{#if prologue.range}
						<span class="prologue-range">{fmtRange(prologue.range)}</span>
					{/if}
				</a>
			{/if}

			<!-- The four parts as a typeset contents list -->
			<ol class="parts" role="none">
				{#each parts as part, i (part.slug)}
					<li class="part-row" role="none">
						<a
							href="/ccc/{part.slug}"
							class="part"
							role="menuitem"
							data-menuitem
							tabindex="-1"
							onclick={close}
							onmouseenter={() => (activeIndex = (prologue ? 1 : 0) + i)}
							onfocus={() => (activeIndex = (prologue ? 1 : 0) + i)}
						>
							<span class="numeral" aria-hidden="true">{ROMAN[part.number ?? 0]}</span>
							<span class="part-body">
								<span class="part-kicker">Partie&nbsp;{part.number}</span>
								<span class="part-title">{part.title}</span>
								{#if part.range}
									<span class="part-range">{fmtRange(part.range)}</span>
								{/if}
							</span>
							<span class="chevron" aria-hidden="true">
								<svg viewBox="0 0 6 10" width="6" height="10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
									<path d="M1.25 1 L4.75 5 L1.25 9" />
								</svg>
							</span>
						</a>
					</li>
				{/each}
			</ol>

			<!-- Bottom: link to full sommaire -->
			<a
				href="/ccc/sommaire"
				class="sommaire-link"
				role="menuitem"
				data-menuitem
				tabindex="-1"
				onclick={close}
			>
				<span class="sommaire-fleuron" aria-hidden="true">✠</span>
				<span class="sommaire-label">Sommaire complet</span>
				<span class="sommaire-arrow" aria-hidden="true">→</span>
			</a>
		</div>
	{/if}
</div>

<style>
	.catdrop {
		position: relative;
	}

	/* Trigger ----------------------------------------------------------- */
	.catdrop-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: inherit;
		background: transparent;
		border: 0;
		padding: 0;
		cursor: pointer;
		transition: color 140ms ease;
	}
	.catdrop-trigger:hover,
	.catdrop-trigger.is-open {
		color: var(--color-accent);
	}
	.caret {
		display: inline-flex;
		opacity: 0.55;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease;
	}
	.catdrop-trigger.is-open .caret {
		transform: rotate(180deg);
		opacity: 1;
	}

	/* Panel ------------------------------------------------------------- */
	.catdrop-panel {
		position: absolute;
		top: calc(100% + 14px);
		right: 0;
		width: min(92vw, 420px);
		background: var(--color-panel);
		color: var(--color-fg);
		border-radius: 5px;
		padding: 1.4rem 1.5rem 1.1rem;
		box-shadow:
			0 1px 0 color-mix(in srgb, var(--color-fg) 6%, transparent),
			0 18px 38px -16px color-mix(in srgb, var(--color-fg) 30%, transparent),
			0 4px 12px -6px color-mix(in srgb, var(--color-fg) 18%, transparent);
		z-index: 40;
		transform-origin: top right;
		animation: panel-in 170ms cubic-bezier(0.22, 1, 0.36, 1);
		/* Subtle hairline tint instead of a hard border */
		outline: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
		outline-offset: -1px;
	}

	/* Tiny caret pointer above the panel */
	.catdrop-panel::before {
		content: '';
		position: absolute;
		top: -6px;
		right: 22px;
		width: 12px;
		height: 12px;
		background: var(--color-panel);
		transform: rotate(45deg);
		box-shadow: -1px -1px 0 0 color-mix(in srgb, var(--color-border) 70%, transparent);
	}

	@keyframes panel-in {
		from {
			opacity: 0;
			transform: translateY(-4px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* Top ornament ----------------------------------------------------- */
	.ornament-top {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		margin: -0.2rem 0 0.45rem;
	}
	.ornament-top .fleuron {
		font-family: var(--font-heading);
		font-size: 0.95rem;
		color: var(--color-accent);
		line-height: 1;
		user-select: none;
	}
	.ornament-top .rule {
		flex: 1 1 auto;
		max-width: 80px;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 22%, transparent),
			color-mix(in srgb, var(--color-fg) 22%, transparent)
		);
	}
	.ornament-top .rule-r {
		background: linear-gradient(
			to right,
			color-mix(in srgb, var(--color-fg) 22%, transparent),
			color-mix(in srgb, var(--color-fg) 22%, transparent),
			transparent
		);
	}

	/* Eyebrow label ---------------------------------------------------- */
	.eyebrow {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-align: center;
		margin: 0 0 1rem;
	}

	/* Prologue --------------------------------------------------------- */
	.prologue {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.55rem 0.7rem;
		margin: 0 -0.4rem 0.3rem;
		border-radius: 4px;
		text-decoration: none;
		color: var(--color-fg);
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 0.95rem;
		transition: background-color 130ms ease, color 130ms ease;
	}
	.prologue:hover,
	.prologue:focus-visible {
		background-color: color-mix(in srgb, var(--color-accent) 7%, transparent);
		color: var(--color-accent);
	}
	.prologue:focus-visible {
		outline: none;
	}
	.prologue-range {
		font-family: var(--font-ui);
		font-style: normal;
		font-size: 0.65rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-subtle);
		font-variant-numeric: oldstyle-nums;
	}

	/* Parts list ------------------------------------------------------- */
	.parts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.part-row {
		position: relative;
	}
	/* Hairline rule between parts (gradient-fade so it feels printed). */
	.part-row + .part-row::before {
		content: '';
		position: absolute;
		top: 0;
		left: 8%;
		right: 8%;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 12%, transparent) 25%,
			color-mix(in srgb, var(--color-fg) 12%, transparent) 75%,
			transparent
		);
		pointer-events: none;
	}

	.part {
		display: grid;
		grid-template-columns: 2.4rem 1fr auto;
		align-items: center;
		gap: 0.85rem;
		padding: 0.7rem 0.7rem;
		margin: 0 -0.4rem;
		border-radius: 4px;
		text-decoration: none;
		color: var(--color-fg);
		transition: background-color 130ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.part:hover,
	.part:focus-visible {
		background-color: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
	.part:focus-visible {
		outline: none;
	}
	.part:hover .numeral,
	.part:focus-visible .numeral {
		color: var(--color-accent);
	}
	.part:hover .chevron,
	.part:focus-visible .chevron {
		opacity: 1;
		transform: translateX(2px);
	}

	.numeral {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: 0.06em;
		text-align: center;
		color: color-mix(in srgb, var(--color-fg) 55%, transparent);
		transition: color 140ms ease;
		font-variant-numeric: oldstyle-nums;
	}

	.part-body {
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
		min-width: 0;
	}
	.part-kicker {
		font-family: var(--font-ui);
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--color-subtle);
	}
	.part-title {
		font-family: var(--font-heading);
		font-size: 0.95rem;
		line-height: 1.3;
		color: var(--color-fg);
		font-feature-settings: 'liga' on, 'kern' on;
	}
	.part-range {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 500;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-subtle);
		margin-top: 0.18rem;
		font-variant-numeric: oldstyle-nums;
	}

	.chevron {
		display: inline-flex;
		color: color-mix(in srgb, var(--color-fg) 35%, transparent);
		opacity: 0.65;
		transition: opacity 160ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1), color 140ms ease;
	}
	.part:hover .chevron,
	.part:focus-visible .chevron {
		color: var(--color-accent);
	}

	/* Sommaire link --------------------------------------------------- */
	.sommaire-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		margin-top: 1rem;
		padding: 0.6rem 0.7rem 0.5rem;
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 500;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
		transition: color 140ms ease;
	}
	.sommaire-link:hover,
	.sommaire-link:focus-visible {
		color: var(--color-accent);
	}
	.sommaire-link:focus-visible {
		outline: none;
	}
	.sommaire-fleuron {
		font-family: var(--font-heading);
		font-size: 0.78rem;
		letter-spacing: 0;
		color: var(--color-accent);
		font-weight: 400;
	}
	.sommaire-arrow {
		font-family: var(--font-heading);
		font-size: 0.85rem;
		letter-spacing: 0;
		transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.sommaire-link:hover .sommaire-arrow {
		transform: translateX(3px);
	}

	/* Reduced motion --------------------------------------------------- */
	@media (prefers-reduced-motion: reduce) {
		.catdrop-panel {
			animation: none;
		}
		.caret,
		.chevron,
		.sommaire-arrow {
			transition: none;
		}
	}

	/* Mobile ----------------------------------------------------------- */
	@media (max-width: 480px) {
		.catdrop-panel {
			right: -8px;
			width: min(96vw, 380px);
			padding: 1.15rem 1.2rem 0.95rem;
		}
		.catdrop-panel::before {
			right: 30px;
		}
	}
</style>
