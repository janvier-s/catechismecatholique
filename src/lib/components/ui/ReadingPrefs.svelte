<script lang="ts">
	import { prefs, updatePref } from '$lib/stores/prefs';
	import { FONTS, DYSLEXIA_FONT, getFontById } from '$lib/data/fonts';
	import { page } from '$app/state';
	import { corpusForPath, FEATURED } from '$lib/corpora';
	import { bibleResultVisible } from '$lib/stores/bibleResult';
	import PillGroup from './PillGroup.svelte';
	import ToggleSwitch from './ToggleSwitch.svelte';

	const isTrent = $derived(page.url.pathname.startsWith('/trente'));
	const isCompendium = $derived(page.url.pathname.startsWith('/compendium'));
	const isPiusX = $derived(page.url.pathname.startsWith('/grand-catechisme'));
	const isBibleOnly = $derived(page.url.pathname.startsWith('/bible'));
	const isCecOnly = $derived(!isTrent && !isCompendium && !isPiusX && !isBibleOnly);

	// /recherche renders a Bible passage through the same BibleBlock component
	// as the reader when a result carries a paragraph-mode excerpt · only the
	// verse-number settings actually do anything there (layout, headings,
	// Vulgate numbering and chapter nav don't apply outside the reader), so
	// this stays out of isBibleOnly rather than pulling in the whole section.
	const isBibleResult = $derived(page.url.pathname === '/recherche' && $bibleResultVisible);

	// Utility/navigation pages (home, Bibliothèque, glossaire, recherche…)
	// don't match any registered corpus prefix · nothing that acts on a body
	// of text applies there, so the reading-behavior settings are dropped
	// rather than offered as no-ops.
	const isReadingContent = $derived(
		FEATURED.some((f) => page.url.pathname.startsWith(f.urlPrefix)) ||
			corpusForPath(page.url.pathname) !== null
	);

	// The tabs split on a single axis: Apparence is how the page LOOKS,
	// Texte is what the page SHOWS. Never on corpus · that mixed axis is what
	// used to make a tab's meaning shift from one page to the next. Sections
	// inside Texte come and go with the content; the two labels never do.
	let activeTab: 'appearance' | 'text' = $state('appearance');

	// Bionic reading is a typographic treatment of the glyphs, like the font
	// choice it sits under · it belongs to Apparence, not to a tab of its own.
	const showBionic = $derived(isReadingContent);

	// Compendium and Pie X carry no notes at all, so on those (and on the
	// utility pages) Texte would hold nothing. Trente's only note control is
	// Sources · the cross-refs and Bible citations below it are CEC-only.
	const hasNotes = $derived(isReadingContent && (isTrent || isCecOnly));
	const hasTextSettings = $derived(isBibleOnly || hasNotes || isBibleResult);

	// No empty tab anywhere: where Texte has nothing to say, the tab bar goes
	// away and the panel is simply the Apparence controls.
	const showTabs = $derived(hasTextSettings);

	$effect(() => {
		if (!showTabs) activeTab = 'appearance';
	});

	let fontDropdownOpen = $state(false);
	let fontSectionEl: HTMLElement | undefined = $state();
	let fontTriggerEl: HTMLButtonElement | undefined = $state();
	let fontMenuPos: { top: number; left: number; width: number } = $state({
		top: 0,
		left: 0,
		width: 0
	});

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

	// Close the font dropdown when the user switches tabs · otherwise it
	// floats orphaned over the new tab's content.
	$effect(() => {
		// Read activeTab so this effect retracks on change.
		void activeTab;
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

	// Auto is intentionally omitted · users want an explicit choice here.
	const THEME_SWATCHES = [
		{
			id: 'light' as const,
			label: 'Clair',
			bg: '#fffdf9',
			fg: '#1c1710',
			lines: '#c8bfb0',
			title: 'Confortable en plein jour'
		},
		{
			id: 'sepia' as const,
			label: 'Sépia',
			bg: '#f2e8d8',
			fg: '#2c1e10',
			lines: '#c0a888',
			title: 'Ton chaud qui repose les yeux lors de longues lectures'
		},
		{
			id: 'dark' as const,
			label: 'Sombre',
			bg: '#111113',
			fg: '#e8ddd0',
			lines: '#2e2b32',
			title: 'Réduit l’éblouissement en lecture nocturne'
		},
		{
			id: 'oled' as const,
			label: 'OLED',
			bg: '#000000',
			fg: '#e0e0e0',
			lines: '#2a2a2a',
			title: 'Fond noir pur, économise la batterie sur écran OLED'
		}
	];

	const activeFont = $derived(getFontById($prefs.fontFamily) ?? FONTS[0]!);

	// Bible citations render either as inline "(Os 11, 1)" parentheses or as
	// superscript markers, never both · only one of these two hide-flags is
	// ever actually consulted at render time, so the visibility pill binds to
	// whichever one matches the current format instead of showing both.
	const bibleCiteHideKey = $derived(
		$prefs.inlineAsMarkers ? ('hideBibleMarkers' as const) : ('hideBibleInline' as const)
	);

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

	const TABS = [
		{
			id: 'appearance' as const,
			label: 'Apparence',
			title: 'Règle l’aspect de la page : couleurs, police, mise en forme du texte'
		},
		{
			id: 'text' as const,
			label: 'Texte',
			title: 'Choisit ce que le texte affiche : repères, titres, notes'
		}
	];
</script>

<div class="font-ui text-sm">
	{#if showTabs}
		<div class="flex border-b border-border mb-5 -mx-4 px-4 sticky top-0 z-10 bg-panel">
			{#each TABS as tab (tab.id)}
				<button
					type="button"
					class="flex-1 py-2.5 text-[11px] uppercase tracking-[0.12em] font-semibold border-b-2 -mb-px transition-colors
						{activeTab === tab.id
						? 'border-accent text-accent-text'
						: 'border-transparent text-subtle hover:text-foreground'}"
					onclick={() => (activeTab = tab.id)}
					title={tab.title}
				>
					{tab.label}
				</button>
			{/each}
		</div>
	{:else}
		<div class="mb-5"></div>
	{/if}

	{#if activeTab === 'appearance'}
		<div class="space-y-5">
			<div>
				<span
					class="block mb-2 text-muted text-[13px]"
					title="Change les couleurs de fond et de texte de la page">Thème</span
				>
				<div class="flex gap-2">
					{#each THEME_SWATCHES as t (t.id)}
						<button
							type="button"
							onclick={() => updatePref('theme', t.id)}
							class="theme-card flex-1 rounded border overflow-hidden transition-colors
								{$prefs.theme === t.id ? 'border-accent' : 'border-transparent'}"
							style="background: {t.bg};"
							aria-label={t.label}
							aria-pressed={$prefs.theme === t.id}
							title={t.title}
						>
							<div class="theme-card-inner">
								<div class="flex items-baseline gap-[3px] mb-[5px]">
									<span class="font-body text-[15px] leading-none font-bold" style="color: {t.fg};"
										>A</span
									>
									<span
										class="block h-[1.5px] flex-1 rounded-full"
										style="background: {t.fg}; opacity: 0.5;"
									></span>
								</div>
								<div class="space-y-[3px]">
									<span class="block h-[1.5px] rounded-full" style="background: {t.lines};"></span>
									<span class="block h-[1.5px] rounded-full" style="background: {t.lines};"></span>
									<span class="block h-[1.5px] w-[70%] rounded-full" style="background: {t.lines};"
									></span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<div>
				<span
					class="block mb-2 text-muted text-[13px]"
					title="Change la couleur utilisée pour les éléments actifs de l'interface"
					>Couleur d'accent</span
				>
				<PillGroup
					ariaLabel="Couleur d'accent"
					options={[
						{ label: 'Rouge', value: 'red' as const, title: "Couleur d'accent par défaut du site" },
						{
							label: 'Bleu',
							value: 'blue' as const,
							title: 'Plus distinct pour les personnes qui perçoivent mal le rouge'
						}
					]}
					value={$prefs.accentColor}
					onchange={(v) => updatePref('accentColor', v)}
				/>
			</div>

			<label class="block" title="Ajuste la taille du texte affiché à l'écran">
				<span class="block mb-2 text-muted text-[13px]"
					>Taille du texte&nbsp;: {$prefs.fontSize}px</span
				>
				<input
					type="range"
					min="13"
					max="22"
					step="1"
					value={$prefs.fontSize}
					oninput={(e) => updatePref('fontSize', parseInt(e.currentTarget.value, 10))}
					class="w-full accent-accent"
					title="Plus grand facilite la lecture, plus petit affiche davantage de texte à l’écran"
				/>
			</label>

			<div bind:this={fontSectionEl} data-font-menu>
				<span
					class="block mb-2 text-muted text-[13px]"
					title="Change la police du texte, avec une option adaptée à la dyslexie">Police</span
				>
				<button
					type="button"
					bind:this={fontTriggerEl}
					class="w-full border border-border rounded px-3 py-2 bg-background text-foreground text-left flex items-center justify-between text-[14px] font-medium"
					style="font-family: {activeFont.stack};"
					aria-haspopup="listbox"
					aria-expanded={fontDropdownOpen}
					title="Inclut une police adaptée à la dyslexie"
					onclick={() => (fontDropdownOpen ? closeFontMenu() : openFontMenu())}
				>
					<span>{activeFont.label}</span>
					<span class="text-[10px] text-subtle">{fontDropdownOpen ? '▲' : '▼'}</span>
				</button>
			</div>

			<div>
				<span
					class="block mb-2 text-muted text-[13px]"
					title="Ajuste l'espacement entre les lignes du texte">Interligne</span
				>
				<PillGroup
					ariaLabel="Interligne"
					options={[
						{
							label: 'Serré',
							value: 1.5,
							title: 'Affiche plus de texte à l’écran, lecture plus dense'
						},
						{ label: 'Standard', value: 1.6, title: 'Équilibre entre densité et lisibilité' },
						{
							label: 'Aéré',
							value: 2.0,
							title: 'Facilite le suivi ligne à ligne, utile en cas de fatigue visuelle'
						}
					]}
					value={$prefs.lineHeight}
					onchange={(v) => updatePref('lineHeight', v)}
				/>
			</div>

			<div class="hidden md:block">
				<span class="block mb-2 text-muted text-[13px]" title="Ajuste la largeur du texte à l'écran"
					>Largeur de colonne</span
				>
				<PillGroup
					ariaLabel="Largeur de colonne"
					options={[
						{
							label: 'Étroite',
							value: 'narrow' as const,
							title: 'Lignes plus courtes, plus faciles à suivre du regard'
						},
						{
							label: 'Standard',
							value: 'default' as const,
							title: 'Largeur équilibrée pour la lecture'
						},
						{
							label: 'Large',
							value: 'wide' as const,
							title: 'Utilise davantage l’espace de l’écran'
						}
					]}
					value={$prefs.columnWidth}
					onchange={(v) => updatePref('columnWidth', v)}
				/>
			</div>

			<div>
				<span
					class="block mb-2 text-muted text-[13px]"
					title="Aligne le texte à gauche ou le justifie des deux côtés">Alignement</span
				>
				<PillGroup
					ariaLabel="Alignement"
					options={[
						{
							label: 'À gauche',
							value: false,
							title: 'Espacement des mots régulier, sans grands blancs'
						},
						{
							label: 'Justifié',
							value: true,
							title: 'Bords alignés des deux côtés, mise en page plus soignée'
						}
					]}
					value={$prefs.justifiedText}
					onchange={(v) => updatePref('justifiedText', v)}
				/>
			</div>

			{#if showBionic}
				<div class="border-t border-border pt-4">
					<ToggleSwitch
						label="Lecture bionique"
						checked={$prefs.bionicReading}
						onchange={(v) => updatePref('bionicReading', v)}
						title="Met en gras le début de chaque mot pour guider l'œil pendant la lecture"
					/>
					{#if $prefs.bionicReading}
						<div class="mt-3 space-y-4">
							<div>
								<span
									class="block mb-2 text-muted text-[13px]"
									title="Règle la portion de chaque mot mise en gras"
									>Intensité <span class="text-subtle">({$prefs.bionicFixation}/5)</span></span
								>
								<input
									type="range"
									min="1"
									max="5"
									step="1"
									value={$prefs.bionicFixation}
									oninput={(e) => updatePref('bionicFixation', Number(e.currentTarget.value))}
									class="w-full accent-accent"
									aria-label="Intensité de la lecture bionique"
									title="Règle la portion de chaque mot mise en gras"
								/>
							</div>

							<div>
								<span
									class="block mb-2 text-muted text-[13px]"
									title="Règle la fréquence des mots mis en gras"
									>Saut de mots <span class="text-subtle">({$prefs.bionicSaccade})</span></span
								>
								<input
									type="range"
									min="0"
									max="4"
									step="1"
									value={$prefs.bionicSaccade}
									oninput={(e) => updatePref('bionicSaccade', Number(e.currentTarget.value))}
									class="w-full accent-accent"
									aria-label="Saut de mots de la lecture bionique"
									title="Un saut plus élevé met moins de mots en gras"
								/>
							</div>

							<div>
								<span class="block mb-2 text-muted text-[13px]" title="Règle l'épaisseur du gras"
									>Poids</span
								>
								<PillGroup
									ariaLabel="Poids de la lecture bionique"
									options={[
										{ label: 'Léger', value: 600 as const, title: 'Gras discret' },
										{ label: 'Épais', value: 700 as const, title: 'Gras plus marqué' }
									]}
									value={$prefs.bionicBoldWeight}
									onchange={(v) => updatePref('bionicBoldWeight', v)}
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if activeTab === 'text'}
		<div class="space-y-5">
			{#if isBibleOnly}
				<div>
					<span
						class="block mb-2 text-muted text-[13px]"
						title="Choisit comment le texte biblique est découpé à l'écran">Mise en page</span
					>
					<PillGroup
						ariaLabel="Mise en page"
						options={[
							{
								label: 'Verset par verset',
								value: 'verse' as const,
								title: 'Facilite le repérage d’un verset précis'
							},
							{
								label: 'Paragraphe',
								value: 'paragraph' as const,
								title: 'Lecture continue, comme un texte en prose'
							}
						]}
						value={$prefs.bibleLayout}
						onchange={(v) => updatePref('bibleLayout', v)}
					/>
				</div>
			{/if}

			{#if isBibleOnly || isBibleResult}
				<div class="space-y-1">
					<ToggleSwitch
						label="Numéros de verset"
						checked={!$prefs.hideVerseNumbers}
						onchange={(v) => updatePref('hideVerseNumbers', !v)}
						title="Affiche ou masque les numéros devant chaque verset"
					/>
					{#if !$prefs.hideVerseNumbers}
						<div class="pb-2 pl-3">
							<span
								class="block mb-2 text-muted text-[13px]"
								title="Change la couleur des numéros de verset">Couleur</span
							>
							<PillGroup
								ariaLabel="Couleur des numéros de verset"
								options={[
									{
										label: 'Accent',
										value: 'accent' as const,
										title: 'Numéros bien visibles, faciles à repérer'
									},
									{
										label: 'Discret',
										value: 'subtle' as const,
										title: 'Numéros estompés, moins de distraction'
									}
								]}
								value={$prefs.verseNumberColor}
								onchange={(v) => updatePref('verseNumberColor', v)}
							/>
						</div>
					{/if}

					{#if isBibleOnly}
						<ToggleSwitch
							label="Titres de section"
							checked={!$prefs.hideBibleHeadings}
							onchange={(v) => updatePref('hideBibleHeadings', !v)}
							title="Affiche ou masque les titres qui découpent le chapitre"
						/>

						<ToggleSwitch
							label="Numérotation Vulgate (psaumes)"
							checked={$prefs.showVulgatePsalms}
							onchange={(v) => updatePref('showVulgatePsalms', v)}
							title="La Vulgate numérote certains psaumes différemment de la Bible hébraïque"
						/>
					{/if}
				</div>
			{/if}

			{#if isBibleOnly}
				<div class="space-y-1 border-t border-border pt-4">
					<ToggleSwitch
						label="Navigation entre chapitres"
						checked={!$prefs.hideChapterNav}
						onchange={(v) => updatePref('hideChapterNav', !v)}
						title="Affiche ou masque les liens vers les chapitres voisins, sous le texte"
					/>

					<ToggleSwitch
						label="Scroll infini"
						checked={$prefs.infiniteScroll}
						onchange={(v) => updatePref('infiniteScroll', v)}
						title="Charge le chapitre suivant automatiquement en défilant"
					/>
				</div>
			{/if}

			{#if hasNotes}
				<div class="space-y-1">
					{#if isCecOnly}
						<ToggleSwitch
							label="Renvois entre paragraphes"
							checked={!$prefs.hideCrossRefs}
							onchange={(v) => updatePref('hideCrossRefs', !v)}
							title="Affiche ou masque les renvois vers d’autres paragraphes"
						/>
						{#if !$prefs.hideCrossRefs}
							<div class="pb-2 pl-3">
								<PillGroup
									ariaLabel="Position des renvois"
									options={[
										{
											label: 'En ligne',
											value: 'inline' as const,
											title: 'Renvois insérés juste après le paragraphe'
										},
										{
											label: 'En marge',
											value: 'side' as const,
											title: 'Renvois affichés à côté, texte principal dégagé'
										}
									]}
									value={$prefs.crossRefsLayout}
									onchange={(v) => updatePref('crossRefsLayout', v)}
								/>
							</div>
						{/if}

						<ToggleSwitch
							label="Citations bibliques"
							checked={!$prefs[bibleCiteHideKey]}
							onchange={(v) => updatePref(bibleCiteHideKey, !v)}
							title="Affiche ou masque les citations bibliques dans le texte"
						/>
						{#if !$prefs[bibleCiteHideKey]}
							<div class="pb-2 pl-3">
								<PillGroup
									ariaLabel="Format des citations bibliques"
									options={[
										{
											label: 'En ligne',
											value: false,
											title: 'Référence complète visible directement dans le texte'
										},
										{
											label: 'En exposant',
											value: true,
											title:
												'Petits chiffres renvoyant à la citation, comme une note de bas de page'
										}
									]}
									value={$prefs.inlineAsMarkers}
									onchange={(v) => updatePref('inlineAsMarkers', v)}
								/>
							</div>
						{/if}
					{/if}

					<ToggleSwitch
						label="Sources"
						checked={!$prefs.hideSourceFootnotes}
						onchange={(v) => updatePref('hideSourceFootnotes', !v)}
						title="Affiche ou masque les références aux documents d’origine (conciles, encycliques…)"
					/>
				</div>
			{/if}
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
</style>
