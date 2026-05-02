# Catéchisme FR — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add navigation depth (cascading TopBar + persistent sidebar), the study panel with tabbed cross-references, hover/click linkify pipeline for inline `<sup>` refs, the `/bible/` reverse-lookup hub, article-level routes, and a few small source-data quality fixes carried from the Phase 1 backlog.

**Architecture:** Two new top-level navigation surfaces — a cascading 3-column "Catéchisme" mega-menu in the TopBar (quick jumps) and a persistent expandable sidebar (deep browsing). The sidebar takes over chapter-outline duties on chapter pages, so we have one nav surface, not two competing. Study panel is **slide-in only** — triggered by clicking inline refs, slides from the right, ESC/click-outside to close. Linkify is a Svelte action attached to the reader root; the existing `ParagraphRenderer` post-processing extends to add click handlers and tooltip data attributes.

**Tech Stack:**
- Same as Phase 1: SvelteKit 2 + Svelte 5 (runes-only), TypeScript strict, Tailwind CSS 3, Cloudflare Pages.
- New: `parse5` for XHTML parsing of source XHTML files (already installed in Phase 1).
- No new runtime deps.

**Reference spec:** `../../../douayrheimsbible/docs/superpowers/specs/2026-05-02-catechisme-fr-design.md`

**Phase 1 status:** complete (33 commits, working reader, breadcrumbs everywhere). Backlog at `docs/superpowers/BACKLOG.md` — Phase 2 picks up the items marked "study panel", "/bible/", "linkify", "nav overhaul", and a few small source-data fixes.

---

## Tooling Reference (read before every task)

The same MCP servers as Phase 1 — `svelte`, `context7`, `playwright`. **Use them.**

### Project conventions (load-bearing)

- **Svelte 5 runes only** (`compilerOptions.runes: true`). No `export let`, no `<slot />`. Use `$props`, `$state`, `$derived`, `$effect`, `{@render children()}`.
- **TypeScript strict**, including `noUncheckedIndexedAccess`. Use `?.`, `??`, and `!` carefully.
- Imports do NOT use `.ts` extensions on internal files (`./slug` not `./slug.ts`) except inside `scripts/prepare-data.ts` (which uses tsx and accepts `.ts`).
- **French typography**: NBSP (` `) before colons in all visible labels.
- **Frequent, small commits** — one TDD cycle per commit.

---

## File Structure

Phase 2 adds:

```
lecatechisme/
├── scripts/prepare/
│   ├── cited-by.ts              # invert cross_refs → paragraph → [citers]
│   ├── sources-index.ts         # parse index_citations XHTML → sources index
│   ├── bible-book-names.ts      # map USFX 3-letter codes → French slug + display name
│   ├── source-data-fixes.ts     # paragraph-text capitalization, bible_refs continuation merge
│   └── … (existing files)
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── CatechismDropdown.svelte    # NEW — 3-column cascading mega-menu
│   │   │   │   ├── Sidebar.svelte              # NEW — persistent expandable TOC
│   │   │   │   ├── SidebarItem.svelte          # NEW — recursive menu item
│   │   │   │   ├── SidebarToggle.svelte        # NEW — TopBar button
│   │   │   │   └── TopBar.svelte               # MODIFY — add dropdown + sidebar toggle
│   │   │   ├── panels/                         # NEW DIR — study panel
│   │   │   │   ├── StudyPanel.svelte
│   │   │   │   ├── TabBibleRefs.svelte
│   │   │   │   ├── TabCrossRefs.svelte
│   │   │   │   ├── TabCitedBy.svelte
│   │   │   │   ├── TabSources.svelte
│   │   │   │   └── TabEnBref.svelte
│   │   │   ├── ccc/
│   │   │   │   ├── CCCReader.svelte            # MODIFY — drop ChapterOutline (sidebar handles it)
│   │   │   │   ├── RefTooltip.svelte           # NEW — hover preview
│   │   │   │   ├── ParagraphRenderer.svelte    # MODIFY — emit click + hover events on refs
│   │   │   │   └── … (existing)
│   │   │   └── bible/                          # NEW DIR — /bible/ hub
│   │   │       ├── BookGrid.svelte
│   │   │       ├── ChapterGrid.svelte
│   │   │       ├── VerseList.svelte
│   │   │       └── VerseToCccList.svelte
│   │   ├── stores/
│   │   │   ├── sidebar.ts                      # NEW — open/closed state
│   │   │   └── studyPanel.ts                   # NEW — { open, activeTab, context }
│   │   ├── utils/
│   │   │   ├── linkifyRefs.ts                  # NEW — Svelte action
│   │   │   └── bibleBookSlug.ts                # NEW — book code ↔ slug
│   │   └── data/
│   │       ├── types.ts                        # MODIFY — add new types
│   │       └── loaders.ts                      # MODIFY — add new loaders
│   ├── params/
│   │   └── biblebook.ts                        # NEW — matcher
│   └── routes/
│       ├── +layout.svelte                      # MODIFY — add Sidebar + StudyPanel
│       ├── bible/
│       │   ├── +page.ts, +page.svelte          # NEW — book grid
│       │   └── [book=biblebook]/
│       │       ├── +page.ts, +page.svelte      # NEW — chapter grid
│       │       └── [ch]/
│       │           ├── +page.ts, +page.svelte  # NEW — verse list
│       │           └── [v]/
│       │               ├── +page.ts, +page.svelte  # NEW — verse → CCC
│       └── ccc/
│           ├── [ref=cccref]/+page.svelte       # MODIFY — wire panel-on-click
│           └── [part]/[section]/[chapter]/
│               └── [article]/                  # NEW — article filter view
│                   ├── +page.ts, +page.svelte
└── tests/
    ├── unit/
    │   ├── prepare/
    │   │   ├── cited-by.test.ts                # NEW
    │   │   ├── sources-index.test.ts           # NEW
    │   │   └── bible-book-names.test.ts        # NEW
    │   └── utils/
    │       ├── linkifyRefs.test.ts             # NEW
    │       └── bibleBookSlug.test.ts           # NEW
    └── e2e/
        ├── study-panel.test.ts                 # NEW
        ├── bible-hub.test.ts                   # NEW
        └── nav-sidebar.test.ts                 # NEW
```

Sections E–I cover the work, organized for shippable milestones:

- **E.** Source-data fixes + sidebar foundation (cited-by, sources-index, capitalization, sidebar UI)
- **F.** Cascading TopBar dropdown
- **G.** Study panel + tabs + linkify pipeline
- **H.** `/bible/` reverse-lookup hub
- **I.** Article-level routes

---

## Section E — Data Fixes + Sidebar Foundation

### Task E1: Build cited-by index

**Files:**
- Create: `scripts/prepare/cited-by.ts`
- Modify: `scripts/prepare-data.ts` (wire it in)
- Test: `tests/unit/prepare/cited-by.test.ts`

`cited-by[N]` = list of paragraph numbers whose `cross_refs` include `N`. The reverse direction of the existing per-paragraph `cross_refs`. Used by the panel's "Cités par" tab.

**Tooling:** none.

- [ ] **Step 1: Failing test**

`tests/unit/prepare/cited-by.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCitedBy } from '../../../scripts/prepare/cited-by';

describe('buildCitedBy', () => {
	it('inverts cross_refs', () => {
		const paragraphs = new Map<number, { cross_refs: string[] }>([
			[10, { cross_refs: ['20', '30'] }],
			[20, { cross_refs: [] }],
			[30, { cross_refs: ['10'] }]
		]);
		const result = buildCitedBy(paragraphs);
		expect(result[20]).toEqual([10]);
		expect(result[30]).toEqual([10]);
		expect(result[10]).toEqual([30]);
	});

	it('skips refs to nonexistent paragraphs (and warns)', () => {
		const paragraphs = new Map<number, { cross_refs: string[] }>([
			[1, { cross_refs: ['99999'] }]
		]);
		const result = buildCitedBy(paragraphs);
		expect(result[99999]).toBeUndefined();
		// 99999 is not a known paragraph → entry is dropped
	});
});
```

- [ ] **Step 2: Run, verify fail**

```bash
npm run test:unit -- cited-by.test.ts
```

- [ ] **Step 3: Write `scripts/prepare/cited-by.ts`**

```ts
export function buildCitedBy(
	paragraphs: Map<number, { cross_refs: string[] }>
): Record<number, number[]> {
	const out: Record<number, number[]> = {};
	for (const [from, p] of paragraphs) {
		for (const targetStr of p.cross_refs) {
			const target = parseInt(targetStr, 10);
			if (!Number.isFinite(target)) continue;
			if (!paragraphs.has(target)) continue;
			if (!out[target]) out[target] = [];
			out[target]!.push(from);
		}
	}
	// Stable sort each list ascending
	for (const k of Object.keys(out)) {
		out[Number(k)]!.sort((a, b) => a - b);
	}
	return out;
}
```

- [ ] **Step 4: Pass**

```bash
npm run test:unit -- cited-by.test.ts
```

- [ ] **Step 5: Wire into `prepare-data.ts`** (after the paragraphs step):

```ts
import { buildCitedBy } from './prepare/cited-by.ts';

	logStep('building cited-by');
	const citedBy = buildCitedBy(paragraphs);
	writeFileSync(join(OUT, 'ccc/cited-by.json'), JSON.stringify(citedBy));
	endStep(`${Object.keys(citedBy).length} paragraphs cited`);
```

- [ ] **Step 6: Run prepare-data; verify**

```bash
npm run prepare-data
node -e "const c=require('./static/data/ccc/cited-by.json'); console.log('§27 cited by:',c[27]?.slice(0,5))"
```

Expected: prints a list of paragraph numbers that cite §27.

- [ ] **Step 7: Commit**

```bash
git add scripts/prepare/cited-by.ts scripts/prepare-data.ts tests/unit/prepare/cited-by.test.ts
git commit -m "feat: invert cross_refs into ccc/cited-by.json"
```

---

### Task E2: First-word capitalization fix in paragraph text

**Files:**
- Create: `scripts/prepare/source-data-fixes.ts`
- Modify: `scripts/prepare/paragraphs.ts` (apply fix)
- Test: `tests/unit/prepare/source-data-fixes.test.ts`

The source occasionally has lowercase first words in paragraph body (`"saint Paul affirme..."`). Fix: capitalize the first visible letter of each paragraph's `text_html`.

**Tooling:** none. Pure string manipulation.

- [ ] **Step 1: Failing test**

`tests/unit/prepare/source-data-fixes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { capitalizeFirstWord } from '../../../scripts/prepare/source-data-fixes';

describe('capitalizeFirstWord', () => {
	it('capitalizes the first letter of plain text', () => {
		expect(capitalizeFirstWord('saint Paul affirme')).toBe('Saint Paul affirme');
	});

	it('skips into the first text inside a leading <span> wrapper', () => {
		expect(
			capitalizeFirstWord('<span>saint Paul affirme</span>')
		).toBe('<span>Saint Paul affirme</span>');
	});

	it('skips through multiple opening tags', () => {
		expect(
			capitalizeFirstWord('<span><i>« saint Paul »</i></span>')
		).toBe('<span><i>« Saint Paul »</i></span>');
	});

	it('leaves already-capitalized text alone', () => {
		expect(capitalizeFirstWord('<span>Le désir de Dieu</span>')).toBe(
			'<span>Le désir de Dieu</span>'
		);
	});

	it('leaves text starting with a digit alone', () => {
		expect(capitalizeFirstWord('1234')).toBe('1234');
	});

	it('leaves text starting with non-letter punctuation alone but capitalizes after it', () => {
		expect(capitalizeFirstWord('« saint Paul »')).toBe('« Saint Paul »');
	});
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:unit -- source-data-fixes.test.ts
```

