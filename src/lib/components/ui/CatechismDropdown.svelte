<script lang="ts">
	import { loadStructure } from '$lib/data/loaders';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';

	// Hover-intent timer: the trigger sits in the topbar (right side), the
	// panel is fixed-positioned at page center — the cursor has to traverse
	// a wide diagonal gap to get from one to the other. Local mouseenter on
	// the trigger and panel isn't enough: when the panel pops open near the
	// cursor, no entry event fires, and mouseleave on the trigger then
	// closes it before the cursor can land on the panel. We track the
	// cursor globally while open and cancel the close whenever it's inside
	// either box.
	let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;
	function cancelClose() {
		if (hoverCloseTimer) {
			clearTimeout(hoverCloseTimer);
			hoverCloseTimer = null;
		}
	}
	function scheduleClose() {
		cancelClose();
		hoverCloseTimer = setTimeout(() => {
			open = false;
		}, 800);
	}

	type Range = { from: number; to: number };
	type Article = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
	};
	type Chapter = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
		articles?: Article[];
		headings?: Heading[];
	};
	type Heading = {
		id: string;
		level: number;
		title: string;
		paragraph_start: number;
	};
	type Section = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
		chapters?: Chapter[];
		articles_direct?: Article[];
	};
	type Part = {
		slug: string;
		title: string;
		number?: number;
		prologue?: boolean;
		range?: Range;
		sections?: Section[];
	};

	const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

	let parts: Part[] = $state([]);
	let prologue: Part | null = $state(null);
	let open = $state(false);
	let panelEl: HTMLDivElement | undefined = $state();
	let triggerEl: HTMLButtonElement | undefined = $state();
	let containerEl: HTMLDivElement | undefined = $state();
	let isMobile = $state(false);

	// While the panel is open, watch the cursor against the trigger and panel
	// bounding rects. If it sits inside either, cancel any pending close. If
	// it's outside both, start the close timer. This catches the case where
	// the panel opens near the cursor with no boundary crossing — local
	// mouseenter wouldn't fire there.
	$effect(() => {
		if (!open) return;
		const onMove = (e: MouseEvent) => {
			const t = containerEl?.getBoundingClientRect();
			const p = panelEl?.getBoundingClientRect();
			const cx = e.clientX;
			const cy = e.clientY;
			const inTrigger =
				t && cx >= t.left && cx <= t.right && cy >= t.top && cy <= t.bottom;
			const inPanel =
				p && cx >= p.left && cx <= p.right && cy >= p.top && cy <= p.bottom;
			if (inTrigger || inPanel) cancelClose();
			else scheduleClose();
		};
		document.addEventListener('mousemove', onMove);
		return () => document.removeEventListener('mousemove', onMove);
	});

	// Cascade state — slug-based so we don't mismatch indices across data shapes
	let activePartSlug = $state<string | null>(null);
	let activeSectionSlug = $state<string | null>(null);
	let activeChapterSlug = $state<string | null>(null);

	// Current page slugs derived from the URL — used to pre-populate the
	// cascade on open and to mark the matching article cell in column 4.
	const currentSlugs = $derived.by(() => {
		const m = page.url.pathname.match(
			/^\/ccc\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?(?:\/([^/]+))?/
		);
		if (!m) return null;
		return {
			part: m[1] ?? null,
			section: m[2] ?? null,
			chapter: m[3] ?? null,
			article: m[4] ?? null
		};
	});

	// Keyboard cursor: column index 0..3 + item index inside that column
	let kbCol = $state<0 | 1 | 2 | 3>(0);
	let kbIndex = $state(0);

	$effect(() => {
		(async () => {
			const struct = (await loadStructure()) as { parts: Part[] };
			prologue = struct.parts.find((p) => p.prologue) ?? null;
			parts = struct.parts.filter((p) => !p.prologue);
		})();
	});

	// Mobile detection — collapse cascade on narrow viewports
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(max-width: 720px)');
		const apply = () => (isMobile = mq.matches);
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});

	// Items as displayed in column 1 (prologue first, then parts)
	type Col1Item =
		| { kind: 'prologue'; item: Part }
		| { kind: 'part'; item: Part };
	const col1Items = $derived<Col1Item[]>([
		...(prologue ? [{ kind: 'prologue' as const, item: prologue }] : []),
		...parts.map((p) => ({ kind: 'part' as const, item: p }))
	]);

	const activePart = $derived<Part | null>(
		parts.find((p) => p.slug === activePartSlug) ?? null
	);

	const col2Items = $derived<Section[]>(activePart?.sections ?? []);

	const activeSection = $derived<Section | null>(
		col2Items.find((s) => s.slug === activeSectionSlug) ?? null
	);

	// Section can carry chapters OR direct articles (no chapters). When direct
	// articles, we collapse col 3 into "—" placeholder and show articles in col 4.
	const col3Items = $derived<Chapter[]>(activeSection?.chapters ?? []);
	const sectionDirectArticles = $derived<Article[]>(activeSection?.articles_direct ?? []);

	const activeChapter = $derived<Chapter | null>(
		col3Items.find((c) => c.slug === activeChapterSlug) ?? null
	);

	type Col4Item =
		| { kind: 'article'; data: Article }
		| { kind: 'heading'; data: Heading };

	// Column 4 prefers articles. When the active chapter has none (e.g. P1S1C1
	// goes straight to Roman-numeral subdivisions), fall back to its headings
	// so the column never reads as empty.
	const col4Items = $derived<Col4Item[]>(
		sectionDirectArticles.length > 0
			? sectionDirectArticles.map((a) => ({ kind: 'article' as const, data: a }))
			: (activeChapter?.articles ?? []).length > 0
				? (activeChapter!.articles ?? []).map((a) => ({ kind: 'article' as const, data: a }))
				: (activeChapter?.headings ?? []).map((h) => ({ kind: 'heading' as const, data: h }))
	);

	const col4Heading = $derived(
		sectionDirectArticles.length > 0 || (activeChapter?.articles ?? []).length > 0
			? 'Articles'
			: 'Sections'
	);

	// Pre-populate cascade. When the user is on a deep CCC URL, follow it so
	// the dropdown opens revealing the current location instead of always
	// the first part. Falls back to the first part when the URL doesn't
	// resolve into the structure (e.g. /ccc, /ccc/sommaire).
	$effect(() => {
		if (!open) return;
		if (parts.length === 0) return;
		if (activePartSlug) return; // don't override mid-hover

		const cur = currentSlugs;
		const matchedPart = cur ? parts.find((p) => p.slug === cur.part) : null;
		if (matchedPart) {
			activePartSlug = matchedPart.slug;
			const matchedSection =
				matchedPart.sections?.find((s) => s.slug === cur!.section) ??
				matchedPart.sections?.[0] ??
				null;
			activeSectionSlug = matchedSection?.slug ?? null;
			const matchedChapter =
				matchedSection?.chapters?.find((c) => c.slug === cur!.chapter) ??
				matchedSection?.chapters?.[0] ??
				null;
			activeChapterSlug = matchedChapter?.slug ?? null;
			return;
		}

		const first = parts[0];
		if (!first) return;
		activePartSlug = first.slug;
		activeSectionSlug = first.sections?.[0]?.slug ?? null;
		activeChapterSlug = first.sections?.[0]?.chapters?.[0]?.slug ?? null;
	});

	function setActivePart(p: Part) {
		if (p.prologue) {
			// Prologue has no children — keep current cascade revealed but visually
			// mark prologue active. Clicking navigates instead.
			return;
		}
		activePartSlug = p.slug;
		const firstSec = p.sections?.[0] ?? null;
		activeSectionSlug = firstSec?.slug ?? null;
		activeChapterSlug = firstSec?.chapters?.[0]?.slug ?? null;
	}

	function setActiveSection(s: Section) {
		activeSectionSlug = s.slug;
		activeChapterSlug = s.chapters?.[0]?.slug ?? null;
	}

	function setActiveChapter(c: Chapter) {
		activeChapterSlug = c.slug;
	}

	function close() {
		open = false;
		kbCol = 0;
		kbIndex = 0;
	}

	function toggle() {
		if (open) close();
		else {
			open = true;
			kbCol = 0;
			kbIndex = 0;
		}
	}

	function articleHref(a: Article): string {
		const part = activePartSlug;
		const section = activeSectionSlug;
		// articles_direct on section have no chapter segment
		if (sectionDirectArticles.length > 0) {
			return `/ccc/${part}/${section}/${a.slug}`;
		}
		const chap = activeChapterSlug;
		return `/ccc/${part}/${section}/${chap}/${a.slug}`;
	}

	function chapterHref(c: Chapter): string {
		return `/ccc/${activePartSlug}/${activeSectionSlug}/${c.slug}`;
	}

	function headingHref(h: Heading): string {
		return `/ccc/${activePartSlug}/${activeSectionSlug}/${activeChapterSlug}#${h.id}`;
	}

	function sectionHref(s: Section): string {
		return `/ccc/${activePartSlug}/${s.slug}`;
	}

	function fmtRange(r: Range | undefined): string {
		if (!r) return '';
		return r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`;
	}

	// Column lengths for keyboard navigation bounds
	const colLengths = $derived([
		col1Items.length,
		col2Items.length,
		col3Items.length,
		col4Items.length
	]);

	function focusKb() {
		const sel = `[data-kb-col="${kbCol}"][data-kb-index="${kbIndex}"]`;
		const el = panelEl?.querySelector<HTMLElement>(sel);
		el?.focus();
	}

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				close();
				triggerEl?.focus();
				return;
			}
			if (isMobile) return; // simpler nav on mobile (browser default)

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				const len = colLengths[kbCol] || 0;
				if (len > 0) {
					kbIndex = (kbIndex + 1) % len;
					syncCascadeToCursor();
					focusKb();
				}
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				const len = colLengths[kbCol] || 0;
				if (len > 0) {
					kbIndex = (kbIndex - 1 + len) % len;
					syncCascadeToCursor();
					focusKb();
				}
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				if (kbCol < 3) {
					const next = (kbCol + 1) as 0 | 1 | 2 | 3;
					if ((colLengths[next] || 0) > 0) {
						kbCol = next;
						kbIndex = 0;
						focusKb();
					}
				}
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				if (kbCol > 0) {
					kbCol = (kbCol - 1) as 0 | 1 | 2 | 3;
					kbIndex = 0;
					focusKb();
				}
			} else if (e.key === 'Home') {
				e.preventDefault();
				kbIndex = 0;
				focusKb();
			} else if (e.key === 'End') {
				e.preventDefault();
				const len = colLengths[kbCol] || 0;
				kbIndex = Math.max(0, len - 1);
				focusKb();
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

	// As the keyboard cursor moves down a column, mirror cascade reveals
	function syncCascadeToCursor() {
		if (kbCol === 0) {
			const it = col1Items[kbIndex];
			if (!it) return;
			if (it.kind === 'part') setActivePart(it.item);
		} else if (kbCol === 1) {
			const s = col2Items[kbIndex];
			if (s) setActiveSection(s);
		} else if (kbCol === 2) {
			const c = col3Items[kbIndex];
			if (c) setActiveChapter(c);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="catdrop"
	bind:this={containerEl}
	onmouseenter={() => {
		cancelClose();
		open = true;
	}}
	onmouseleave={scheduleClose}
>
	<button
		type="button"
		bind:this={triggerEl}
		class="catdrop-trigger font-ui text-sm font-semibold"
		class:is-open={open}
		onclick={toggle}
		onfocus={() => (open = true)}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-controls="catechism-menu"
	>
		<span>Catéchisme</span>
		<span class="caret" aria-hidden="true">
			<svg
				viewBox="0 0 10 6"
				width="10"
				height="6"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M1 1.25 L5 4.75 L9 1.25" />
			</svg>
		</span>
	</button>

	{#if open}
		<div
			id="catechism-menu"
			class="catdrop-panel"
			class:is-mobile={isMobile}
			role="menu"
			tabindex="-1"
			bind:this={panelEl}
			aria-label="Catéchisme — table des matières"
			onmouseenter={cancelClose}
			onmouseleave={scheduleClose}
			transition:fade={{ duration: 140 }}
		>
			<div class="ornament-top" aria-hidden="true">
				<span class="rule rule-l"></span>
				<span class="fleuron">✠</span>
				<span class="rule rule-r"></span>
			</div>

			{#if isMobile}
				<!-- Mobile fallback: simple single-column list (parts + prologue) -->
				<p class="eyebrow" aria-hidden="true">Catéchisme</p>
				{#if prologue}
					<a
						class="m-row m-row-prologue"
						href="/ccc/{prologue.slug}"
						role="menuitem"
						onclick={close}
					>
						<span class="m-row-label">Prologue</span>
					</a>
				{/if}
				<ol class="m-list" role="none">
					{#each parts as part (part.slug)}
						<li>
							<a class="m-row" href="/ccc/{part.slug}" role="menuitem" onclick={close}>
								<span class="m-numeral" aria-hidden="true">{ROMAN[part.number ?? 0]}</span>
								<span class="m-body">
									<span class="m-kicker">Partie&nbsp;{part.number}</span>
									<span class="m-title">{part.title}</span>
								</span>
								<span class="m-arrow" aria-hidden="true">›</span>
							</a>
						</li>
					{/each}
				</ol>
				<a class="m-sommaire" href="/ccc/sommaire" role="menuitem" onclick={close}>
					<span>Sommaire complet</span>
					<span class="sommaire-arrow" aria-hidden="true">→</span>
				</a>
			{:else}
				<!-- Cascade mega-menu -->
				<div class="cascade" role="presentation">
					<!-- COL 1: PARTIES -->
					<div class="col col-parts">
						<p class="col-head">Parties</p>
						<ul class="col-list styled-scroll" role="none">
							{#each col1Items as it, i (it.kind === 'prologue' ? 'prologue' : it.item.slug)}
								{#if it.kind === 'prologue'}
									<li>
										<a
											class="cell cell-prologue"
											href="/ccc/{it.item.slug}"
											role="menuitem"
											data-kb-col="0"
											data-kb-index={i}
											tabindex={kbCol === 0 && kbIndex === i ? 0 : -1}
											onmouseenter={() => {
												kbCol = 0;
												kbIndex = i;
											}}
											onfocus={() => {
												kbCol = 0;
												kbIndex = i;
											}}
											onclick={close}
										>
											<span class="cell-tag">Ouverture</span>
											<span class="cell-title">Prologue</span>
										</a>
									</li>
								{:else}
									{@const part = it.item}
									{@const isActive = activePartSlug === part.slug}
									<li>
										<a
											class="cell cell-part"
											class:is-active={isActive}
											href="/ccc/{part.slug}"
											role="menuitem"
											data-kb-col="0"
											data-kb-index={i}
											tabindex={kbCol === 0 && kbIndex === i ? 0 : -1}
											onmouseenter={() => {
												setActivePart(part);
												kbCol = 0;
												kbIndex = i;
											}}
											onfocus={() => {
												setActivePart(part);
												kbCol = 0;
												kbIndex = i;
											}}
											onclick={close}
										>
											<span class="cell-numeral" aria-hidden="true"
												>{ROMAN[part.number ?? 0]}</span
											>
											<span class="cell-body">
												<span class="cell-tag">Partie&nbsp;{part.number}</span>
												<span class="cell-title">{part.title}</span>
											</span>
											<span class="cell-chevron" aria-hidden="true">›</span>
										</a>
									</li>
								{/if}
							{/each}
						</ul>
					</div>

					<!-- COL 2: SECTIONS -->
					<div class="col col-sections">
						<p class="col-head">Sections</p>
						{#if col2Items.length === 0}
							<p class="col-empty">—</p>
						{:else}
							<ul class="col-list styled-scroll" role="none">
								{#each col2Items as section, i (section.slug)}
									{@const isActive = activeSectionSlug === section.slug}
									<li>
										<a
											class="cell cell-section"
											class:is-active={isActive}
											href={sectionHref(section)}
											role="menuitem"
											data-kb-col="1"
											data-kb-index={i}
											tabindex={kbCol === 1 && kbIndex === i ? 0 : -1}
											onmouseenter={() => {
												setActiveSection(section);
												kbCol = 1;
												kbIndex = i;
											}}
											onfocus={() => {
												setActiveSection(section);
												kbCol = 1;
												kbIndex = i;
											}}
											onclick={close}
										>
											<span class="cell-body">
												<span class="cell-tag">Section&nbsp;{section.number}</span>
												<span class="cell-title">{section.title}</span>
											</span>
											<span class="cell-chevron" aria-hidden="true">›</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<!-- COL 3: CHAPITRES -->
					<div class="col col-chapters">
						<p class="col-head">Chapitres</p>
						{#if col3Items.length === 0}
							<p class="col-empty">
								{sectionDirectArticles.length > 0 ? '—' : '—'}
							</p>
						{:else}
							<ul class="col-list styled-scroll" role="none">
								{#each col3Items as chap, i (chap.slug)}
									{@const isActive = activeChapterSlug === chap.slug}
									<li>
										<a
											class="cell cell-chapter"
											class:is-active={isActive}
											href={chapterHref(chap)}
											role="menuitem"
											data-kb-col="2"
											data-kb-index={i}
											tabindex={kbCol === 2 && kbIndex === i ? 0 : -1}
											onmouseenter={() => {
												setActiveChapter(chap);
												kbCol = 2;
												kbIndex = i;
											}}
											onfocus={() => {
												setActiveChapter(chap);
												kbCol = 2;
												kbIndex = i;
											}}
											onclick={close}
										>
											<span class="cell-body">
												<span class="cell-tag">Chapitre&nbsp;{chap.number}</span>
												<span class="cell-title">{chap.title}</span>
											</span>
											<span class="cell-chevron" aria-hidden="true">›</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<!-- COL 4: ARTICLES (or headings when the chapter has no articles) -->
					<div class="col col-articles">
						<p class="col-head">{col4Heading}</p>
						{#if col4Items.length === 0}
							<p class="col-empty">—</p>
						{:else}
							<ul class="col-list styled-scroll" role="none">
								{#each col4Items as item, i (item.kind + ':' + (item.kind === 'article' ? item.data.slug : item.data.id))}
									{@const isActive =
										item.kind === 'article' &&
										currentSlugs?.article === item.data.slug &&
										currentSlugs?.chapter === activeChapterSlug}
									<li>
										<a
											class="cell cell-article"
											class:is-active={isActive}
											href={item.kind === 'article'
												? articleHref(item.data)
												: headingHref(item.data)}
											role="menuitem"
											data-kb-col="3"
											data-kb-index={i}
											tabindex={kbCol === 3 && kbIndex === i ? 0 : -1}
											onmouseenter={() => {
												kbCol = 3;
												kbIndex = i;
											}}
											onfocus={() => {
												kbCol = 3;
												kbIndex = i;
											}}
											onclick={close}
										>
											<span class="cell-body">
												{#if item.kind === 'article'}
													<span class="cell-tag cell-tag-sm">Article&nbsp;{item.data.number}</span>
													<span class="cell-title cell-title-sm">{item.data.title}</span>
												{:else}
													<span class="cell-title cell-title-sm">{item.data.title}</span>
												{/if}
											</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>

				<!-- Footer bar — entire row is the sommaire link, centered. -->
				<a class="panel-foot foot-link foot-link-primary" href="/ccc/sommaire" role="menuitem" onclick={close}>
					<span>Sommaire complet</span>
					<span class="sommaire-arrow" aria-hidden="true">→</span>
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.catdrop {
		position: relative;
	}
	/* Invisible hover bridge: extends the trigger's hover area downward
	   past the topbar so a cursor moving slowly toward the centered panel
	   stays within .catdrop's mouseenter region. Wider than the button to
	   give some lateral wiggle. */
	.catdrop::after {
		content: '';
		position: absolute;
		top: 100%;
		left: -40px;
		right: -40px;
		height: 60px;
		/* No fill — purely a hover surface. */
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
		transition:
			transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 140ms ease;
	}
	.catdrop-trigger.is-open .caret {
		transform: rotate(180deg);
		opacity: 1;
	}

	/* Panel ------------------------------------------------------------- */
	.catdrop-panel {
		position: fixed;
		top: var(--topbar-bottom, 80px);
		left: 50%;
		transform: translateX(-50%);
		width: min(98vw, 1200px);
		background: var(--color-panel);
		color: var(--color-fg);
		border-radius: 6px;
		padding: 1.1rem 1.4rem 0;
		box-shadow: 0 6px 18px -10px color-mix(in srgb, var(--color-fg) 22%, transparent);
		z-index: var(--z-dropdown);
		transform-origin: top center;
		outline: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
		outline-offset: -1px;
	}

	/* Tiny caret pointer above the panel — anchored to trigger center. */
	.catdrop-panel::before {
		content: '';
		position: absolute;
		top: -6px;
		left: 50%;
		margin-left: -6px;
		width: 12px;
		height: 12px;
		background: var(--color-panel);
		transform: rotate(45deg);
		box-shadow: -1px -1px 0 0 color-mix(in srgb, var(--color-border) 70%, transparent);
	}

	@keyframes panel-in {
		from {
			opacity: 0;
			transform: translate(-50%, -4px);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}

	/* Top ornament ----------------------------------------------------- */
	.ornament-top {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		margin: -0.1rem 0 0.7rem;
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
		max-width: 100px;
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

	/* Cascade columns -------------------------------------------------- */
	.cascade {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0;
	}
	.col {
		min-width: 0;
		padding: 0 0.85rem;
		max-height: 440px;
		display: flex;
		flex-direction: column;
		position: relative;
	}
	/* Hairline separators between columns — gradient-fade so it feels printed. */
	.col + .col::before {
		content: '';
		position: absolute;
		top: 0.4rem;
		bottom: 0.4rem;
		left: 0;
		width: 1px;
		background: linear-gradient(
			to bottom,
			transparent,
			color-mix(in srgb, var(--color-fg) 14%, transparent) 20%,
			color-mix(in srgb, var(--color-fg) 14%, transparent) 80%,
			transparent
		);
		pointer-events: none;
	}

	.col-head {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.55rem;
		padding-left: 0.6rem;
	}

	.col-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		overflow-x: hidden;
		flex: 1 1 auto;
		min-height: 0;
		/* Animate the column contents fading in when cascade updates */
		animation: col-fade 120ms ease-out;
	}
	@keyframes col-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.col-empty {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 0.85rem;
		color: var(--color-subtle);
		padding: 0.5rem 0.6rem;
		margin: 0;
		opacity: 0.6;
	}

	/* Cells (shared) --------------------------------------------------- */
	.cell {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.6rem;
		border-radius: 4px;
		text-decoration: none;
		color: var(--color-fg);
		transition:
			background-color 130ms ease,
			color 130ms ease;
		position: relative;
		min-width: 0;
	}
	.cell:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
		outline-offset: -2px;
	}
	.cell:hover,
	.cell.is-active {
		background-color: color-mix(in srgb, var(--color-accent) 7%, transparent);
	}
	.cell.is-active {
		background-color: color-mix(in srgb, var(--color-accent) 11%, transparent);
	}
	.cell:hover .cell-tag,
	.cell.is-active .cell-tag {
		color: var(--color-accent);
	}
	.cell:hover .cell-numeral,
	.cell.is-active .cell-numeral {
		color: var(--color-accent);
	}
	.cell:hover .cell-chevron,
	.cell.is-active .cell-chevron {
		opacity: 1;
		color: var(--color-accent);
		transform: translateX(2px);
	}

	.cell-body {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
		min-width: 0;
		flex: 1 1 auto;
	}
	.cell-tag {
		font-family: var(--font-ui);
		font-size: 0.58rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-subtle);
		transition: color 130ms ease;
	}
	.cell-tag-sm {
		font-size: 0.55rem;
		letter-spacing: 0.2em;
	}
	.cell-title {
		font-family: var(--font-heading);
		font-size: 0.92rem;
		line-height: 1.3;
		color: var(--color-fg);
		font-feature-settings: 'liga' on, 'kern' on;
	}
	.cell-title-sm {
		font-size: 0.85rem;
		line-height: 1.35;
		color: var(--color-muted);
	}
	.cell-chevron {
		flex: 0 0 auto;
		font-family: var(--font-heading);
		font-size: 1rem;
		line-height: 1;
		color: color-mix(in srgb, var(--color-fg) 28%, transparent);
		opacity: 0.55;
		transition:
			opacity 160ms ease,
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			color 140ms ease;
	}

	/* Part cells get a Roman numeral in accent red */
	.cell-numeral {
		flex: 0 0 auto;
		width: 1.5rem;
		text-align: center;
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 1rem;
		letter-spacing: 0.04em;
		color: color-mix(in srgb, var(--color-accent) 70%, transparent);
		transition: color 140ms ease;
		font-variant-numeric: oldstyle-nums;
	}

	/* Prologue cell — italic on the title only (the "Ouverture" tag stays
	   in the same UI register as Partie/Section/Chapitre tags). */
	.cell-prologue {
		font-family: var(--font-heading);
	}
	.cell-prologue .cell-title {
		font-style: italic;
	}

	/* Footer ----------------------------------------------------------- */
	/* The footer IS the sommaire link — full-row click target, centered. */
	.panel-foot {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		margin-top: 0.85rem;
		padding: 0.7rem 0.6rem 0.85rem;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
	}
	.foot-link {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 140ms ease;
	}
	.foot-link:hover,
	.foot-link:focus-visible {
		color: var(--color-accent);
		outline: none;
	}
	.foot-link-primary {
		color: var(--color-fg);
	}
	.panel-foot:hover .sommaire-arrow,
	.panel-foot:focus-visible .sommaire-arrow {
		transform: translateX(3px);
	}
	/* Mobile fallback ------------------------------------------------- */
	.catdrop-panel.is-mobile {
		width: min(94vw, 380px);
		padding: 1rem 1.2rem 0.85rem;
	}
	.eyebrow {
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-align: center;
		margin: 0 0 0.85rem;
	}
	.m-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.m-row {
		display: grid;
		grid-template-columns: 2.2rem 1fr auto;
		gap: 0.7rem;
		align-items: center;
		padding: 0.6rem 0.5rem;
		margin: 0 -0.4rem;
		border-radius: 4px;
		text-decoration: none;
		color: var(--color-fg);
		transition: background-color 130ms ease;
	}
	.m-row:hover,
	.m-row:focus-visible {
		background-color: color-mix(in srgb, var(--color-accent) 7%, transparent);
		outline: none;
	}
	.m-row-prologue {
		grid-template-columns: 1fr auto;
		font-family: var(--font-heading);
		font-style: italic;
		font-size: 0.95rem;
		margin-bottom: 0.3rem;
	}
	.m-numeral {
		text-align: center;
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 1rem;
		color: color-mix(in srgb, var(--color-accent) 70%, transparent);
		font-variant-numeric: oldstyle-nums;
	}
	.m-row:hover .m-numeral,
	.m-row:focus-visible .m-numeral {
		color: var(--color-accent);
	}
	.m-body {
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
	}
	.m-kicker {
		font-family: var(--font-ui);
		font-size: 0.58rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-subtle);
	}
	.m-title {
		font-family: var(--font-heading);
		font-size: 0.93rem;
		line-height: 1.3;
		color: var(--color-fg);
	}
	.m-arrow {
		color: color-mix(in srgb, var(--color-fg) 35%, transparent);
		font-family: var(--font-heading);
		font-size: 1rem;
	}
	.m-row:hover .m-arrow {
		color: var(--color-accent);
	}
	.m-sommaire {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		margin-top: 0.85rem;
		padding: 0.6rem 0.7rem 0.5rem;
		font-family: var(--font-ui);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: none;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
		transition: color 140ms ease;
	}
	.m-sommaire:hover,
	.m-sommaire:focus-visible {
		color: var(--color-accent);
		outline: none;
	}
	.sommaire-arrow {
		font-family: var(--font-heading);
		font-size: 0.85rem;
		transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.m-sommaire:hover .sommaire-arrow {
		transform: translateX(3px);
	}

	/* Reduced motion --------------------------------------------------- */
	@media (prefers-reduced-motion: reduce) {
		.catdrop-panel,
		.col-list {
			animation: none;
		}
		.caret,
		.cell-chevron,
		.sommaire-arrow {
			transition: none;
		}
	}

	/* Mid-size: dial down padding so the 4 columns fit cleanly. */
	@media (max-width: 900px) {
		.catdrop-panel {
			width: min(96vw, 820px);
		}
		.col {
			padding: 0 0.55rem;
		}
		.cell-title {
			font-size: 0.88rem;
		}
	}
</style>
