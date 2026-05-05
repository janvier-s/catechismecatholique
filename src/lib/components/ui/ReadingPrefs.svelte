<script lang="ts">
	import { prefs, updatePref } from '$lib/stores/prefs';
	import { FONTS, DYSLEXIA_FONT, getFontById } from '$lib/data/fonts';

	let activeTab: 'text' | 'reading' | 'notes' = $state('text');
	let fontDropdownOpen = $state(false);
	let fontSectionEl: HTMLElement | undefined = $state();
	let fontTriggerEl: HTMLButtonElement | undefined = $state();
	let fontMenuPos: { top: number; left: number; width: number } = $state({ top: 0, left: 0, width: 0 });

	function positionFontMenu() {
		if (!fontTriggerEl) return;
		const rect = fontTriggerEl.getBoundingClientRect();
		fontMenuPos = { top: rect.bottom + 2, left: rect.left, width: rect.width };
	}
	function openFontMenu() {
		positionFontMenu();
		fontDropdownOpen = true;
	}
	function closeFontMenu() {
		fontDropdownOpen = false;
	}
	function onWindowScroll() {
		if (fontDropdownOpen) positionFontMenu();
	}

	// Close the font dropdown when the user switches tabs — otherwise it
	// floats orphaned over the new tab's content.
	$effect(() => {
		// Read activeTab so this effect retracks on change.
		activeTab;
		fontDropdownOpen = false;
	});

	// Outside-click + Escape for the font dropdown. ModeToggle's handler
	// closes the whole popover when clicking outside `[data-prefs-menu]`,
	// so we only need to handle clicks INSIDE the popover that fall outside
	// the font menu's own surface.
	function onFontDocClick(e: MouseEvent) {
		if (!fontDropdownOpen) return;
		if (!(e.target instanceof Element)) return;
		if (e.target.closest('[data-font-menu]')) return;
		fontDropdownOpen = false;
	}
	function onFontKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && fontDropdownOpen) {
			fontDropdownOpen = false;
			fontTriggerEl?.focus();
		}
	}
	$effect(() => {
		if (!fontDropdownOpen) return;
		document.addEventListener('click', onFontDocClick, true);
		document.addEventListener('keydown', onFontKeydown);
		return () => {
			document.removeEventListener('click', onFontDocClick, true);
			document.removeEventListener('keydown', onFontKeydown);
		};
	});

	// Auto is intentionally omitted — users want an explicit choice here.
	const THEME_SWATCHES = [
		{ id: 'light' as const, label: 'Clair', bg: '#f8f5ef', fg: '#1c1710', lines: '#c8bfb0' },
		{ id: 'sepia' as const, label: 'Sépia', bg: '#f2e8d8', fg: '#2c1e10', lines: '#c0a888' },
		{ id: 'dark' as const, label: 'Sombre', bg: '#111113', fg: '#e8ddd0', lines: '#2e2b32' },
		{ id: 'oled' as const, label: 'OLED', bg: '#000000', fg: '#e0e0e0', lines: '#2a2a2a' }
	];

	const activeFont = $derived(getFontById($prefs.fontFamily) ?? FONTS[0]!);

	function setHideAll(on: boolean) {
		prefs.update((p) => ({
			...p,
			hideAllNotes: on,
			hideCrossRefs: on,
			hideBibleMarkers: on,
			hideBibleInline: on,
			hideSourceFootnotes: on
		}));
	}

	$effect(() => {
		const all =
			$prefs.hideCrossRefs &&
			$prefs.hideBibleMarkers &&
			$prefs.hideBibleInline &&
			$prefs.hideSourceFootnotes;
		if ($prefs.hideAllNotes !== all) {
			prefs.update((p) => ({ ...p, hideAllNotes: all }));
		}
	});

	$effect(() => {
		if (!fontDropdownOpen) return;
		const onScroll = () => onWindowScroll();
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', onScroll);
		return () => {
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', onScroll);
		};
	});
</script>