- [ ] **Step 3: Write `scripts/prepare/source-data-fixes.ts`**

```ts
// Walk past leading HTML tags + opening punctuation (« quotes, etc.) to find
// the first letter, then uppercase it. Returns the modified string.
export function capitalizeFirstWord(html: string): string {
	let i = 0;
	while (i < html.length) {
		const ch = html[i]!;
		if (ch === '<') {
			// skip tag
			const end = html.indexOf('>', i);
			if (end < 0) return html;
			i = end + 1;
			continue;
		}
		// skip whitespace and opening punctuation
		if (/[\s«»‹›"'„“”‘’.,;:!?–— ]/.test(ch)) {
			i++;
			continue;
		}
		// First letter — uppercase if it's a lowercase letter
		const upper = ch.toUpperCase();
		if (upper !== ch && /\p{L}/u.test(ch)) {
			return html.slice(0, i) + upper + html.slice(i + 1);
		}
		// Else (e.g. digit, already-uppercase letter) leave alone
		return html;
	}
	return html;
}
```

- [ ] **Step 4: Wire into `paragraphs.ts`**

In `extractParagraphs`, modify the `text_html` field to apply the fix:

```ts
import { capitalizeFirstWord } from './source-data-fixes';

// ... inside the walk function, when creating the Paragraph record:
out.set(node.number, {
	corpus: 'ccc',
	number: node.number,
	text_html: capitalizeFirstWord(node.text_html ?? ''),  // CHANGED
	// ...rest unchanged
});
```

- [ ] **Step 5: Pass + verify on real data**

```bash
npm run test:unit -- source-data-fixes.test.ts
npm run prepare-data
# Spot-check a paragraph that previously had lowercase first word
node -e "const p=require('./static/data/ccc/paragraphs/2466.json'); console.log(p.text_html.slice(0,80))"
```

- [ ] **Step 6: Commit**

```bash
git add scripts/prepare/source-data-fixes.ts scripts/prepare/paragraphs.ts tests/unit/prepare/source-data-fixes.test.ts
git commit -m "feat: capitalize first letter of paragraph text_html"
```

---

### Task E3: Bible-ref continuation merge (§2153 fix)

**Files:**
- Modify: `scripts/prepare/source-data-fixes.ts` (add a new function)
- Modify: `scripts/prepare/paragraphs.ts` (apply fix)
- Test: `tests/unit/prepare/source-data-fixes.test.ts` (extend)

When `bible_refs[i]` lacks a book prefix, inherit from `bible_refs[i-1]`. This fixes the `[{text: "Mt 5:33-34"}, {text: "5:37"}]` split where the second entry was missing "Mt".

- [ ] **Step 1: Failing test (append)**

```ts
import { mergeBibleRefContinuations } from '../../../scripts/prepare/source-data-fixes';

describe('mergeBibleRefContinuations', () => {
	it('inherits book from previous when missing', () => {
		const refs = [{ text: 'Mt 5:33-34' }, { text: '5:37' }];
		expect(mergeBibleRefContinuations(refs)).toEqual([
			{ text: 'Mt 5:33-34' },
			{ text: 'Mt 5:37' }
		]);
	});

	it('handles full books with no continuation', () => {
		const refs = [{ text: 'Mt 5:33' }, { text: 'Lc 6:4' }];
		expect(mergeBibleRefContinuations(refs)).toEqual([
			{ text: 'Mt 5:33' },
			{ text: 'Lc 6:4' }
		]);
	});

	it('preserves a leading entry that itself has no book (rare; passes through)', () => {
		const refs = [{ text: '5:37' }];
		expect(mergeBibleRefContinuations(refs)).toEqual([{ text: '5:37' }]);
	});
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:unit -- source-data-fixes.test.ts
```

- [ ] **Step 3: Add to `scripts/prepare/source-data-fixes.ts`**

```ts
const BOOK_PREFIX_RE = /^([1-3]\s*)?[A-ZÉÈÊÂÄÔÎÏÜÇ][a-zéèêâäôîïüç]+/;

export function mergeBibleRefContinuations(refs: { text: string }[]): { text: string }[] {
	const out: { text: string }[] = [];
	let lastBook: string | null = null;
	for (const r of refs) {
		const text = r.text.trim();
		const match = text.match(BOOK_PREFIX_RE);
		if (match) {
			lastBook = match[0].trim();
			out.push({ text });
		} else if (lastBook) {
			out.push({ text: `${lastBook} ${text}` });
		} else {
			out.push({ text });
		}
	}
	return out;
}
```

- [ ] **Step 4: Wire into paragraphs.ts**

```ts
import { capitalizeFirstWord, mergeBibleRefContinuations } from './source-data-fixes';

// ... in walk:
bible_refs: mergeBibleRefContinuations((node.bible_refs ?? []).map((b) => ({ text: b.text }))),
```

- [ ] **Step 5: Pass + verify**

```bash
npm run test:unit -- source-data-fixes.test.ts
npm run prepare-data
node -e "const p=require('./static/data/ccc/paragraphs/2153.json'); console.log(p.bible_refs)"
```

Expected: `[{text: "Mt 5:33-34"}, {text: "Mt 5:37"}]` (book inherited).

- [ ] **Step 6: Commit**

```bash
git add scripts/prepare/source-data-fixes.ts scripts/prepare/paragraphs.ts tests/unit/prepare/source-data-fixes.test.ts
git commit -m "feat: inherit book name in continuation bible_refs (§2153 fix)"
```

---

### Task E4: Sidebar store + minimal Sidebar component

**Files:**
- Create: `src/lib/stores/sidebar.ts`
- Create: `src/lib/components/ui/Sidebar.svelte`
- Create: `src/lib/components/ui/SidebarItem.svelte`
- Create: `src/lib/components/ui/SidebarToggle.svelte`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/lib/components/ui/TopBar.svelte` (add toggle button)

**Tooling:** `svelte` MCP for `$state` + `$derived` + `$effect` patterns.

This task scaffolds the sidebar **without the full hierarchy** — just a placeholder list of the 5 parts. Task E5 fills in the recursive expansion.

- [ ] **Step 1: Write `src/lib/stores/sidebar.ts`**

```ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const KEY = 'lecatechisme.sidebar.open';
const initial = browser
	? localStorage.getItem(KEY) === '0'
		? false
		: true // default open on desktop
	: true;

export const sidebarOpen = writable<boolean>(initial);

if (browser) {
	sidebarOpen.subscribe((v) => localStorage.setItem(KEY, v ? '1' : '0'));
}
```

- [ ] **Step 2: Write `src/lib/components/ui/SidebarToggle.svelte`**

```svelte
<script lang="ts">
	import { sidebarOpen } from '$lib/stores/sidebar';
</script>

<button
	type="button"
	onclick={() => sidebarOpen.update((v) => !v)}
	class="w-9 h-9 rounded-md bg-accent/10 hover:bg-accent/20 flex items-center justify-center"
	aria-label="Basculer la barre latérale"
	aria-pressed={$sidebarOpen}