<div class="font-ui text-sm">
	<div
		class="flex border-b border-border mb-5 -mx-4 px-4 sticky top-0 z-10 bg-panel"
	>
		{#each [{ id: 'text' as const, label: 'Texte' }, { id: 'reading' as const, label: 'Lecture' }, { id: 'notes' as const, label: 'Notes' }] as tab (tab.id)}
			<button
				type="button"
				class="flex-1 py-2.5 text-[11px] uppercase tracking-[0.12em] font-semibold border-b-2 -mb-px transition-colors
					{activeTab === tab.id
					? 'border-accent text-accent-text'
					: 'border-transparent text-subtle hover:text-foreground'}"
				onclick={() => (activeTab = tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if activeTab === 'text'}
		<div class="space-y-5">
			<label class="block">
				<span class="block mb-2 text-muted text-[13px]">Taille du texte&nbsp;: {$prefs.fontSize}px</span>
				<input
					type="range"
					min="13"
					max="22"
					step="1"
					value={$prefs.fontSize}
					oninput={(e) => updatePref('fontSize', parseInt(e.currentTarget.value, 10))}
					class="w-full accent-accent"
				/>
			</label>

			<div>
				<span class="block mb-2 text-muted text-[13px]">Interligne</span>
				<div class="flex gap-1.5">
					{#each [{ label: 'Serré', value: 1.5 }, { label: 'Standard', value: 1.8 }, { label: 'Aéré', value: 2.0 }] as opt (opt.value)}
						<button
							type="button"
							class="flex-1 py-1.5 border rounded text-xs transition-colors
								{$prefs.lineHeight === opt.value
								? 'bg-accent/15 text-accent-text border-accent'
								: 'pill-border text-foreground hover:text-accent-text'}"
							onclick={() => updatePref('lineHeight', opt.value)}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<div bind:this={fontSectionEl} data-font-menu>
				<span class="block mb-2 text-muted text-[13px]">Police</span>
				<button
					type="button"
					bind:this={fontTriggerEl}
					class="w-full border border-border rounded px-3 py-2 bg-background text-foreground text-left flex items-center justify-between text-[14px] font-medium"
					style="font-family: {activeFont.stack};"
					aria-haspopup="listbox"
					aria-expanded={fontDropdownOpen}
					onclick={() => (fontDropdownOpen ? closeFontMenu() : openFontMenu())}
				>
					<span>{activeFont.label}</span>
					<span class="text-[10px] text-subtle">{fontDropdownOpen ? '▲' : '▼'}</span>
				</button>
			</div>

			<div>
				<span class="block mb-2 text-muted text-[13px]">Thème</span>
				<div class="flex gap-2">
					{#each THEME_SWATCHES as t (t.id)}
						<button
							type="button"
							title={t.label}
							onclick={() => updatePref('theme', t.id)}
							class="theme-card flex-1 rounded border overflow-hidden transition-colors
								{$prefs.theme === t.id ? 'border-accent' : 'border-transparent'}"
							style="background: {t.bg};"
							aria-label={t.label}
						>
							<div class="theme-card-inner">
								<div class="flex items-baseline gap-[3px] mb-[5px]">
									<span
										class="font-body text-[15px] leading-none font-bold"
										style="color: {t.fg};">A</span
									>
									<span
										class="block h-[1.5px] flex-1 rounded-full"
										style="background: {t.fg}; opacity: 0.5;"
									></span>
								</div>
								<div class="space-y-[3px]">
									<span class="block h-[1.5px] rounded-full" style="background: {t.lines};"></span>
									<span class="block h-[1.5px] rounded-full" style="background: {t.lines};"></span>
									<span class="block h-[1.5px] w-[70%] rounded-full" style="background: {t.lines};"></span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if activeTab === 'reading'}
		<div class="space-y-5">
			<div class="hidden md:block">
				<span class="block mb-2 text-muted text-[13px]">Largeur de colonne</span>
				<div class="flex gap-1.5">
					{#each [{ label: 'Étroite', value: 'narrow' as const }, { label: 'Standard', value: 'default' as const }, { label: 'Large', value: 'wide' as const }] as opt (opt.value)}
						<button
							type="button"
							class="flex-1 py-1.5 border rounded text-xs
								{$prefs.columnWidth === opt.value
								? 'bg-accent/15 text-accent-text border-accent'
								: 'pill-border text-foreground hover:text-accent-text'}"
							onclick={() => updatePref('columnWidth', opt.value)}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<span class="block mb-2 text-muted text-[13px]">Alignement</span>
				<div class="flex gap-1.5">
					<button
						type="button"
						class="flex-1 py-1.5 border rounded text-xs
							{!$prefs.justifiedText
							? 'bg-accent/15 text-accent-text border-accent'
							: 'pill-border text-foreground hover:text-accent-text'}"
						onclick={() => updatePref('justifiedText', false)}
					>
						À gauche
					</button>
					<button
						type="button"
						class="flex-1 py-1.5 border rounded text-xs
							{$prefs.justifiedText
							? 'bg-accent/15 text-accent-text border-accent'
							: 'pill-border text-foreground hover:text-accent-text'}"
						onclick={() => updatePref('justifiedText', true)}
					>
						Justifié
					</button>
				</div>
			</div>

			<div>
				<span class="block mb-2 text-muted text-[13px]">Renvois (§)</span>
				<div class="flex gap-1.5">
					<button
						type="button"
						class="flex-1 py-1.5 border rounded text-xs
							{$prefs.crossRefsLayout === 'inline'
							? 'bg-accent/15 text-accent-text border-accent'
							: 'pill-border text-foreground hover:text-accent-text'}"
						onclick={() => updatePref('crossRefsLayout', 'inline')}
					>
						En ligne
					</button>
					<button
						type="button"
						class="flex-1 py-1.5 border rounded text-xs
							{$prefs.crossRefsLayout === 'side'
							? 'bg-accent/15 text-accent-text border-accent'
							: 'pill-border text-foreground hover:text-accent-text'}"
						onclick={() => updatePref('crossRefsLayout', 'side')}
					>
						En marge
					</button>
				</div>
			</div>

			<div>
				<span class="block mb-2 text-muted text-[13px]">Réfs. bibliques</span>
				<div class="flex gap-1.5">
					<button
						type="button"
						class="flex-1 py-1.5 border rounded text-xs
							{!$prefs.inlineAsMarkers
							? 'bg-accent/15 text-accent-text border-accent'
							: 'pill-border text-foreground hover:text-accent-text'}"
						onclick={() => updatePref('inlineAsMarkers', false)}
					>
						En ligne
					</button>
					<button
						type="button"
						class="flex-1 py-1.5 border rounded text-xs
							{$prefs.inlineAsMarkers
							? 'bg-accent/15 text-accent-text border-accent'
							: 'pill-border text-foreground hover:text-accent-text'}"
						onclick={() => updatePref('inlineAsMarkers', true)}
					>
						En exposant
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if activeTab === 'notes'}
		<div class="space-y-4">
			<label class="flex items-center gap-2.5 cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.hideAllNotes}
					onchange={(e) => setHideAll(e.currentTarget.checked)}
					class="prefs-check-input"
				/>
				<span class="prefs-check" aria-hidden="true">
					{#if $prefs.hideAllNotes}<span class="prefs-check-mark">✓</span>{/if}
				</span>
				<span class="font-semibold">Masquer toutes les notes</span>
			</label>
			<div class="pl-6 space-y-3 text-[14px] border-l border-border ml-1.5">
				<label class="flex items-center gap-2.5 cursor-pointer">
					<input
						type="checkbox"
						checked={$prefs.hideCrossRefs}
						onchange={(e) => updatePref('hideCrossRefs', e.currentTarget.checked)}
						class="prefs-check-input"
					/>
					<span class="prefs-check" aria-hidden="true">
						{#if $prefs.hideCrossRefs}<span class="prefs-check-mark">✓</span>{/if}
					</span>
					<span>Renvois (§)</span>
				</label>
				<label class="flex items-center gap-2.5 cursor-pointer">
					<input
						type="checkbox"
						checked={$prefs.hideBibleInline}
						onchange={(e) => updatePref('hideBibleInline', e.currentTarget.checked)}
						class="prefs-check-input"
					/>
					<span class="prefs-check" aria-hidden="true">
						{#if $prefs.hideBibleInline}<span class="prefs-check-mark">✓</span>{/if}
					</span>
					<span>Réfs. bibliques en ligne</span>
				</label>
				<label class="flex items-center gap-2.5 cursor-pointer">
					<input
						type="checkbox"
						checked={$prefs.hideBibleMarkers}
						onchange={(e) => updatePref('hideBibleMarkers', e.currentTarget.checked)}
						class="prefs-check-input"
					/>
					<span class="prefs-check" aria-hidden="true">
						{#if $prefs.hideBibleMarkers}<span class="prefs-check-mark">✓</span>{/if}
					</span>
					<span>Réfs. bibliques en exposant</span>
				</label>
				<label class="flex items-center gap-2.5 cursor-pointer">
					<input
						type="checkbox"
						checked={$prefs.hideSourceFootnotes}
						onchange={(e) => updatePref('hideSourceFootnotes', e.currentTarget.checked)}
						class="prefs-check-input"
					/>
					<span class="prefs-check" aria-hidden="true">
						{#if $prefs.hideSourceFootnotes}<span class="prefs-check-mark">✓</span>{/if}
					</span>
					<span>Sources</span>
				</label>
			</div>
		</div>
	{/if}
</div>

{#if fontDropdownOpen}
	<div
		data-prefs-menu
		data-font-menu
		role="listbox"
		class="fixed bg-panel border border-border rounded shadow-lg z-[var(--z-floating)] overflow-hidden"
		style:top="{fontMenuPos.top}px"
		style:left="{fontMenuPos.left}px"
		style:width="{fontMenuPos.width}px"
	>
		{#each FONTS as f (f.id)}
			{#if f.dividerBefore}
				<div class="border-t border-border my-0.5"></div>
			{/if}
			<button
				type="button"
				class="w-full text-left px-3 py-2 text-[14px] hover:bg-accent/10 hover:text-accent-text
					{$prefs.fontFamily === f.id ? 'text-accent-text' : 'text-foreground'}"
				style="font-family: {f.stack};"
				onclick={() => {
					updatePref('fontFamily', f.id);
					closeFontMenu();
				}}
			>
				{f.label}
			</button>
		{/each}
		<button
			type="button"
			class="w-full text-left px-3 py-2 text-[14px] hover:bg-accent/10 hover:text-accent-text border-t border-border
				{$prefs.fontFamily === DYSLEXIA_FONT.id ? 'text-accent-text' : 'text-foreground'}"
			style="font-family: {DYSLEXIA_FONT.stack};"
			onclick={() => {
				updatePref('fontFamily', DYSLEXIA_FONT.id);
				closeFontMenu();
			}}
		>
			{DYSLEXIA_FONT.label}
		</button>
	</div>
{/if}

<style>
	.theme-card {
		aspect-ratio: 3 / 4;
	}
	.theme-card-inner {
		height: 100%;
		padding: 8px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	/* Inactive segmented-pill border — `--color-border` reads too quiet on
	   the warm panel; this pulls a stronger hairline derived from the
	   foreground colour so the controls are visibly bounded at rest. */
	.pill-border {
		border-color: color-mix(in srgb, var(--color-fg) 22%, transparent);
	}
	.pill-border:hover {
		border-color: color-mix(in srgb, var(--color-fg) 35%, transparent);
	}

	/* Hairline checkbox — native input is visually hidden but kept in flow
	   for keyboard + a11y. The adjacent .prefs-check span is the visual
	   surface and reflects checked state via the serif checkmark glyph. */
	.prefs-check-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.prefs-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		flex: none;
		border: 1px solid color-mix(in srgb, var(--color-fg) 30%, transparent);
		border-radius: 2px;
		background: transparent;
		transition: border-color 120ms ease;
	}
	.prefs-check-input:checked + .prefs-check {
		border-color: var(--color-accent);
	}
	.prefs-check-input:focus-visible + .prefs-check {
		outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
		outline-offset: 2px;
	}
	.prefs-check-mark {
		font-family: var(--font-body);
		font-size: 12px;
		line-height: 1;
		color: var(--color-accent-text);
		/* Optical alignment — Libre Baskerville's check sits a hair high. */
		transform: translateY(-0.5px);
	}
</style>