>
	{#if $sidebarOpen}
		◧
	{:else}
		☰
	{/if}
</button>
```

- [ ] **Step 3: Write `src/lib/components/ui/Sidebar.svelte` (minimal scaffold)**

```svelte
<script lang="ts">
	import { sidebarOpen } from '$lib/stores/sidebar';
	import { loadStructure } from '$lib/data/loaders';

	type Part = { slug: string; title: string; number?: number; prologue?: boolean };
	let parts: Part[] = $state([]);

	$effect(() => {
		(async () => {
			const struct = (await loadStructure()) as { parts: Part[] };
			parts = struct.parts;
		})();
	});
</script>

{#if $sidebarOpen}
	<aside
		class="fixed lg:sticky top-[80px] left-0 h-[calc(100vh-80px)] w-[260px] bg-panel border-r border-border overflow-y-auto z-20 styled-scroll"
		aria-label="Plan du Catéchisme"
	>
		<nav class="p-4">
			<ul class="space-y-1 font-ui text-sm">
				{#each parts as part (part.slug)}
					<li>
						<a
							href="/ccc/{part.slug}"
							class="block py-2 px-2 rounded hover:bg-accent/10 hover:text-accent"
						>
							<span class="font-semibold">
								{part.prologue ? 'Prologue' : `Partie ${part.number}`}
							</span>
							<span class="block text-muted text-xs mt-0.5">{part.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>
{/if}

<style>
	.styled-scroll {
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--color-accent) 50%, transparent)
			color-mix(in srgb, var(--color-border) 40%, transparent);
	}
	.styled-scroll::-webkit-scrollbar { width: 6px; }
	.styled-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		border-radius: 3px;
	}
</style>
```

- [ ] **Step 4: Mount Sidebar in `+layout.svelte`**

```svelte
<script lang="ts">
	import '../app.css';
	import TopBar from '$lib/components/ui/TopBar.svelte';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	let { children } = $props();
</script>

<TopBar />
<div class="flex">
	<Sidebar />
	<div class="flex-1 min-w-0">
		{@render children()}
	</div>
</div>
```

- [ ] **Step 5: Add toggle button to TopBar**

In `src/lib/components/ui/TopBar.svelte`, add `SidebarToggle` to the right cluster (just before `ModeToggle`):

```svelte
<script lang="ts">
	import LogoMark from './LogoMark.svelte';
	import Wordmark from './Wordmark.svelte';
	import ModeToggle from './ModeToggle.svelte';
	import SidebarToggle from './SidebarToggle.svelte';
</script>

<!-- ...existing TopBar markup... -->
<!-- Right cluster: replace `<ModeToggle />` with: -->
<SidebarToggle />
<ModeToggle />
```

- [ ] **Step 6: Smoke test**

```bash
npm run dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
sleep 5
PORT=$(grep -oE "http://localhost:[0-9]+" /tmp/dev.log | head -1 | grep -oE "[0-9]+$")
curl -s "http://localhost:$PORT/ccc" | grep -i "Plan du Catéchisme"
curl -s "http://localhost:$PORT/ccc" | grep -i "Basculer la barre latérale"
kill $DEV_PID
```

Both should match.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores/sidebar.ts src/lib/components/ui/Sidebar.svelte src/lib/components/ui/SidebarItem.svelte src/lib/components/ui/SidebarToggle.svelte src/routes/+layout.svelte src/lib/components/ui/TopBar.svelte
git commit -m "feat: persistent sidebar scaffold with toggle in TopBar"
```

---

### Task E5: Sidebar — full hierarchy + auto-expand active branch

**Files:**
- Modify: `src/lib/components/ui/Sidebar.svelte`
- Create: `src/lib/components/ui/SidebarItem.svelte`

**Tooling:** `svelte` MCP for recursive component patterns.

The sidebar shows the full hierarchy. On chapter pages, the active chapter is auto-expanded showing its headings/articles/en_brefs. This **replaces** the `ChapterOutline` on chapter pages.

- [ ] **Step 1: Write `SidebarItem.svelte`** (recursive)

```svelte
<script lang="ts">
	import { page } from '$app/state';

	type Item = {
		title: string;
		href: string;
		number?: number;
		typeLabel?: string; // "Partie", "Section", "Chapitre", "Article"
		children?: Item[];
	};
	let { item, depth = 0 }: { item: Item; depth?: number } = $props();

	const isActive = $derived(page.url.pathname === item.href);
	const isAncestor = $derived(
		item.children && item.children.some((c) => isAncestorOrSelf(c, page.url.pathname))
	);
	const expanded = $state(isAncestor || isActive);

	function isAncestorOrSelf(it: Item, path: string): boolean {
		if (it.href === path) return true;
		if (!it.children) return false;
		return it.children.some((c) => isAncestorOrSelf(c, path));
	}
</script>

<li>
	<div class="flex items-center gap-1">
		{#if item.children && item.children.length > 0}
			<button
				type="button"
				onclick={() => (expanded = !expanded)}
				class="w-5 h-5 flex items-center justify-center text-muted hover:text-accent text-xs"
				aria-label={expanded ? 'Réduire' : 'Développer'}
				aria-expanded={expanded}
			>
				{expanded ? '▾' : '▸'}
			</button>
		{:else}
			<span class="w-5" aria-hidden="true"></span>
		{/if}
		<a
			href={item.href}
			class="flex-1 py-1 px-2 rounded text-sm leading-snug hover:bg-accent/10 hover:text-accent"
			class:bg-accent={isActive}
			class:text-foreground={!isActive}
			class:!text-white={isActive}
		>
			{#if item.typeLabel}
				<span class="font-semibold">
					{item.typeLabel}
					{item.number ?? ''} :
				</span>
			{/if}
			{item.title}
		</a>
	</div>
	{#if item.children && expanded}
		<ul class="ml-3 border-l border-border">
			{#each item.children as child (child.href)}
				<svelte:self item={child} depth={depth + 1} />
			{/each}
		</ul>
	{/if}
</li>
```

- [ ] **Step 2: Update `Sidebar.svelte`** to build the full tree

```svelte
<script lang="ts">
	import { sidebarOpen } from '$lib/stores/sidebar';
	import { loadStructure } from '$lib/data/loaders';
	import SidebarItem from './SidebarItem.svelte';

	type Heading = { id: string; title: string; paragraph_start: number };
	type Article = {
		slug: string;
		title: string;
		number?: number;
		paragraphs: number[];
		headings: Heading[];
	};
	type Chapter = {
		slug: string;
		title: string;
		number?: number;
		paragraphs: number[];
		articles: Article[];
		headings: Heading[];
	};
	type Section = {
		slug: string;
		title: string;
		number?: number;
		chapters: Chapter[];
		articles_direct?: Article[];
	};
	type Part = {
		slug: string;
		title: string;
		number?: number;
		prologue?: boolean;
		sections: Section[];
	};

	type Item = {
		title: string;
		href: string;
		number?: number;
		typeLabel?: string;
		children?: Item[];
	};

	let tree: Item[] = $state([]);

	$effect(() => {
		(async () => {
			const struct = (await loadStructure()) as { parts: Part[] };
			tree = struct.parts.map((part): Item => {
				if (part.prologue) {
					return { title: part.title, href: `/ccc/prologue` };
				}
				return {
					title: part.title,
					number: part.number,
					typeLabel: 'Partie',
					href: `/ccc/${part.slug}`,
					children: part.sections.map((section): Item => ({
						title: section.title,
						number: section.number,
						typeLabel: 'Section',
						href: `/ccc/${part.slug}/${section.slug}`,
						children: [
							...section.chapters.map((chapter): Item => ({
								title: chapter.title,
								number: chapter.number,
								typeLabel: 'Chapitre',
								href: `/ccc/${part.slug}/${section.slug}/${chapter.slug}`,
								children: chapter.articles.map((article): Item => ({
									title: article.title,
									number: article.number,
									typeLabel: 'Article',
									href: `/ccc/${part.slug}/${section.slug}/${chapter.slug}/${article.slug}`
								}))
							})),
							...(section.articles_direct ?? []).map((article): Item => ({
								title: article.title,
								number: article.number,
								typeLabel: 'Article',
								href: `/ccc/${article.paragraphs[0]}-${article.paragraphs[article.paragraphs.length - 1]}`
							}))
						]
					}))
				};
			});
		})();
	});
</script>

{#if $sidebarOpen}
	<aside
		class="hidden lg:block sticky top-[80px] h-[calc(100vh-80px)] w-[280px] bg-panel border-r border-border overflow-y-auto z-20 styled-scroll flex-none"
		aria-label="Plan du Catéchisme"
	>
		<nav class="p-3 font-ui">
			<ul class="space-y-0.5">
				{#each tree as item (item.href)}
					<SidebarItem {item} />
				{/each}
			</ul>
		</nav>
	</aside>
{/if}

<style>
	.styled-scroll { scrollbar-width: thin; }
	.styled-scroll::-webkit-scrollbar { width: 6px; }
	.styled-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		border-radius: 3px;
	}
</style>
```

- [ ] **Step 3: Smoke test**

Visit `/ccc/la-profession-de-la-foi/je-crois-nous-croyons/lhomme-est-capable-de-dieu`. Sidebar should auto-expand the active branch and highlight the current chapter.

- [ ] **Step 4: Add e2e**

`tests/e2e/nav-sidebar.test.ts`:

```ts
import { test, expect } from '@playwright/test';

test('sidebar lists 5 parts', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('navigation', { name: 'Plan du Catéchisme' })).toBeVisible();
	const items = page.getByRole('navigation', { name: 'Plan du Catéchisme' }).getByRole('link');
	await expect(items).toHaveCount(5); // 4 parties + Prologue, before any expansion
});

test('sidebar auto-expands active chapter branch', async ({ page }) => {
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/ccc/structure.json', 'utf8'));
	const part = struct.parts.find((p: any) => !p.prologue);
	const section = part.sections[0];
	const chapter = section.chapters[0];
	const url = `/ccc/${part.slug}/${section.slug}/${chapter.slug}`;
	await page.goto(url);
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	// Active chapter href should be visible (since branch auto-expands)
	await expect(sidebar.getByRole('link', { name: new RegExp(chapter.title) })).toBeVisible();
});
```

- [ ] **Step 5: Run e2e + commit**

```bash
npm run test:e2e -- nav-sidebar
git add src/lib/components/ui/Sidebar.svelte src/lib/components/ui/SidebarItem.svelte tests/e2e/nav-sidebar.test.ts
git commit -m "feat: full hierarchical sidebar with auto-expand on active branch"
```

---

### Task E6: Drop ChapterOutline on chapter pages (sidebar takes over)

**Files:**
- Modify: `src/lib/components/ccc/CCCReader.svelte`
- Modify (or delete): `src/lib/components/ccc/ChapterOutline.svelte`

The sidebar handles navigation now. Remove the standalone outline aside from `CCCReader` so we don't have two competing nav surfaces.

- [ ] **Step 1: Modify `CCCReader.svelte`** — remove the `<aside>` block + grid:

Replace the surrounding markup:

```svelte
<div class="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10">
	<aside class="hidden lg:block">
		<div class="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 styled-scroll">
			<ChapterOutline {chapter} />
		</div>
	</aside>

	<main>
		<!-- ...existing content... -->
	</main>
</div>
```

with:

```svelte
<main class="mx-auto max-w-reader px-6 py-10">
	<!-- ...existing content (header, paragraphs, en_brefs, prev/next) — unchanged... -->
</main>
```

Drop the `import ChapterOutline` line. The `<style>` block can stay for now (used by sidebar too) or remove since nothing in this file uses it anymore.

- [ ] **Step 2: Verify chapter renders**

```bash
npm run dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
sleep 5
PORT=$(grep -oE "http://localhost:[0-9]+" /tmp/dev.log | head -1 | grep -oE "[0-9]+$")
curl -s "http://localhost:$PORT/ccc/la-profession-de-la-foi/je-crois-nous-croyons/lhomme-est-capable-de-dieu" | grep -i "Plan du Catéchisme"
kill $DEV_PID
```

Should match (sidebar appears).

- [ ] **Step 3: Update e2e**

In `tests/e2e/reader.test.ts`, change the chapter test from `getByLabel('Plan du chapitre')` to `getByLabel('Plan du Catéchisme')`:

```ts
await expect(page.getByLabel('Plan du Catéchisme')).toBeVisible();
```

- [ ] **Step 4: Delete `ChapterOutline.svelte`** (no longer used)

```bash
rm src/lib/components/ccc/ChapterOutline.svelte
rm src/lib/stores/outline.ts  # also unused now
```

- [ ] **Step 5: Run all tests + commit**

```bash
npm run test:unit && npm run test:e2e && npm run check
git add -A
git commit -m "refactor: sidebar replaces ChapterOutline; one nav surface"
```

---

## Section F — Cascading TopBar Dropdown

### Task F1: CatechismDropdown component

**Files:**
- Create: `src/lib/components/ui/CatechismDropdown.svelte`
- Modify: `src/lib/components/ui/TopBar.svelte`

**Tooling:** `svelte` MCP for keyboard navigation patterns. `context7` for accessible mega-menu patterns if uncertain (`role="menu"` etc.).

A 3-column mega-menu opened from the "Catéchisme" link in the TopBar. Column 1: parts; hover/focus a part → column 2 fills with its sections; hover/focus a section → column 3 fills with chapters. Footer: "Sommaire complet →".

- [ ] **Step 1: Write `src/lib/components/ui/CatechismDropdown.svelte`**

```svelte
<script lang="ts">
	import { loadStructure } from '$lib/data/loaders';
	import { onMount } from 'svelte';

	type Chapter = { slug: string; title: string; number?: number };
	type Section = { slug: string; title: string; number?: number; chapters: Chapter[] };
	type Part = { slug: string; title: string; number?: number; prologue?: boolean; sections: Section[] };

	let parts: Part[] = $state([]);
	let activePart: Part | null = $state(null);
	let activeSection: Section | null = $state(null);
	let open = $state(false);
	let containerEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		(async () => {
			const struct = (await loadStructure()) as { parts: Part[] };
			parts = struct.parts.filter((p) => !p.prologue);
		})();
	});

	function onDocClick(e: MouseEvent) {
		if (!(e.target instanceof Element)) return;
		if (!containerEl?.contains(e.target)) open = false;
	}

	function close() {
		open = false;
		activePart = null;
		activeSection = null;
	}

	onMount(() => {
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});
</script>

<div class="relative" bind:this={containerEl}>
	<button
		type="button"
		class="font-ui text-sm font-semibold hover:text-accent flex items-center gap-1"
		onclick={() => (open = !open)}
		aria-haspopup="menu"
		aria-expanded={open}
	>
		Catéchisme
		<span class="text-xs text-muted">▾</span>
	</button>

	{#if open}
		<div
			class="absolute top-full left-0 mt-2 bg-panel border border-border rounded-md shadow-xl z-40 flex"
			role="menu"
			style="width: min(92vw, 920px);"
		>
			<!-- Column 1: parts -->
			<div class="w-1/3 border-r border-border max-h-[60vh] overflow-y-auto">
				<a
					href="/ccc/prologue"
					onclick={close}
					class="block px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent"
				>
					Prologue
				</a>
				{#each parts as part (part.slug)}
					<button
						type="button"
						class="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent flex justify-between"
						class:bg-accent={activePart === part}
						class:!text-white={activePart === part}
						onmouseenter={() => {
							activePart = part;
							activeSection = null;
						}}
						onfocus={() => {
							activePart = part;
							activeSection = null;
						}}
					>
						<span>
							<span class="font-semibold">Partie {part.number} :</span>
							{part.title}
						</span>
						<span class="text-muted">›</span>
					</button>
				{/each}
			</div>

			<!-- Column 2: sections -->
			<div class="w-1/3 border-r border-border max-h-[60vh] overflow-y-auto">
				{#if activePart}
					{#each activePart.sections as section (section.slug)}
						<button
							type="button"
							class="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent flex justify-between"
							class:bg-accent={activeSection === section}
							class:!text-white={activeSection === section}
							onmouseenter={() => (activeSection = section)}
							onfocus={() => (activeSection = section)}
						>
							<span>
								<span class="font-semibold">Section {section.number} :</span>
								{section.title}
							</span>
							{#if section.chapters.length > 0}
								<span class="text-muted">›</span>
							{/if}
						</button>
					{/each}
				{:else}
					<p class="px-4 py-2 text-xs text-muted italic">Survolez une partie</p>
				{/if}
			</div>

			<!-- Column 3: chapters -->
			<div class="w-1/3 max-h-[60vh] overflow-y-auto">
				{#if activeSection}
					{#each activeSection.chapters as chap (chap.slug)}
						<a
							href={`/ccc/${activePart!.slug}/${activeSection!.slug}/${chap.slug}`}
							onclick={close}
							class="block px-4 py-2 text-sm hover:bg-accent/10 hover:text-accent"
						>
							<span class="font-semibold">Chapitre {chap.number} :</span>
							{chap.title}
						</a>
					{/each}
				{:else}
					<p class="px-4 py-2 text-xs text-muted italic">Survolez une section</p>
				{/if}
			</div>
		</div>

		<div class="absolute top-full left-0 mt-2 px-4 py-2" style="margin-top: calc(60vh + 60px);">
			<a href="/ccc/sommaire" onclick={close} class="text-accent hover:underline text-sm">
				Sommaire complet →
			</a>
		</div>
	{/if}
</div>
```

- [ ] **Step 2: Wire into TopBar**

In `src/lib/components/ui/TopBar.svelte`, replace the existing `<a href="/ccc">Catéchisme</a>` link with `<CatechismDropdown />`:

```svelte
<script lang="ts">
	import LogoMark from './LogoMark.svelte';
	import Wordmark from './Wordmark.svelte';
	import ModeToggle from './ModeToggle.svelte';
	import SidebarToggle from './SidebarToggle.svelte';
	import CatechismDropdown from './CatechismDropdown.svelte';
</script>

<!-- ...existing markup... -->
<!-- in the nav cluster, replace `<a href="/ccc" class="hover:text-accent">Catéchisme</a>` with: -->
<CatechismDropdown />
```

- [ ] **Step 3: Smoke test + e2e**

Append to `tests/e2e/nav-sidebar.test.ts`:

```ts
test('Catéchisme dropdown opens with parts', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /Catéchisme/i }).click();
	await expect(page.getByRole('menu')).toBeVisible();
	await expect(page.getByText(/Partie 1 :/)).toBeVisible();
});

test('Catéchisme dropdown cascades to chapters', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /Catéchisme/i }).click();
	// Hover Partie 1
	await page.getByText(/Partie 1 :/).hover();
	// Hover the first section
	await page.locator('[role="menu"] button').nth(1).hover();
	// At least one chapter link should appear in column 3
	await expect(page.locator('[role="menu"] a').filter({ hasText: /Chapitre 1/ })).toBeVisible();
});
```

- [ ] **Step 4: Run e2e + commit**

```bash
npm run test:e2e -- nav-sidebar
git add src/lib/components/ui/CatechismDropdown.svelte src/lib/components/ui/TopBar.svelte tests/e2e/nav-sidebar.test.ts
git commit -m "feat: cascading 3-column Catéchisme dropdown in TopBar"
```

---

## Section G — Study Panel + Linkify Pipeline

### Task G1: studyPanel store + StudyPanel component (slide-in shell)

**Files:**
- Create: `src/lib/stores/studyPanel.ts`
- Create: `src/lib/components/panels/StudyPanel.svelte`
- Modify: `src/routes/+layout.svelte`

**Tooling:** `svelte` MCP for transitions and `<dialog>` patterns.

The panel slides in from the right when triggered. Has tabs (which arrive in next tasks) but for now is just an empty shell with a close button.

- [ ] **Step 1: Write `src/lib/stores/studyPanel.ts`**

```ts
import { writable } from 'svelte/store';

export type PanelTab = 'bible' | 'cross-refs' | 'cited-by' | 'sources' | 'en-bref';

export interface PanelContext {
	paragraph: number;
}

export interface PanelState {
	open: boolean;
	activeTab: PanelTab | null;
	context: PanelContext | null;
}

const initial: PanelState = { open: false, activeTab: null, context: null };
export const studyPanel = writable<PanelState>(initial);

export function openPanel(context: PanelContext, tab: PanelTab = 'bible'): void {
	studyPanel.set({ open: true, activeTab: tab, context });
}

export function closePanel(): void {
	studyPanel.update((s) => ({ ...s, open: false }));
}
```

- [ ] **Step 2: Write `src/lib/components/panels/StudyPanel.svelte`** (shell)

```svelte
<script lang="ts">
	import { studyPanel, closePanel, type PanelTab } from '$lib/stores/studyPanel';
	import { fly } from 'svelte/transition';

	const TABS: { id: PanelTab; label: string }[] = [
		{ id: 'bible', label: 'Bible' },
		{ id: 'cross-refs', label: 'Renvois' },
		{ id: 'cited-by', label: 'Cités par' },
		{ id: 'sources', label: 'Sources' },
		{ id: 'en-bref', label: 'En Bref' }
	];

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closePanel();
	}

	$effect(() => {
		if ($studyPanel.open) {
			document.addEventListener('keydown', onKeydown);
			return () => document.removeEventListener('keydown', onKeydown);
		}
	});
</script>

{#if $studyPanel.open}
	<div
		class="fixed inset-0 z-40 bg-black/30"
		onclick={closePanel}
		role="presentation"
	></div>
	<aside
		class="fixed top-0 right-0 h-full w-[420px] max-w-[92vw] bg-panel border-l border-border shadow-xl z-50 flex flex-col"
		role="dialog"
		aria-modal="false"
		aria-label="Panneau d'étude"
		transition:fly={{ x: 420, duration: 200 }}
	>
		<header class="flex items-center justify-between p-3 border-b border-border font-ui">
			<div class="text-sm text-muted">
				{#if $studyPanel.context}
					§ {$studyPanel.context.paragraph}
				{/if}
			</div>
			<button
				type="button"
				class="w-8 h-8 rounded hover:bg-accent/10"
				aria-label="Fermer"
				onclick={closePanel}
			>
				✕
			</button>
		</header>
		<div class="flex border-b border-border font-ui text-xs">
			{#each TABS as tab (tab.id)}
				<button
					type="button"
					class="flex-1 py-2 hover:bg-accent/10"
					class:bg-accent={$studyPanel.activeTab === tab.id}
					class:!text-white={$studyPanel.activeTab === tab.id}
					onclick={() => studyPanel.update((s) => ({ ...s, activeTab: tab.id }))}
				>
					{tab.label}
				</button>
			{/each}
		</div>
		<div class="flex-1 overflow-y-auto p-4">
			<p class="text-sm text-muted italic">Contenu de l'onglet à venir.</p>
		</div>
	</aside>
{/if}
```

- [ ] **Step 3: Mount in `+layout.svelte`**

```svelte
<script lang="ts">
	import '../app.css';
	import TopBar from '$lib/components/ui/TopBar.svelte';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import StudyPanel from '$lib/components/panels/StudyPanel.svelte';
	let { children } = $props();
</script>

<TopBar />
<div class="flex">
	<Sidebar />
	<div class="flex-1 min-w-0">
		{@render children()}
	</div>
</div>
<StudyPanel />
```

- [ ] **Step 4: Manual smoke test from console**

```bash
npm run dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
sleep 5
# Visit /ccc/27, then in browser console:
# import('/src/lib/stores/studyPanel.ts').then(({ openPanel }) => openPanel({ paragraph: 27 }))
# Verify panel slides in with 5 tabs.
kill $DEV_PID
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/studyPanel.ts src/lib/components/panels/StudyPanel.svelte src/routes/+layout.svelte
git commit -m "feat: study panel slide-in shell with 5 tabs"
```

---

### Task G2: Linkify pipeline — click & hover on inline refs

**Files:**
- Modify: `src/lib/components/ccc/ParagraphRenderer.svelte` (add click + hover handlers)
- Create: `src/lib/utils/linkifyRefs.ts` (Svelte action for delegated handling)

The post-processed `<sup>` markers (cccRef, bibleRef, with possibly `.lead` class) are interactive. **Click** = open the panel with the right tab and context. **Hover** = show RefTooltip (tooltip implementation in G3).

- [ ] **Step 1: Modify `ParagraphRenderer.svelte`**

After the existing post-process logic in `$effect`, add click handlers:

```ts
import { openPanel, type PanelTab } from '$lib/stores/studyPanel';

// Inside $effect, after pass 2:
const paragraphNumber = (() => {
	// Walk up to find the article > paragraph number — pass it in as a prop instead
	return undefined;
})();
```

Actually a cleaner approach: pass `paragraphNumber` as a prop to `ParagraphRenderer`. Update the component:

```svelte
<script lang="ts">
	import type { MagisterialRefRecord } from '$lib/data/types';
	import { openPanel } from '$lib/stores/studyPanel';
	let {
		html,
		bibleRefs = [],
		paragraphNumber
	}: { html: string; bibleRefs?: MagisterialRefRecord[]; paragraphNumber: number } = $props();
	let containerEl: HTMLDivElement | undefined = $state();

	function formatBibleRef(raw: string): string {
		const cleaned = raw.replace(/^voir\s+/i, '').trim();
		return cleaned.replace(':', ', ');
	}

	$effect(() => {
		if (!containerEl) return;
		void html;
		void bibleRefs;
		// ...existing pass 1 + pass 2 logic unchanged...

		// New: attach a delegated click handler
		const onClick = (e: MouseEvent) => {
			if (!(e.target instanceof Element)) return;
			const sup = e.target.closest('sup.srcRef') as HTMLElement | null;
			if (!sup) return;
			e.preventDefault();
			const isCcc = sup.classList.contains('cccRef');
			const isBible = sup.classList.contains('bibleRef');
			const isDoc = sup.classList.contains('docRef');
			const tab = isCcc ? 'cross-refs' : isBible ? 'bible' : isDoc ? 'sources' : 'cross-refs';
			openPanel({ paragraph: paragraphNumber }, tab);
		};
		containerEl.addEventListener('click', onClick);
		return () => containerEl?.removeEventListener('click', onClick);
	});
</script>
```

Add cursor styling so the user knows refs are clickable:

```css
.prose-paragraph :global(sup.srcRef) {
	cursor: pointer;
}
```

- [ ] **Step 2: Update `ParagraphView.svelte`** to pass paragraph number

```svelte
<ParagraphRenderer
	html={paragraph.text_html}
	bibleRefs={paragraph.magisterial_refs}
	paragraphNumber={paragraph.number}
/>
```

- [ ] **Step 3: Smoke test**

Visit `/ccc/27` and click any sup. Panel should open with the right tab.

- [ ] **Step 4: e2e**

`tests/e2e/study-panel.test.ts`:

```ts
import { test, expect } from '@playwright/test';

test('clicking a §NNN ref opens the panel on the cross-refs tab', async ({ page }) => {
	await page.goto('/ccc/27');
	await page.locator('sup.srcRef.cccRef').first().click();
	await expect(page.getByRole('dialog', { name: 'Panneau d\'étude' })).toBeVisible();
	// 'Renvois' button should be active
});

test('panel closes on Escape', async ({ page }) => {
	await page.goto('/ccc/27');
	await page.locator('sup.srcRef.cccRef').first().click();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: 'Panneau d\'étude' })).not.toBeVisible();
});
```

- [ ] **Step 5: Run e2e + commit**

```bash
npm run test:e2e -- study-panel
git add src/lib/components/ccc/ParagraphRenderer.svelte src/lib/components/ccc/ParagraphView.svelte tests/e2e/study-panel.test.ts
git commit -m "feat: clicking inline §/bible refs opens the study panel"
```

---

### Task G3: Tab content components — Bible, Renvois, Cités par, En Bref

**Files:**
- Create: `src/lib/components/panels/TabBibleRefs.svelte`
- Create: `src/lib/components/panels/TabCrossRefs.svelte`
- Create: `src/lib/components/panels/TabCitedBy.svelte`
- Create: `src/lib/components/panels/TabEnBref.svelte`
- Modify: `src/lib/components/panels/StudyPanel.svelte` (route active tab → component)
- Modify: `src/lib/data/loaders.ts` (add `loadCitedBy`)

Each tab renders the relevant data for the current paragraph. Loaders fetch the JSON. Skeleton states handle the brief async window.

- [ ] **Step 1: Add `loadCitedBy` loader**

In `src/lib/data/loaders.ts`:

```ts
export function loadCitedBy(fetcher: Fetch = fetch): Promise<Record<number, number[]>> {
	return fetchJson<Record<number, number[]>>('/data/ccc/cited-by.json', fetcher);
}
```

- [ ] **Step 2: Write `TabBibleRefs.svelte`**

```svelte
<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph } from '$lib/data/loaders';
	import type { Paragraph, BibleRef } from '$lib/data/types';

	let refs: BibleRef[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const p: Paragraph = await loadParagraph(ctx.paragraph);
			refs = p.bible_refs;
		})();
	});

	function bibleHref(text: string): string {
		// "Mt 28:19-20" → "/bible/matthieu/28/19" (skip range tail for now)
		const m = text.match(/^([1-3]?\s*[A-Za-zÉéèê]+)\s*(\d+):(\d+)/);
		if (!m) return '#';
		// We'll add a slugify map in Task H. For now stash the raw.
		return `#${text}`;
	}
</script>

<div class="space-y-2 font-ui text-sm">
	{#if refs.length === 0}
		<p class="text-muted italic">Aucune référence biblique.</p>
	{:else}
		<ul class="space-y-1">
			{#each refs as ref, i (i)}
				<li>
					<a href={bibleHref(ref.text)} class="text-accent hover:underline">{ref.text}</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
```

- [ ] **Step 3: Write `TabCrossRefs.svelte`**

```svelte
<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph } from '$lib/data/loaders';

	let crossRefs: string[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const p = await loadParagraph(ctx.paragraph);
			crossRefs = p.cross_refs;
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if crossRefs.length === 0}
		<p class="text-muted italic">Aucun renvoi.</p>
	{:else}
		<ul class="flex flex-wrap gap-2">
			{#each crossRefs as ref (ref)}
				<li>
					<a href="/ccc/{ref}" class="text-accent hover:underline">§ {ref}</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
```

- [ ] **Step 4: Write `TabCitedBy.svelte`**

```svelte
<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadCitedBy } from '$lib/data/loaders';

	let citers: number[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const all = await loadCitedBy();
			citers = all[ctx.paragraph] ?? [];
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if citers.length === 0}
		<p class="text-muted italic">Aucun paragraphe ne cite ce paragraphe.</p>
	{:else}
		<ul class="flex flex-wrap gap-2">
			{#each citers as c (c)}
				<li>
					<a href="/ccc/{c}" class="text-accent hover:underline">§ {c}</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
```

- [ ] **Step 5: Write `TabEnBref.svelte`**

```svelte
<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';

	// EN BREF tab is contextual: we don't know the chapter the paragraph belongs to without
	// loading paragraph-context. For Phase 2 we keep it simple — a link to the chapter.
	import { loadParagraphContexts } from '$lib/data/loaders';
	import type { ParagraphContext } from '$lib/data/types';

	let context: ParagraphContext | null = $state(null);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const all = await loadParagraphContexts();
			context = all[ctx.paragraph] ?? null;
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if !context?.chapter}
		<p class="text-muted italic">Pas d'En Bref disponible.</p>
	{:else}
		<p class="text-muted">
			Voir l'En Bref dans le chapitre :
		</p>
		<p class="mt-2">
			<a
				href={`/ccc/${context.part.slug}/${context.section!.slug}/${context.chapter.slug}#en-bref`}
				class="text-accent hover:underline"
			>
				{context.chapter.title} →
			</a>
		</p>
	{/if}
</div>
```

- [ ] **Step 6: Wire into StudyPanel**

In `StudyPanel.svelte`, replace the placeholder content:

```svelte
<script lang="ts">
	import { studyPanel, closePanel } from '$lib/stores/studyPanel';
	import { fly } from 'svelte/transition';
	import TabBibleRefs from './TabBibleRefs.svelte';
	import TabCrossRefs from './TabCrossRefs.svelte';
	import TabCitedBy from './TabCitedBy.svelte';
	import TabEnBref from './TabEnBref.svelte';
	// TabSources comes in G4
	// ...rest unchanged...
</script>

<!-- Replace `<p class="text-sm text-muted italic">Contenu de l'onglet à venir.</p>` with: -->
{#if $studyPanel.activeTab === 'bible'}
	<TabBibleRefs />
{:else if $studyPanel.activeTab === 'cross-refs'}
	<TabCrossRefs />
{:else if $studyPanel.activeTab === 'cited-by'}
	<TabCitedBy />
{:else if $studyPanel.activeTab === 'en-bref'}
	<TabEnBref />
{:else}
	<p class="text-muted italic text-sm">Sélectionnez un onglet.</p>
{/if}
```

- [ ] **Step 7: Smoke test**

Visit `/ccc/27`, click a §NNN sup, see the cross-refs tab populate. Click "Bible" tab, see Bible refs (if any). Click "Cités par", see citing paragraphs.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/panels/ src/lib/data/loaders.ts
git commit -m "feat: study panel tabs — Bible, Renvois, Cités par, En Bref"
```

---

### Task G4: Sources index + Sources tab

**Files:**
- Create: `scripts/prepare/sources-index.ts`
- Modify: `scripts/prepare-data.ts`
- Test: `tests/unit/prepare/sources-index.test.ts`
- Create: `src/lib/components/panels/TabSources.svelte`
- Modify: `src/lib/data/loaders.ts`
- Modify: `src/lib/components/panels/StudyPanel.svelte` (wire 'sources' tab)

Parse `index_citations/*.xhtml` files into `ccc/sources-index.json`: doc → list of CCC paragraphs that cite it. The Sources tab for a paragraph shows which magisterial documents that paragraph cites (from its own `magisterial_refs`).

**Tooling:** `context7` for `parse5` AST shape.

- [ ] **Step 1: Failing test for parser**

`tests/unit/prepare/sources-index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseSourceTable } from '../../../scripts/prepare/sources-index';

describe('parseSourceTable', () => {
	it('extracts doc → paragraphs from a citation table', () => {
		// Minimal fixture mimicking the structure
		const xml = `<html><body><div class="level1"><h1>Documents pontificaux</h1>
			<table>
				<tbody>
					<tr><td>Damase I er</td><td>lettre aux évêques</td><td>149</td></tr>
					<tr><td>Léon le Grand</td><td>« Quam laudabiliter »</td><td>284</td></tr>
				</tbody>
			</table>
		</div></body></html>`;
		const result = parseSourceTable(xml);
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			category: 'Documents pontificaux',
			doc_name: expect.stringContaining('Damase')
		});
	});
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test:unit -- sources-index.test.ts
```

- [ ] **Step 3: Write `scripts/prepare/sources-index.ts`** (basic parse)

```ts
import { parse } from 'parse5';

interface ParseNode {
	tagName?: string;
	nodeName: string;
	childNodes?: ParseNode[];
	value?: string;
	attrs?: { name: string; value: string }[];
}

function* iterate(node: ParseNode): Generator<ParseNode> {
	yield node;
	for (const c of node.childNodes ?? []) yield* iterate(c as ParseNode);
}

function textOf(n: ParseNode): string {
	if (n.nodeName === '#text') return (n.value ?? '').replace(/\s+/g, ' ').trim();
	let s = '';
	for (const c of n.childNodes ?? []) s += ' ' + textOf(c as ParseNode);
	return s.replace(/\s+/g, ' ').trim();
}

export interface SourceEntry {
	category: string;
	doc_name: string;
	location: string;
	paragraphs: number[];
}

export function parseSourceTable(xml: string): SourceEntry[] {
	const doc = parse(xml) as unknown as ParseNode;
	const out: SourceEntry[] = [];
	let category = '';
	for (const n of iterate(doc)) {
		if (n.tagName === 'h1') {
			category = textOf(n);
		}
		if (n.tagName === 'tr') {
			const cells = (n.childNodes ?? []).filter(
				(c) => (c as ParseNode).tagName === 'td'
			) as ParseNode[];
			if (cells.length < 2) continue;
			// Heuristic: first cell is the doc author; subsequent cells are location + paragraph numbers
			const docName = textOf(cells[0]!);
			const location = cells.length > 2 ? textOf(cells[1]!) : '';
			const last = textOf(cells[cells.length - 1]!);
			const paragraphs = (last.match(/\b\d+\b/g) ?? []).map((s) => parseInt(s, 10));
			if (docName && paragraphs.length > 0) {
				out.push({ category, doc_name: docName, location, paragraphs });
			}
		}
	}
	return out;
}
```

- [ ] **Step 4: Pass + integrate**

In `prepare-data.ts`:

```ts
import { parseSourceTable } from './prepare/sources-index.ts';
import { readdirSync } from 'node:fs';

	logStep('parsing sources index');
	const sourcesDir = join(SOURCES, 'thematic_cross-refs/index_citations');
	const sourceFiles = readdirSync(sourcesDir).filter((f) => f.endsWith('.xhtml'));
	const sourceEntries = sourceFiles.flatMap((f) =>
		parseSourceTable(readFileSync(join(sourcesDir, f), 'utf8'))
	);
	writeFileSync(join(OUT, 'ccc/sources-index.json'), JSON.stringify(sourceEntries, null, 2));
	endStep(`${sourceEntries.length} entries`);
```

- [ ] **Step 5: Write `loadSourcesIndex` loader**

```ts
import type { SourceEntry } from '$lib/data/types';
// add SourceEntry type matching the prep one

export function loadSourcesIndex(fetcher: Fetch = fetch): Promise<SourceEntry[]> {
	return fetchJson<SourceEntry[]>('/data/ccc/sources-index.json', fetcher);
}
```

Update `src/lib/data/types.ts`:

```ts
export interface SourceEntry {
	category: string;
	doc_name: string;
	location: string;
	paragraphs: number[];
}
```

(There's already a `SourceEntry` interface there from Phase 1; replace its shape with this one.)

- [ ] **Step 6: Write `TabSources.svelte`**

```svelte
<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadParagraph } from '$lib/data/loaders';
	import type { MagisterialRefRecord } from '$lib/data/types';

	let refs: MagisterialRefRecord[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx) return;
		(async () => {
			const p = await loadParagraph(ctx.paragraph);
			refs = p.magisterial_refs.filter((r) => r.type === 'magisterial' || r.type === 'patristic' || r.type === 'liturgical');
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if refs.length === 0}
		<p class="text-muted italic">Aucune source.</p>
	{:else}
		<ul class="space-y-2">
			{#each refs as ref, i (i)}
				<li>
					<span class="text-accent font-semibold">{ref.type}</span>
					<span class="ml-2">{ref.raw}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
```

- [ ] **Step 7: Wire into StudyPanel**

```svelte
<!-- inside StudyPanel.svelte content switch: -->
{:else if $studyPanel.activeTab === 'sources'}
	<TabSources />
```

(Add the import.)

- [ ] **Step 8: Run, verify, commit**

```bash
npm run prepare-data
npm run test:unit -- sources-index
npm run test:e2e
git add scripts/prepare/sources-index.ts scripts/prepare-data.ts tests/unit/prepare/sources-index.test.ts src/lib/components/panels/TabSources.svelte src/lib/data/loaders.ts src/lib/data/types.ts src/lib/components/panels/StudyPanel.svelte
git commit -m "feat: sources index parser + Sources panel tab"
```

---

## Section H — Bible Hub (`/bible/`)

### Task H1: Bible book name registry

**Files:**
- Create: `scripts/prepare/bible-book-names.ts`
- Create: `src/lib/utils/bibleBookSlug.ts`
- Test: `tests/unit/utils/bibleBookSlug.test.ts`

USFX uses 3-letter book IDs (GEN, EXO, MAT). We need:
- French display name (Genèse, Exode, Matthieu)
- URL slug (genese, exode, matthieu)
- The CCC's notation often uses French abbreviations (Mt, Lc, Gn) — we need to recognize those too.

- [ ] **Step 1: Write `src/lib/utils/bibleBookSlug.ts`**

```ts
export interface BookInfo {
	usfx: string; // 3-letter ID (GEN, MAT, …)
	slug: string; // URL slug (genese, matthieu)
	frenchName: string; // Full display (Genèse, Matthieu)
	abbrs: string[]; // Common French abbreviations (Gn, Mt, …)
}

export const BOOKS: BookInfo[] = [
	{ usfx: 'GEN', slug: 'genese', frenchName: 'Genèse', abbrs: ['Gn', 'Gen'] },
	{ usfx: 'EXO', slug: 'exode', frenchName: 'Exode', abbrs: ['Ex', 'Exo'] },
	{ usfx: 'LEV', slug: 'levitique', frenchName: 'Lévitique', abbrs: ['Lv', 'Lev'] },
	{ usfx: 'NUM', slug: 'nombres', frenchName: 'Nombres', abbrs: ['Nb', 'Num'] },
	{ usfx: 'DEU', slug: 'deuteronome', frenchName: 'Deutéronome', abbrs: ['Dt', 'Deut'] },
	{ usfx: 'JOS', slug: 'josue', frenchName: 'Josué', abbrs: ['Jos'] },
	{ usfx: 'JDG', slug: 'juges', frenchName: 'Juges', abbrs: ['Jg', 'Jdg'] },
	{ usfx: 'RUT', slug: 'ruth', frenchName: 'Ruth', abbrs: ['Rt'] },
	{ usfx: '1SA', slug: '1-samuel', frenchName: '1 Samuel', abbrs: ['1 S', '1 Sm'] },
	{ usfx: '2SA', slug: '2-samuel', frenchName: '2 Samuel', abbrs: ['2 S', '2 Sm'] },
	{ usfx: '1KI', slug: '1-rois', frenchName: '1 Rois', abbrs: ['1 R'] },
	{ usfx: '2KI', slug: '2-rois', frenchName: '2 Rois', abbrs: ['2 R'] },
	{ usfx: '1CH', slug: '1-chroniques', frenchName: '1 Chroniques', abbrs: ['1 Ch'] },
	{ usfx: '2CH', slug: '2-chroniques', frenchName: '2 Chroniques', abbrs: ['2 Ch'] },
	{ usfx: 'EZR', slug: 'esdras', frenchName: 'Esdras', abbrs: ['Esd'] },
	{ usfx: 'NEH', slug: 'nehemie', frenchName: 'Néhémie', abbrs: ['Ne', 'Néh'] },
	{ usfx: 'TOB', slug: 'tobie', frenchName: 'Tobie', abbrs: ['Tb'] },
	{ usfx: 'JDT', slug: 'judith', frenchName: 'Judith', abbrs: ['Jdt'] },
	{ usfx: 'EST', slug: 'esther', frenchName: 'Esther', abbrs: ['Est'] },
	{ usfx: '1MA', slug: '1-maccabees', frenchName: '1 Maccabées', abbrs: ['1 M'] },
	{ usfx: '2MA', slug: '2-maccabees', frenchName: '2 Maccabées', abbrs: ['2 M'] },
	{ usfx: 'JOB', slug: 'job', frenchName: 'Job', abbrs: ['Jb'] },
	{ usfx: 'PSA', slug: 'psaumes', frenchName: 'Psaumes', abbrs: ['Ps'] },
	{ usfx: 'PRO', slug: 'proverbes', frenchName: 'Proverbes', abbrs: ['Pr', 'Prov'] },
	{ usfx: 'ECC', slug: 'qoheleth', frenchName: 'Qohélet', abbrs: ['Qo', 'Eccl'] },
	{ usfx: 'SNG', slug: 'cantique', frenchName: 'Cantique des cantiques', abbrs: ['Ct'] },
	{ usfx: 'WIS', slug: 'sagesse', frenchName: 'Sagesse', abbrs: ['Sg'] },
	{ usfx: 'SIR', slug: 'siracide', frenchName: 'Siracide', abbrs: ['Si'] },
	{ usfx: 'ISA', slug: 'isaie', frenchName: 'Isaïe', abbrs: ['Is'] },
	{ usfx: 'JER', slug: 'jeremie', frenchName: 'Jérémie', abbrs: ['Jr'] },
	{ usfx: 'LAM', slug: 'lamentations', frenchName: 'Lamentations', abbrs: ['Lm'] },
	{ usfx: 'BAR', slug: 'baruch', frenchName: 'Baruch', abbrs: ['Ba'] },
	{ usfx: 'EZK', slug: 'ezechiel', frenchName: 'Ézéchiel', abbrs: ['Ez'] },
	{ usfx: 'DAN', slug: 'daniel', frenchName: 'Daniel', abbrs: ['Dn'] },
	{ usfx: 'HOS', slug: 'osee', frenchName: 'Osée', abbrs: ['Os'] },
	{ usfx: 'JOL', slug: 'joel', frenchName: 'Joël', abbrs: ['Jl'] },
	{ usfx: 'AMO', slug: 'amos', frenchName: 'Amos', abbrs: ['Am'] },
	{ usfx: 'OBA', slug: 'abdias', frenchName: 'Abdias', abbrs: ['Ab'] },
	{ usfx: 'JON', slug: 'jonas', frenchName: 'Jonas', abbrs: ['Jon'] },
	{ usfx: 'MIC', slug: 'michee', frenchName: 'Michée', abbrs: ['Mi'] },
	{ usfx: 'NAM', slug: 'nahum', frenchName: 'Nahum', abbrs: ['Na'] },
	{ usfx: 'HAB', slug: 'habacuc', frenchName: 'Habacuc', abbrs: ['Ha'] },
	{ usfx: 'ZEP', slug: 'sophonie', frenchName: 'Sophonie', abbrs: ['So'] },
	{ usfx: 'HAG', slug: 'aggee', frenchName: 'Aggée', abbrs: ['Ag'] },
	{ usfx: 'ZEC', slug: 'zacharie', frenchName: 'Zacharie', abbrs: ['Za'] },
	{ usfx: 'MAL', slug: 'malachie', frenchName: 'Malachie', abbrs: ['Ml'] },
	{ usfx: 'MAT', slug: 'matthieu', frenchName: 'Matthieu', abbrs: ['Mt'] },
	{ usfx: 'MRK', slug: 'marc', frenchName: 'Marc', abbrs: ['Mc'] },
	{ usfx: 'LUK', slug: 'luc', frenchName: 'Luc', abbrs: ['Lc'] },
	{ usfx: 'JHN', slug: 'jean', frenchName: 'Jean', abbrs: ['Jn'] },
	{ usfx: 'ACT', slug: 'actes', frenchName: 'Actes des Apôtres', abbrs: ['Ac'] },
	{ usfx: 'ROM', slug: 'romains', frenchName: 'Romains', abbrs: ['Rm'] },
	{ usfx: '1CO', slug: '1-corinthiens', frenchName: '1 Corinthiens', abbrs: ['1 Co'] },
	{ usfx: '2CO', slug: '2-corinthiens', frenchName: '2 Corinthiens', abbrs: ['2 Co'] },
	{ usfx: 'GAL', slug: 'galates', frenchName: 'Galates', abbrs: ['Ga'] },
	{ usfx: 'EPH', slug: 'ephesiens', frenchName: 'Éphésiens', abbrs: ['Ep'] },
	{ usfx: 'PHP', slug: 'philippiens', frenchName: 'Philippiens', abbrs: ['Ph'] },
	{ usfx: 'COL', slug: 'colossiens', frenchName: 'Colossiens', abbrs: ['Col'] },
	{ usfx: '1TH', slug: '1-thessaloniciens', frenchName: '1 Thessaloniciens', abbrs: ['1 Th'] },
	{ usfx: '2TH', slug: '2-thessaloniciens', frenchName: '2 Thessaloniciens', abbrs: ['2 Th'] },
	{ usfx: '1TI', slug: '1-timothee', frenchName: '1 Timothée', abbrs: ['1 Tm'] },
	{ usfx: '2TI', slug: '2-timothee', frenchName: '2 Timothée', abbrs: ['2 Tm'] },
	{ usfx: 'TIT', slug: 'tite', frenchName: 'Tite', abbrs: ['Tt'] },
	{ usfx: 'PHM', slug: 'philemon', frenchName: 'Philémon', abbrs: ['Phm'] },
	{ usfx: 'HEB', slug: 'hebreux', frenchName: 'Hébreux', abbrs: ['He'] },
	{ usfx: 'JAS', slug: 'jacques', frenchName: 'Jacques', abbrs: ['Jc'] },
	{ usfx: '1PE', slug: '1-pierre', frenchName: '1 Pierre', abbrs: ['1 P'] },
	{ usfx: '2PE', slug: '2-pierre', frenchName: '2 Pierre', abbrs: ['2 P'] },
	{ usfx: '1JN', slug: '1-jean', frenchName: '1 Jean', abbrs: ['1 Jn'] },
	{ usfx: '2JN', slug: '2-jean', frenchName: '2 Jean', abbrs: ['2 Jn'] },
	{ usfx: '3JN', slug: '3-jean', frenchName: '3 Jean', abbrs: ['3 Jn'] },
	{ usfx: 'JUD', slug: 'jude', frenchName: 'Jude', abbrs: ['Jude'] },
	{ usfx: 'REV', slug: 'apocalypse', frenchName: 'Apocalypse', abbrs: ['Ap'] }
];

export function bookBySlug(slug: string): BookInfo | undefined {
	return BOOKS.find((b) => b.slug === slug);
}
export function bookByUsfx(usfx: string): BookInfo | undefined {
	return BOOKS.find((b) => b.usfx === usfx);
}
export function bookByAbbr(abbr: string): BookInfo | undefined {
	const norm = abbr.trim();
	return BOOKS.find((b) => b.abbrs.some((a) => a === norm));
}
```

- [ ] **Step 2: Write tests**

`tests/unit/utils/bibleBookSlug.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bookBySlug, bookByUsfx, bookByAbbr } from '$lib/utils/bibleBookSlug';

describe('bookBySlug', () => {
	it('finds matthieu', () => {
		expect(bookBySlug('matthieu')?.usfx).toBe('MAT');
	});
});

describe('bookByUsfx', () => {
	it('finds MAT', () => {
		expect(bookByUsfx('MAT')?.slug).toBe('matthieu');
	});
});

describe('bookByAbbr', () => {
	it('matches Mt → Matthieu', () => {
		expect(bookByAbbr('Mt')?.usfx).toBe('MAT');
	});
	it('matches Gn → Genèse', () => {
		expect(bookByAbbr('Gn')?.usfx).toBe('GEN');
	});
});
```

- [ ] **Step 3: Run, pass, commit**

```bash
npm run test:unit -- bibleBookSlug
git add src/lib/utils/bibleBookSlug.ts tests/unit/utils/bibleBookSlug.test.ts
git commit -m "feat: bible book name + slug registry"
```

---

### Task H2: `/bible/` book grid

**Files:**
- Create: `src/routes/bible/+page.ts`, `+page.svelte`
- Create: `src/lib/components/bible/BookGrid.svelte`

- [ ] **Step 1: `+page.ts`**

```ts
import { BOOKS } from '$lib/utils/bibleBookSlug';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const ot = BOOKS.slice(0, BOOKS.findIndex((b) => b.usfx === 'MAT'));
	const nt = BOOKS.slice(BOOKS.findIndex((b) => b.usfx === 'MAT'));
	return { ot, nt };
};
```

- [ ] **Step 2: `+page.svelte`**

```svelte
<script lang="ts">
	import BookGrid from '$lib/components/bible/BookGrid.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Bible — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-4xl px-6 py-12">
	<h1 class="font-ui text-4xl font-bold mb-8">Recherche biblique</h1>
	<p class="text-muted mb-10">
		Choisissez un livre pour voir tous les paragraphes du Catéchisme qui le citent.
	</p>

	<h2 class="font-ui text-xl font-semibold mb-3">Ancien Testament</h2>
	<BookGrid books={data.ot} />

	<h2 class="font-ui text-xl font-semibold mt-10 mb-3">Nouveau Testament</h2>
	<BookGrid books={data.nt} />
</main>
```

- [ ] **Step 3: `BookGrid.svelte`**

```svelte
<script lang="ts">
	import type { BookInfo } from '$lib/utils/bibleBookSlug';
	let { books }: { books: BookInfo[] } = $props();
</script>

<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
	{#each books as book (book.slug)}
		<a
			href="/bible/{book.slug}"
			class="block p-2 text-sm rounded border border-border hover:border-accent hover:text-accent"
		>
			{book.frenchName}
		</a>
	{/each}
</div>
```

- [ ] **Step 4: e2e**

`tests/e2e/bible-hub.test.ts`:

```ts
import { test, expect } from '@playwright/test';

test('/bible shows OT and NT', async ({ page }) => {
	await page.goto('/bible');
	await expect(page.getByRole('heading', { name: 'Ancien Testament' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Nouveau Testament' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Matthieu' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Genèse' })).toBeVisible();
});
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/bible/ src/lib/components/bible/BookGrid.svelte tests/e2e/bible-hub.test.ts
git commit -m "feat: /bible/ book grid (OT + NT)"
```

---

### Task H3: `/bible/[book]` chapter grid + `/bible/[book]/[ch]` verse list

**Files:**
- Create: `src/params/biblebook.ts`
- Create: `src/routes/bible/[book=biblebook]/+page.ts`, `+page.svelte`
- Create: `src/routes/bible/[book=biblebook]/[ch]/+page.ts`, `+page.svelte`
- Create: `src/lib/components/bible/ChapterGrid.svelte`
- Create: `src/lib/components/bible/VerseList.svelte`

The chapter grid shows links to each chapter. The verse list shows verses with markers indicating which have CCC paragraphs citing them.

- [ ] **Step 1: Param matcher**

```ts
// src/params/biblebook.ts
import { bookBySlug } from '$lib/utils/bibleBookSlug';
export const match = (param: string) => Boolean(bookBySlug(param));
```

- [ ] **Step 2: `[book=biblebook]/+page.ts`**

```ts
import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const r = await fetch('/data/bible/ncl.json');
	const ncl = (await r.json()) as Record<string, Record<string, Record<string, string>>>;
	const chapters = Object.keys(ncl[book.usfx] ?? {})
		.map((c) => parseInt(c, 10))
		.filter((n) => Number.isFinite(n))
		.sort((a, b) => a - b);
	return { book, chapters };
};
```

- [ ] **Step 3: `+page.svelte`**

```svelte
<script lang="ts">
	import ChapterGrid from '$lib/components/bible/ChapterGrid.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.book.frenchName} — Bible</title></svelte:head>

<main class="mx-auto max-w-4xl px-6 py-10">
	<nav class="mb-6 font-ui text-sm">
		<a href="/bible" class="text-muted hover:text-accent">Bible</a>
		<span class="mx-2 text-subtle">›</span>
		<span class="font-semibold">{data.book.frenchName}</span>
	</nav>
	<h1 class="font-ui text-3xl font-bold mb-8">{data.book.frenchName}</h1>
	<ChapterGrid bookSlug={data.book.slug} chapters={data.chapters} />
</main>
```

- [ ] **Step 4: `ChapterGrid.svelte`**

```svelte
<script lang="ts">
	let { bookSlug, chapters }: { bookSlug: string; chapters: number[] } = $props();
</script>

<div class="flex flex-wrap gap-2 font-ui text-sm">
	{#each chapters as ch (ch)}
		<a
			href="/bible/{bookSlug}/{ch}"
			class="px-3 py-1.5 rounded border border-border hover:border-accent hover:text-accent"
		>
			{ch}
		</a>
	{/each}
</div>
```

- [ ] **Step 5: `[ch]/+page.ts`**

```ts
import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = params.ch!;
	const [r1, r2] = await Promise.all([
		fetch('/data/bible/ncl.json'),
		fetch('/data/ccc/bible-index.json')
	]);
	const ncl = (await r1.json()) as Record<string, Record<string, Record<string, string>>>;
	const bibleIdx = (await r2.json()) as Record<string, number[]>;
	const verses = ncl[book.usfx]?.[ch];
	if (!verses) throw error(404);
	// For each verse, look up CCC citations.
	// CCC's bible-index uses the abbr form (e.g. "Mt 28:19" or "Mt 28:19-20"). We index verses by exact match
	// AND by ranges that contain the verse. For Phase 2 we do exact match only; ranges are a future improvement.
	const verseList = Object.entries(verses)
		.map(([v, text]) => ({
			v: parseInt(v, 10),
			text,
			cccCitations: bibleIdx[`${book.abbrs[0]} ${ch}:${v}`] ?? []
		}))
		.sort((a, b) => a.v - b.v);
	return { book, chapter: parseInt(ch, 10), verses: verseList };
};
```

- [ ] **Step 6: `[ch]/+page.svelte`**

```svelte
<script lang="ts">
	import VerseList from '$lib/components/bible/VerseList.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.book.frenchName} {data.chapter} — Bible</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-10">
	<nav class="mb-6 font-ui text-sm">
		<a href="/bible" class="text-muted hover:text-accent">Bible</a>
		<span class="mx-2 text-subtle">›</span>
		<a href="/bible/{data.book.slug}" class="text-muted hover:text-accent">{data.book.frenchName}</a>
		<span class="mx-2 text-subtle">›</span>
		<span class="font-semibold">Chapitre {data.chapter}</span>
	</nav>
	<h1 class="font-ui text-3xl font-bold mb-8">
		{data.book.frenchName} {data.chapter}
	</h1>
	<VerseList bookSlug={data.book.slug} chapter={data.chapter} verses={data.verses} />
</main>
```

- [ ] **Step 7: `VerseList.svelte`**

```svelte
<script lang="ts">
	type Verse = { v: number; text: string; cccCitations: number[] };
	let { bookSlug, chapter, verses }: { bookSlug: string; chapter: number; verses: Verse[] } = $props();
</script>

<ol class="space-y-2 font-body text-base leading-relaxed">
	{#each verses as v (v.v)}
		<li class="flex gap-3">
			<a
				href="/bible/{bookSlug}/{chapter}/{v.v}"
				class="flex-none w-8 text-right pt-0.5 font-ui text-sm font-semibold text-accent tabular-nums hover:underline"
			>
				{v.v}
			</a>
			<div class="flex-1">
				{v.text}
				{#if v.cccCitations.length > 0}
					<span class="ml-2 text-xs text-subtle">[{v.cccCitations.length} CEC]</span>
				{/if}
			</div>
		</li>
	{/each}
</ol>
```

- [ ] **Step 8: e2e**

Add to `tests/e2e/bible-hub.test.ts`:

```ts
test('/bible/matthieu lists chapters', async ({ page }) => {
	await page.goto('/bible/matthieu');
	await expect(page.getByRole('heading', { name: 'Matthieu' })).toBeVisible();
	await expect(page.getByRole('link', { name: '1', exact: true })).toBeVisible();
});

test('/bible/matthieu/28 lists verses', async ({ page }) => {
	await page.goto('/bible/matthieu/28');
	await expect(page.getByRole('heading', { name: /Matthieu 28/ })).toBeVisible();
	// At least one verse should be visible
	await expect(page.locator('ol > li').first()).toBeVisible();
});
```

- [ ] **Step 9: Commit**

```bash
git add src/params/biblebook.ts src/routes/bible/ src/lib/components/bible/ tests/e2e/bible-hub.test.ts
git commit -m "feat: /bible/[book] chapter grid and /bible/[book]/[ch] verse list"
```

---

### Task H4: `/bible/[book]/[ch]/[v]` — single verse → CCC citations

**Files:**
- Create: `src/routes/bible/[book=biblebook]/[ch]/[v]/+page.ts`, `+page.svelte`
- Create: `src/lib/components/bible/VerseToCccList.svelte`

- [ ] **Step 1: `+page.ts`**

```ts
import { error } from '@sveltejs/kit';
import { bookBySlug } from '$lib/utils/bibleBookSlug';
import { loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const book = bookBySlug(params.book!);
	if (!book) throw error(404);
	const ch = parseInt(params.ch!, 10);
	const v = parseInt(params.v!, 10);
	const [r1, r2] = await Promise.all([
		fetch('/data/bible/ncl.json'),
		fetch('/data/ccc/bible-index.json')
	]);
	const ncl = (await r1.json()) as Record<string, Record<string, Record<string, string>>>;
	const bibleIdx = (await r2.json()) as Record<string, number[]>;
	const text = ncl[book.usfx]?.[ch]?.[v];
	if (!text) throw error(404);

	// Pull all CCC paragraphs that cite this verse, including any that cite a range containing it.
	const cited = new Set<number>();
	for (const [refKey, paragraphs] of Object.entries(bibleIdx)) {
		// refKey like "Mt 28:19" or "Mt 28:19-20"
		const m = refKey.match(/^([1-3]?\s*[A-Za-zÉéèê]+)\s*(\d+):(\d+)(?:-(\d+))?$/);
		if (!m) continue;
		const refAbbr = m[1]!.trim();
		const refCh = parseInt(m[2]!, 10);
		const fromV = parseInt(m[3]!, 10);
		const toV = m[4] ? parseInt(m[4]!, 10) : fromV;
		const matchesBook = book.abbrs.some((a) => a === refAbbr);
		if (!matchesBook || refCh !== ch) continue;
		if (v >= fromV && v <= toV) {
			for (const n of paragraphs) cited.add(n);
		}
	}
	const sorted = Array.from(cited).sort((a, b) => a - b);
	const paragraphs = await Promise.all(sorted.map((n) => loadParagraph(n, fetch)));
	return { book, chapter: ch, verse: v, text, paragraphs };
};
```

- [ ] **Step 2: `+page.svelte`**

```svelte
<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.book.frenchName} {data.chapter}, {data.verse} — Bible</title></svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	<nav class="mb-6 font-ui text-sm">
		<a href="/bible" class="text-muted hover:text-accent">Bible</a>
		<span class="mx-2 text-subtle">›</span>
		<a href="/bible/{data.book.slug}" class="text-muted hover:text-accent">{data.book.frenchName}</a>
		<span class="mx-2 text-subtle">›</span>
		<a href="/bible/{data.book.slug}/{data.chapter}" class="text-muted hover:text-accent"
			>Chapitre {data.chapter}</a
		>
		<span class="mx-2 text-subtle">›</span>
		<span class="font-semibold">Verset {data.verse}</span>
	</nav>
	<h1 class="font-ui text-2xl font-bold mb-2">
		{data.book.frenchName} {data.chapter}, {data.verse}
	</h1>
	<blockquote class="border-l-4 border-accent pl-4 my-6 italic text-lg">
		{data.text}
	</blockquote>

	<h2 class="font-ui text-sm uppercase tracking-wider text-muted mt-10 mb-4">
		Paragraphes du Catéchisme citant ce verset ({data.paragraphs.length})
	</h2>
	{#if data.paragraphs.length === 0}
		<p class="text-muted italic">Aucun paragraphe.</p>
	{:else}
		{#each data.paragraphs as p (p.number)}
			<ParagraphView paragraph={p} />
		{/each}
	{/if}
</main>
```

- [ ] **Step 3: e2e**

```ts
test('/bible/matthieu/28/19 shows CCC paragraphs', async ({ page }) => {
	await page.goto('/bible/matthieu/28/19');
	await expect(page.getByRole('heading', { name: /Matthieu 28, 19/ })).toBeVisible();
	await expect(page.getByText(/Paragraphes du Catéchisme/)).toBeVisible();
});
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/bible/ tests/e2e/bible-hub.test.ts
git commit -m "feat: /bible/[book]/[ch]/[v] verse → citing CCC paragraphs"
```

---

## Section I — Article-Level Routes

### Task I1: `/ccc/[part]/[section]/[chapter]/[article]` filtered article view

**Files:**
- Create: `src/routes/ccc/[part]/[section]/[chapter]/[article]/+page.ts`, `+page.svelte`

The article view is the chapter view filtered to only that article's paragraphs (with the article title as the page header). Reuses `ParagraphView` for rendering.

- [ ] **Step 1: `+page.ts`**

```ts
import { error } from '@sveltejs/kit';
import { loadChapter, loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const chapter = await loadChapter(params.chapter!, fetch).catch(() => {
		throw error(404, 'Chapitre introuvable');
	});
	if (chapter.part_slug !== params.part || chapter.section_slug !== params.section) {
		throw error(404);
	}
	const article = chapter.articles.find((a) => a.slug === params.article);
	if (!article) throw error(404, 'Article introuvable');
	const paragraphs = await Promise.all(article.paragraphs.map((n) => loadParagraph(n, fetch)));
	return { chapter, article, paragraphs };
};
```

- [ ] **Step 2: `+page.svelte`**

```svelte
<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.article.title} — Catéchisme</title>
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-10">
	<nav class="mb-6 font-ui text-sm" aria-label="Fil d'Ariane">
		<ol class="space-y-1">
			<li><a href="/ccc" class="text-muted hover:text-accent">Catéchisme</a></li>
			<li class="pl-5">
				<a href="/ccc/{data.chapter.part_slug}" class="text-muted hover:text-accent">
					<span class="font-semibold">Partie {data.chapter.part_number} :</span>
					{data.chapter.part_title}
				</a>
			</li>
			<li class="pl-10">
				<a
					href="/ccc/{data.chapter.part_slug}/{data.chapter.section_slug}"
					class="text-muted hover:text-accent"
				>
					<span class="font-semibold">Section {data.chapter.section_number} :</span>
					{data.chapter.section_title}
				</a>
			</li>
			<li class="pl-[3.75rem]">
				<a
					href="/ccc/{data.chapter.part_slug}/{data.chapter.section_slug}/{data.chapter.slug}"
					class="text-muted hover:text-accent"
				>
					<span class="font-semibold">Chapitre {data.chapter.number} :</span>
					{data.chapter.title}
				</a>
			</li>
			<li class="pl-20">
				<span class="font-semibold">Article {data.article.number} :</span>
				{data.article.title}
			</li>
		</ol>
	</nav>

	<h1 class="font-ui text-3xl font-bold mt-2 mb-8 text-heading">{data.article.title}</h1>

	{#each data.paragraphs as p (p.number)}
		{@const heading = data.article.headings.find((h) => h.paragraph_start === p.number)}
		{#if heading}
			<h2 id={heading.id} class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24 text-accent">
				{heading.title}
			</h2>
		{/if}
		<ParagraphView paragraph={p} />
	{/each}
</main>
```

- [ ] **Step 3: e2e**

```ts
test('article page shows only the article paragraphs', async ({ page }) => {
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/ccc/structure.json', 'utf8'));
	const part = struct.parts.find((p: any) => !p.prologue);
	const section = part.sections.find((s: any) => s.chapters.some((c: any) => c.articles.length));
	const chapter = section.chapters.find((c: any) => c.articles.length);
	const article = chapter.articles[0];
	await page.goto(`/ccc/${part.slug}/${section.slug}/${chapter.slug}/${article.slug}`);
	await expect(page.getByRole('heading', { level: 1 })).toContainText(article.title);
});
```

- [ ] **Step 4: Run e2e + commit**

```bash
npm run test:e2e
git add src/routes/ccc/\[part\]/\[section\]/\[chapter\]/\[article\]/ tests/e2e/reader.test.ts
git commit -m "feat: article-level route /ccc/[part]/[section]/[chapter]/[article]"
```

---

## Phase 2 Done — What Ships

After all sections complete:

- Persistent expandable sidebar replacing the chapter outline
- 3-column cascading "Catéchisme" dropdown in the TopBar
- Slide-in study panel triggered by clicking inline refs
- 5 panel tabs: Bible refs, Cross-refs, Cités par, Sources, En Bref
- `/bible/` reverse-lookup hub: book grid → chapters → verses → CCC paragraphs citing
- Article-level routes: `/ccc/[part]/[section]/[chapter]/[article]`
- Source-data quality fixes: first-word capitalization in paragraph body, bible_ref continuation merge
- 5 new e2e test files (study panel, bible hub, sidebar nav, article view) + new unit tests

## Subsequent Phases — Outline

- **Phase 3**: Search (MiniSearch index, intent detection, KV upload, advanced search page, header search input wired)
- **Phase 4**: Mobile responsive design, full reading prefs panel (6 fonts + Grace Dyslexic, all toggles), PWA + offline, schema.org markup, llms.txt, robots.txt, print stylesheet, Lighthouse ≥95 pass, accessibility WCAG AA pass, custom domain wiring

---

## Self-Review Notes

Reviewed Phase 2 plan against the spec. Findings:

- Spec §5 components for Phase 2 (StudyPanel, RefTooltip, panel tabs, Bible hub components, etc.) → all covered.
  - **Gap**: `RefTooltip` (hover preview) is not implemented in this plan. Click-to-panel is implemented (G2); hover tooltip is deferred. Adding RefTooltip is a small follow-up; flagged as optional task at end of Phase 2 if time permits.
- Spec §4 routes covered: ✓ /bible/ (4 levels), article route.
- Spec §7 navigation: cascading dropdown ✓, sidebar TOC ✓ (replacement for chapter outline).
- Spec §8 search: explicitly deferred to Phase 3.
- Spec §3 data: cited-by, sources-index added; thematic-index NOT yet generated (deferred to Phase 3 when search needs it).
- Spec §10 visual style mostly handled in Phase 1; Phase 2 follows established patterns.

Type consistency check: `Paragraph`, `Chapter`, `MagisterialRefRecord`, `ParagraphContext` shapes match Phase 1. New: `SourceEntry` (replaced from Phase 1 stub), `BookInfo` (new in `bibleBookSlug.ts`), `PanelState` / `PanelContext` / `PanelTab` (new in studyPanel store).

No placeholders. Each task ships working code.

**Decision flagged inline**: chapter outline replaced by sidebar (Task E6). If user prefers to keep the inline outline in addition to the sidebar, swap that task for adapting the sidebar to coexist (sidebar collapsed by default, outline shown when sidebar is closed).
