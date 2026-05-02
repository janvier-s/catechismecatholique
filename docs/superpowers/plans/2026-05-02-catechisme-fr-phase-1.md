# Catéchisme FR — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deployable French CCC reader at a Cloudflare Pages preview URL. By end of Phase 1, a user can navigate to `/ccc/27` and read paragraph 27, navigate to `/ccc/profession-de-la-foi/credo/capable-de-dieu` and read a full chapter with sticky outline, and visit `/ccc/sommaire` for the full TOC.

**Architecture:** SvelteKit 2 + Svelte 5 (Svelte 4 compat mode), TypeScript, Tailwind CSS 3, Cloudflare Pages. Static-prebuilt JSON in `static/data/`. No backend database. Multi-corpus-ready data shape from day 1 (every record has a `corpus: 'ccc'` field).

**Tech Stack:**
- SvelteKit 2 + Svelte 5 (compat mode — `export let`, `$:`, writable stores; no runes)
- TypeScript (strict)
- Tailwind CSS 3
- `@sveltejs/adapter-cloudflare`
- Vitest + Playwright (set up; tests added per task)
- Build-time data prep: `tsx`, `parse5` (forgiving HTML parser), `sharp` (logos)
- ESLint + Prettier (mirror DR config)

**Reference spec:** `../../../douayrheimsbible/docs/superpowers/specs/2026-05-02-catechisme-fr-design.md` (in the DR repo).

---

## Tooling Reference (read before every task)

The following MCP servers and agents are available. **Use them rather than relying on training-data recall** — library APIs, framework conventions, and Svelte syntax change over time and getting them wrong wastes review cycles.

### MCP servers

| Server | When to use |
|---|---|
| **`svelte`** | Any time you write or modify a `.svelte` file, a SvelteKit `+page.ts` / `+layout.ts` / `+server.ts`, or `svelte.config.js`. Confirm syntax, check API references, validate component code. **This project runs in Svelte 4 compatibility mode** — no runes (`$state`, `$derived`, `$effect`); use `export let`, `$:`, writable stores. |
| **`context7`** | Library docs that aren't Svelte: `parse5`, `xml2js`, `sharp`, `tsx`, `vitest`, `playwright`, `@sveltejs/adapter-cloudflare`, Tailwind 3, MiniSearch (Phase 3). Resolve library ID first, then query docs. |
| **`playwright`** (browser MCP) | When validating e2e tests interactively or capturing screenshots for visual checks. Not strictly required for headless Playwright runs; useful when debugging a flaky test. |

### Agents (dispatch via the `Agent` tool)

| Agent | When to use |
|---|---|
| **`superpowers:code-reviewer`** | The code-quality review stage after spec compliance passes. The dispatcher uses this — implementers don't. |
| **`code-refactoring:code-reviewer`** | Alternate reviewer if `superpowers:code-reviewer` flags inconclusive results; gives a second perspective. |
| **`Explore`** | When a subagent needs to find related code in the existing DR site (`../douayrheimsbible/`) for pattern-matching — DON'T re-implement what already exists in DR; reference and adapt. |

### Project conventions (load-bearing)

- **Svelte 4 syntax only.** This is documented in `CLAUDE.md` and is intentional. Reject any temptation to use runes.
- **Tailwind 3** — not 4. Class names and arbitrary-value syntax follow v3 conventions.
- **TypeScript strict mode** — `noUncheckedIndexedAccess` is on; expect to handle `undefined` from array index access.
- **Frequent, small commits** — every step that produces working code commits before moving on.

---

## File Structure

Phase 1 establishes this layout in the `lecatechisme/` directory:

```
lecatechisme/
├── package.json
├── pnpm-lock.yaml (or package-lock.json)
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.cjs
├── postcss.config.cjs
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── .npmrc
├── README.md
├── CLAUDE.md
├── bin/
│   └── optimize-logos.ts
├── scripts/
│   ├── prepare-data.ts                  # Main build-time data prep entry
│   ├── data-sources/                    # Symlinks to source files
│   │   ├── ccc_paras_processed.json -> ../../../DOCTRINA/JSON/CCC/ccc_paras_processed.json
│   │   ├── ccc_bible_index_clean.json -> ../../../DOCTRINA/JSON/CCC/ccc_bible_index_clean.json
│   │   ├── ccc_cross_refs_bidirectional.json -> ../../../DOCTRINA/JSON/CCC/ccc_cross_refs_bidirectional.json
│   │   ├── sigles.xhtml -> ../../../DOCTRINA/sources/CCC/CCC_1998_FULL/sigles.xhtml
│   │   ├── toc.ncx -> ../../../DOCTRINA/sources/CCC/CCC_1998_FULL/toc.ncx
│   │   ├── thematic_cross-refs/         # symlink to whole directory
│   │   ├── ncl/francl_usfx.xml -> ../../../SCRIPTURA/sources/NCL/francl_usfx/francl_usfx.xml
│   │   └── logos/
│   │       ├── catechisme-logo.png -> ../../../Website/CCC/catechisme-logo.png
│   │       └── catechisme-logo-white.png -> ../../../Website/CCC/catechisme-logo-white.png
│   └── prepare/                         # Per-step prep modules
│       ├── structure.ts
│       ├── paragraphs.ts
│       ├── chapters.ts
│       ├── enbref.ts
│       ├── citations.ts
│       ├── refs.ts
│       ├── abbreviations.ts
│       ├── bible-index.ts
│       ├── thematic.ts
│       ├── sources.ts
│       ├── ncl.ts
│       ├── slug.ts
│       └── validators.ts
├── src/
│   ├── app.html
│   ├── app.d.ts
│   ├── app.css                          # Tailwind directives + theme tokens
│   ├── hooks.server.ts                  # (Phase 4: SEO + analytics)
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/                      # Generic shell
│   │   │   │   ├── TopBar.svelte
│   │   │   │   ├── Wordmark.svelte
│   │   │   │   ├── LogoMark.svelte
│   │   │   │   ├── PageFooter.svelte
│   │   │   │   ├── PrefsPanel.svelte    # Minimal in Phase 1
│   │   │   │   └── ModeToggle.svelte
│   │   │   └── ccc/                     # CCC-specific reading
│   │   │       ├── CCCReader.svelte
│   │   │       ├── ChapterOutline.svelte
│   │   │       ├── ParagraphView.svelte
│   │   │       ├── ParagraphRenderer.svelte
│   │   │       ├── EnBrefBlock.svelte
│   │   │       ├── CitationBlock.svelte
│   │   │       ├── CccRefMark.svelte    # Inline marker (no behavior yet — Phase 2)
│   │   │       ├── BibleRefMark.svelte
│   │   │       └── MagisterialRef.svelte
│   │   ├── data/
│   │   │   ├── loaders.ts               # JSON loaders
│   │   │   └── types.ts                 # Type defs for all data records
│   │   ├── stores/
│   │   │   ├── prefs.ts                 # Minimal subset in Phase 1
│   │   │   └── outline.ts               # Active heading
│   │   ├── utils/
│   │   │   ├── slug.ts                  # Same logic as build-time slug.ts
│   │   │   ├── refs.ts                  # parseRef
│   │   │   └── linkifyRefs.ts           # use:linkifyRefs action (no-op in Phase 1)
│   │   └── corpus.ts                    # Corpus IDs constant
│   ├── params/
│   │   └── cccref.ts                    # /^\d+(-\d+)?$/ matcher
│   └── routes/
│       ├── +layout.svelte
│       ├── +layout.ts
│       ├── +page.svelte                 # Homepage placeholder
│       ├── +error.svelte
│       ├── ccc/
│       │   ├── +page.svelte             # /ccc corpus home
│       │   ├── sommaire/
│       │   │   └── +page.svelte
│       │   ├── prologue/
│       │   │   └── +page.svelte
│       │   ├── [ref=cccref]/
│       │   │   ├── +page.ts
│       │   │   └── +page.svelte
│       │   ├── partie/
│       │   │   └── [n]/
│       │   │       └── +page.ts         # Redirect handler
│       │   └── [part]/
│       │       ├── +page.ts
│       │       ├── +page.svelte
│       │       └── [section]/
│       │           ├── +page.ts
│       │           ├── +page.svelte
│       │           └── [chapter]/
│       │               ├── +page.ts
│       │               ├── +page.svelte
│       │               └── [article]/
│       │                   ├── +page.ts
│       │                   └── +page.svelte
│       └── a-propos/+page.svelte        # Stub
├── static/
│   ├── img/logo/                        # Optimized logos (committed)
│   ├── data/                            # Generated JSON (gitignored)
│   │   ├── ccc/
│   │   └── bible/
│   └── _redirects                       # Cloudflare redirects
└── tests/
    ├── unit/
    │   ├── slug.test.ts
    │   ├── refs.test.ts
    │   └── prepare/                     # Pipeline unit tests
    │       └── ...
    └── e2e/
        ├── reader.test.ts
        └── nav.test.ts
```

---

## Section A — Project Bootstrap

### Task A1: Initialize git repo and SvelteKit skeleton

**Files:**
- Create: entire project skeleton via `npm create`
- Create: `lecatechisme/.gitignore`

- [ ] **Step 1: cd into the lecatechisme directory and initialize git**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/lecatechisme"
git init
git checkout -b main
```

Expected: empty repo on `main` branch.

- [ ] **Step 2: Run SvelteKit skeleton creator**

```bash
npm create svelte@latest .
```

When prompted:
- Project template: **Skeleton project**
- TypeScript: **Yes, using TypeScript syntax**
- Add ESLint: **Yes**
- Add Prettier: **Yes**
- Add Playwright: **Yes**
- Add Vitest: **Yes**
- Add Svelte 5: **No** (use Svelte 4 compat — keep classic syntax)

Note: if the prompt offers Svelte 5 by default, the answer is the option that keeps `export let` / `$:` syntax. The DR site documents this is intentional (`CLAUDE.md`).

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

- [ ] **Step 4: Verify skeleton dev server boots**

```bash
npm run dev
```

Expected: dev server starts on `http://localhost:5173`. Manually visit and confirm "Welcome to SvelteKit" page renders.

- [ ] **Step 5: Stop dev server, write `.gitignore` (extending the SvelteKit default)**

```
node_modules

# Output
.output
.vercel
.netlify
.wrangler
/.svelte-kit
/build

# OS
.DS_Store
Thumbs.db

# Env
.env
.env.*
!.env.example
!.env.test

# Vite
vite.config.js.timestamp-*
vite.config.ts.timestamp-*

# Generated data (rebuilt by prepare-data)
/static/data/

# Brainstorming local artifacts
.superpowers/

# Editor / IDE
.idea/
.vscode/

# Lighthouse output
lighthouse-*.json
```

- [ ] **Step 6: Initial commit**

```bash
git add .
git commit -m "feat: initialize SvelteKit skeleton with TypeScript, ESLint, Prettier, Vitest, Playwright"
```

---

### Task A2: Add Tailwind CSS 3

**Files:**
- Create: `tailwind.config.cjs`, `postcss.config.cjs`
- Modify: `src/app.css`, `src/routes/+layout.svelte`
- Modify: `package.json` (deps)

**Tooling:** if uncertain about Tailwind 3 config syntax (especially the `theme.extend` pattern or arbitrary-value notation), use the `context7` MCP — resolve `tailwindcss` (v3) and query.

- [ ] **Step 1: Install Tailwind + PostCSS deps**

```bash
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

Expected: creates `tailwind.config.js` (rename to `.cjs`) and `postcss.config.js` (rename to `.cjs`).

```bash
mv tailwind.config.js tailwind.config.cjs
mv postcss.config.js postcss.config.cjs
```

- [ ] **Step 2: Configure `tailwind.config.cjs`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				background: 'var(--color-bg)',
				foreground: 'var(--color-fg)',
				accent: 'var(--color-accent)',
				muted: 'var(--color-muted)',
				border: 'var(--color-border)'
			},
			fontFamily: {
				body: 'var(--font-body)',
				ui: 'var(--font-ui)'
			},
			maxWidth: {
				reader: '750px'
			}
		}
	},
	plugins: []
};
```

- [ ] **Step 3: Write `src/app.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
	:root {
		--color-bg: #faf6ec;
		--color-fg: #1f1c17;
		--color-accent: #a07a1f;
		--color-muted: #5a5448;
		--color-border: #d8d4cc;
		--font-body: 'Libre Baskerville', Georgia, serif;
		--font-ui: 'Gotham', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	[data-theme='dark'] {
		--color-bg: #1a1815;
		--color-fg: #e6e1d6;
		--color-accent: #d4a644;
		--color-muted: #a8a294;
		--color-border: #3a362e;
	}

	html {
		background: var(--color-bg);
		color: var(--color-fg);
		font-family: var(--font-body);
	}
}
```

- [ ] **Step 4: Wire `app.css` into `+layout.svelte`**

Replace `src/routes/+layout.svelte` contents:

```svelte
<script lang="ts">
	import '../app.css';
</script>

<slot />
```

- [ ] **Step 5: Verify Tailwind is applied**

Add a temporary `<h1 class="text-3xl font-bold">` in `src/routes/+page.svelte`. Run `npm run dev`, visit `localhost:5173`, confirm large bold heading. Then revert (leave file as the SvelteKit default).

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.cjs postcss.config.cjs src/app.css src/routes/+layout.svelte package.json package-lock.json
git commit -m "feat: add Tailwind CSS 3 with theme tokens and reader max-width"
```

---

### Task A3: Configure TypeScript strictly + Cloudflare adapter

**Files:**
- Modify: `tsconfig.json`
- Modify: `svelte.config.js`
- Modify: `package.json` (deps)
- Create: `src/app.d.ts` (already exists from skeleton; extend)

**Tooling:** use `context7` for `@sveltejs/adapter-cloudflare` if the adapter's config options have changed since training data. Use the `svelte` MCP to verify `svelte.config.js` shape.

- [ ] **Step 1: Install Cloudflare adapter**

```bash
npm uninstall @sveltejs/adapter-auto
npm install -D @sveltejs/adapter-cloudflare
```

- [ ] **Step 2: Update `svelte.config.js`**

```js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		}),
		inlineStyleThreshold: 51200,
		alias: {
			$lib: 'src/lib',
			$data: 'static/data'
		}
	}
};

export default config;
```

- [ ] **Step 3: Tighten `tsconfig.json`**

```json
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"moduleResolution": "bundler",
		"noUncheckedIndexedAccess": true,
		"noImplicitOverride": true
	}
}
```

- [ ] **Step 4: Verify type check passes**

Run: `npm run check`
Expected: `0 errors, 0 warnings`. If errors arise from skeleton stubs, fix the stubs (typically just adding explicit types on event handlers).

- [ ] **Step 5: Commit**

```bash
git add svelte.config.js tsconfig.json package.json package-lock.json
git commit -m "feat: switch to Cloudflare adapter, enable strict TypeScript"
```

---

### Task A4: Add `.npmrc`, README, CLAUDE.md, ESLint/Prettier alignment

**Files:**
- Create: `.npmrc`, `README.md`, `CLAUDE.md`
- Modify: `.eslintrc.cjs`, `.prettierrc`

- [ ] **Step 1: Create `.npmrc`**

```
engine-strict=true
save-exact=false
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Le Catéchisme

A French-language website for the Catéchisme de l'Église catholique.

## Stack

- SvelteKit 2 + Svelte 5 (Svelte 4 compat mode)
- TypeScript, Tailwind CSS 3
- Cloudflare Pages

## Develop

```
npm run dev
```

## Build

```
npm run build
```

## Reference

Design spec: `../douayrheimsbible/docs/superpowers/specs/2026-05-02-catechisme-fr-design.md`
```

- [ ] **Step 3: Create `CLAUDE.md`** (mirror the DR pattern)

```markdown
# Le Catéchisme — Claude Code Context

A SvelteKit web app serving the Catéchisme de l'Église catholique in French. Deployed on Cloudflare Pages + Workers.

## Stack

- SvelteKit 2 + Svelte 5 running in Svelte 4 compatibility mode (`export let`, `$:`, writable stores; no runes)
- Tailwind CSS 3, TypeScript (strict)
- Cloudflare Pages

## Svelte syntax — important

All components use Svelte 4 syntax. Do NOT migrate to Svelte 5 runes (`$state`, `$derived`, `$effect`) unless explicitly asked.

## Commands

```
npm run dev          # local dev server
npm run build        # prebuild (prepare-data.ts) + vite build
npm run check        # svelte-check + tsc
npm run test         # vitest
npm run test:e2e     # playwright
npm run lint         # prettier + eslint
npm run format       # prettier --write
npm run optimize-logos # one-time logo asset generation
```

## Architecture

- Multi-corpus from day 1: data records carry `corpus: 'ccc'`. Future: `compendium`, `pius-x-grand`, `pius-x-petit`, `trent`.
- Data prep: `scripts/prepare-data.ts` runs at `prebuild`, generates JSON in `static/data/`.
- Reading view: chapter pages route through Cloudflare Worker (avoids stale-CDN-chunk MIME errors).
- Reusable UI lives in `src/lib/components/ui/`; CCC-specific in `src/lib/components/ccc/`.
```

- [ ] **Step 4: Add `.gitignore` entry for CLAUDE.md** (local context, not checked in — mirroring DR)

Already in the gitignore from Task A1 (`CLAUDE.md` was not added there). Add it now:

```bash
echo "" >> .gitignore
echo "# Claude Code context (local only)" >> .gitignore
echo "CLAUDE.md" >> .gitignore
```

- [ ] **Step 5: Verify lint passes**

```bash
npm run lint
```

Expected: `0 problems`.

- [ ] **Step 6: Commit**

```bash
git add .npmrc README.md .gitignore .eslintrc.cjs .prettierrc
git commit -m "feat: add npmrc, README, gitignore CLAUDE.md, lint/format config"
```

---

### Task A5: Cloudflare Pages configuration + first deploy

**Files:**
- Create: `wrangler.toml`
- Create: `static/_redirects` (empty for now)
- Create: `static/_headers`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create `wrangler.toml`**

```toml
name = "lecatechisme"
compatibility_date = "2026-05-01"
pages_build_output_dir = ".svelte-kit/cloudflare"

[[kv_namespaces]]
binding = "SEARCH_INDEX"
id = "REPLACE_WITH_KV_ID_AFTER_CREATING"
preview_id = "REPLACE_WITH_KV_PREVIEW_ID"
```

Note: KV namespace IDs are filled in by the user via `wrangler kv:namespace create SEARCH_INDEX`. For Phase 1 we don't use KV yet — just declare the binding. Defer namespace creation to Phase 3 (search).

- [ ] **Step 2: Create `static/_redirects` (empty placeholder)**

```
# Cloudflare Pages redirects — populated by routes that need redirects
```

- [ ] **Step 3: Create `static/_headers`**

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=()

/static/data/*
  Cache-Control: public, max-age=3600

/img/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 4: Verify production build**

```bash
npm run build
```

Expected: build succeeds, output in `.svelte-kit/cloudflare/`.

- [ ] **Step 5: Commit**

```bash
git add wrangler.toml static/_redirects static/_headers
git commit -m "feat: add Cloudflare Pages configuration"
```

- [ ] **Step 6: Manual step — push to GitHub and connect Cloudflare Pages**

```bash
# After creating an empty repo at github.com/<user>/lecatechisme:
git remote add origin git@github.com:<user>/lecatechisme.git
git push -u origin main
```

Then in Cloudflare Pages dashboard:
- Connect the repo
- Build command: `npm run build`
- Build output directory: `.svelte-kit/cloudflare`
- Node version: `20` (env var `NODE_VERSION=20`)

Expected: first deploy lands on a `*.pages.dev` URL showing the SvelteKit skeleton page.

---

## Section B — Data Pipeline Foundations

### Task B1: Install pipeline deps and set up data sources

**Files:**
- Modify: `package.json`
- Create: `scripts/data-sources/` symlinks

- [ ] **Step 1: Install build-time deps**

```bash
npm install -D tsx parse5 sharp xml2js
npm install -D @types/xml2js
```

- [ ] **Step 2: Create symlinks to source files**

```bash
mkdir -p scripts/data-sources/thematic_cross-refs
mkdir -p scripts/data-sources/ncl
mkdir -p scripts/data-sources/logos

cd scripts/data-sources
ln -s ../../../DOCTRINA/JSON/CCC/ccc_paras_processed.json ccc_paras_processed.json
ln -s ../../../DOCTRINA/JSON/CCC/ccc_bible_index_clean.json ccc_bible_index_clean.json
ln -s ../../../DOCTRINA/JSON/CCC/ccc_cross_refs_bidirectional.json ccc_cross_refs_bidirectional.json
ln -s ../../../DOCTRINA/sources/CCC/CCC_1998_FULL/sigles.xhtml sigles.xhtml
ln -s ../../../DOCTRINA/sources/CCC/CCC_1998_FULL/toc.ncx toc.ncx
ln -s ../../../DOCTRINA/sources/CCC/thematic_cross-refs thematic_cross-refs
ln -s ../../../SCRIPTURA/sources/NCL/francl_usfx/francl_usfx.xml ncl/francl_usfx.xml
ln -s ../../../Website/CCC/catechisme-logo.png logos/catechisme-logo.png
ln -s ../../../Website/CCC/catechisme-logo-white.png logos/catechisme-logo-white.png
cd ../..
```

- [ ] **Step 3: Verify symlinks resolve**

```bash
ls -L scripts/data-sources/
ls -L scripts/data-sources/thematic_cross-refs/index_thematique/ | head
```

Expected: lists actual files, not broken links.

- [ ] **Step 4: Add scripts/data-sources to gitignore (don't commit symlinks)**

Append to `.gitignore`:

```
# Data source symlinks (re-create per-developer)
scripts/data-sources/
```

Add a `scripts/data-sources/README.md` explaining how to re-create the symlinks (so a fresh checkout knows what to do):

```markdown
# Data sources

This directory holds symlinks to source JSON/XHTML/USFX files used by `prepare-data.ts`. The symlinks themselves are gitignored — re-create them via:

\`\`\`bash
# from repo root
bash scripts/setup-data-sources.sh
\`\`\`

(or read the bash commands in the implementation plan)
```

- [ ] **Step 5: Create `scripts/setup-data-sources.sh`** for reproducibility

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/data-sources"
mkdir -p thematic_cross-refs ncl logos
ln -sf ../../../DOCTRINA/JSON/CCC/ccc_paras_processed.json ccc_paras_processed.json
ln -sf ../../../DOCTRINA/JSON/CCC/ccc_bible_index_clean.json ccc_bible_index_clean.json
ln -sf ../../../DOCTRINA/JSON/CCC/ccc_cross_refs_bidirectional.json ccc_cross_refs_bidirectional.json
ln -sf ../../../DOCTRINA/sources/CCC/CCC_1998_FULL/sigles.xhtml sigles.xhtml
ln -sf ../../../DOCTRINA/sources/CCC/CCC_1998_FULL/toc.ncx toc.ncx
ln -sf ../../../DOCTRINA/sources/CCC/thematic_cross-refs thematic_cross-refs
ln -sf ../../../SCRIPTURA/sources/NCL/francl_usfx/francl_usfx.xml ncl/francl_usfx.xml
ln -sf ../../../Website/CCC/catechisme-logo.png logos/catechisme-logo.png
ln -sf ../../../Website/CCC/catechisme-logo-white.png logos/catechisme-logo-white.png
echo "Symlinks ready."
```

```bash
chmod +x scripts/setup-data-sources.sh
```

- [ ] **Step 6: Commit**

```bash
git add scripts/setup-data-sources.sh scripts/data-sources/README.md .gitignore package.json package-lock.json
git commit -m "feat: install data-prep deps and set up source symlinks"
```

---

### Task B2: Define data types

**Files:**
- Create: `src/lib/data/types.ts`
- Test: `tests/unit/types.test.ts`

- [ ] **Step 1: Write failing test for type compile-check**

`tests/unit/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type {
	Paragraph,
	Chapter,
	StructureNode,
	BibleRef,
	CrossRef,
	Citation,
	MagisterialRefRecord,
	EnBrefBlock,
	ThematicEntry,
	SourceEntry,
	AbbreviationMap
} from '$lib/data/types';

describe('data types', () => {
	it('Paragraph type compiles', () => {
		const p: Paragraph = {
			corpus: 'ccc',
			number: 27,
			text_html: '<span>...</span>',
			cross_refs: ['355', '1701'],
			bible_refs: [],
			citations: [],
			magisterial_refs: []
		};
		expect(p.corpus).toBe('ccc');
	});
});
```

- [ ] **Step 2: Run test to verify it fails (compile error: types not defined)**

```bash
npm run test -- types.test.ts
```

Expected: FAIL — `Cannot find module '$lib/data/types'`.

- [ ] **Step 3: Write `src/lib/data/types.ts`**

```ts
export type Corpus = 'ccc';

export interface BibleRef {
	text: string;
	book?: string;
	chapter?: number;
	verseStart?: number;
	verseEnd?: number;
}

export interface CrossRef {
	target: number;
	idx?: string;
}

export interface Citation {
	text_html: string;
	source?: MagisterialRefRecord;
}

export interface MagisterialRefRecord {
	type: 'magisterial' | 'patristic' | 'liturgical';
	abbr?: string;
	raw: string;
	idx?: string;
	doc_raw?: string;
}

export interface Paragraph {
	corpus: Corpus;
	number: number;
	text_html: string;
	cross_refs: string[];
	bible_refs: BibleRef[];
	citations: Citation[];
	magisterial_refs: MagisterialRefRecord[];
	parent_chapter_slug?: string;
}

export interface EnBrefBlock {
	chapter_slug: string;
	paragraphs: number[];
}

export interface Chapter {
	corpus: Corpus;
	slug: string;
	title: string;
	part_slug: string;
	section_slug: string;
	paragraphs: number[];
	headings: ChapterHeading[];
	en_bref?: EnBrefBlock;
	prev?: { slug: string; title: string };
	next?: { slug: string; title: string };
}

export interface ChapterHeading {
	id: string;
	level: number;
	title: string;
	paragraph_start: number;
}

export type StructureNodeType = 'part' | 'section' | 'chapter' | 'article' | 'heading' | 'sub_heading';

export interface StructureNode {
	type: StructureNodeType | 'paragraph';
	title?: string;
	slug?: string;
	number?: number;
	children?: StructureNode[];
}

export interface ThematicEntry {
	letter: string;
	term: string;
	subentries: ThematicSubEntry[];
}

export interface ThematicSubEntry {
	label: string;
	paragraphs: number[];
}

export interface SourceEntry {
	category: string;
	doc_name: string;
	doc_abbr?: string;
	citations: SourceCitation[];
}

export interface SourceCitation {
	location: string;
	paragraphs: number[];
}

export type AbbreviationMap = Record<string, string>;
```

- [ ] **Step 4: Run test to verify pass**

```bash
npm run test -- types.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/types.ts tests/unit/types.test.ts
git commit -m "feat: define data record types for CCC corpus"
```

---

### Task B3: Slug utility

**Files:**
- Create: `src/lib/utils/slug.ts`
- Create: `scripts/prepare/slug.ts`
- Test: `tests/unit/slug.test.ts`

(Two files because the build script can't import from `$lib`. Both implementations must stay in sync — the test below covers the runtime version; build uses the same logic.)

- [ ] **Step 1: Write failing tests**

`tests/unit/slug.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slugify } from '$lib/utils/slug';

describe('slugify', () => {
	it('lowercases and hyphenates', () => {
		expect(slugify('Le Désir de Dieu')).toBe('le-desir-de-dieu');
	});

	it('strips French accents', () => {
		expect(slugify('Élévation')).toBe('elevation');
		expect(slugify('À propos')).toBe('a-propos');
		expect(slugify('Cœur')).toBe('coeur');
	});

	it('strips guillemets and quotes', () => {
		expect(slugify('« Capable » de Dieu')).toBe('capable-de-dieu');
		expect(slugify("L'homme")).toBe('lhomme');
	});

	it('collapses multiple separators', () => {
		expect(slugify('A   B   C')).toBe('a-b-c');
		expect(slugify(' -- A -- B -- ')).toBe('a-b');
	});

	it('handles roman numerals', () => {
		expect(slugify('I. Le désir de Dieu')).toBe('i-le-desir-de-dieu');
	});

	it('handles a real CCC chapter title', () => {
		expect(slugify("L'homme est « capable » de Dieu")).toBe('lhomme-est-capable-de-dieu');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- slug.test.ts
```

Expected: FAIL — `Cannot find module '$lib/utils/slug'`.

- [ ] **Step 3: Write `src/lib/utils/slug.ts`**

```ts
const LIGATURE_MAP: Record<string, string> = {
	'œ': 'oe',
	'Œ': 'oe',
	'æ': 'ae',
	'Æ': 'ae'
};

export function slugify(input: string): string {
	let s = input;
	for (const [from, to] of Object.entries(LIGATURE_MAP)) {
		s = s.split(from).join(to);
	}
	s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
	s = s.toLowerCase();
	s = s.replace(/[^a-z0-9]+/g, '-');
	s = s.replace(/^-+|-+$/g, '');
	return s;
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
npm run test -- slug.test.ts
```

Expected: PASS, all assertions.

- [ ] **Step 5: Mirror in `scripts/prepare/slug.ts` (build-time copy, identical implementation)**

```ts
const LIGATURE_MAP: Record<string, string> = {
	'œ': 'oe',
	'Œ': 'oe',
	'æ': 'ae',
	'Æ': 'ae'
};

export function slugify(input: string): string {
	let s = input;
	for (const [from, to] of Object.entries(LIGATURE_MAP)) {
		s = s.split(from).join(to);
	}
	s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
	s = s.toLowerCase();
	s = s.replace(/[^a-z0-9]+/g, '-');
	s = s.replace(/^-+|-+$/g, '');
	return s;
}

// Collision-aware: throws if a slug collides within its parent.
export function uniqueSlug(title: string, taken: Set<string>): string {
	const slug = slugify(title);
	if (taken.has(slug)) {
		throw new Error(`Slug collision: "${slug}" (from title "${title}")`);
	}
	taken.add(slug);
	return slug;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/slug.ts scripts/prepare/slug.ts tests/unit/slug.test.ts
git commit -m "feat: slug utility with French accent and ligature handling"
```

---

### Task B4: Build pipeline scaffolding

**Files:**
- Create: `scripts/prepare-data.ts`
- Create: `scripts/prepare/validators.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create `scripts/prepare/validators.ts`**

```ts
export function assert(cond: unknown, msg: string): asserts cond {
	if (!cond) throw new Error(`prepare-data: ${msg}`);
}

export function logStep(name: string): void {
	process.stdout.write(`  ${name}…`);
}

export function endStep(detail = ''): void {
	process.stdout.write(` ✓ ${detail}\n`);
}

export function logHeader(title: string): void {
	process.stdout.write(`\n→ ${title}\n`);
}
```

- [ ] **Step 2: Create `scripts/prepare-data.ts` with skeleton**

```ts
#!/usr/bin/env tsx
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logHeader, logStep, endStep, assert } from './prepare/validators.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SOURCES = join(ROOT, 'scripts/data-sources');
const OUT = join(ROOT, 'static/data');

async function main() {
	const start = performance.now();
	logHeader('prepare-data');

	// Wipe + recreate output dir
	if (existsSync(OUT)) rmSync(OUT, { recursive: true });
	mkdirSync(join(OUT, 'ccc'), { recursive: true });
	mkdirSync(join(OUT, 'ccc/paragraphs'), { recursive: true });
	mkdirSync(join(OUT, 'ccc/chapters'), { recursive: true });
	mkdirSync(join(OUT, 'ccc/en-bref'), { recursive: true });
	mkdirSync(join(OUT, 'ccc/guide-de-lecture'), { recursive: true });
	mkdirSync(join(OUT, 'bible'), { recursive: true });

	// Validate sources exist
	logStep('checking sources');
	const expected = [
		'ccc_paras_processed.json',
		'ccc_bible_index_clean.json',
		'ccc_cross_refs_bidirectional.json',
		'sigles.xhtml',
		'toc.ncx',
		'thematic_cross-refs',
		'ncl/francl_usfx.xml'
	];
	for (const f of expected) {
		assert(existsSync(join(SOURCES, f)), `missing source: ${f}`);
	}
	endStep(`${expected.length} sources OK`);

	// Subsequent tasks plug in their step here.

	const elapsed = ((performance.now() - start) / 1000).toFixed(2);
	process.stdout.write(`\nprepare-data complete in ${elapsed}s\n`);
}

main().catch((err) => {
	console.error(`\nprepare-data FAILED: ${err.message}`);
	process.exit(1);
});

export { ROOT, SOURCES, OUT };
```

- [ ] **Step 3: Add npm scripts**

In `package.json` `scripts`:

```json
"prepare-data": "tsx scripts/prepare-data.ts",
"prebuild": "tsx scripts/prepare-data.ts"
```

- [ ] **Step 4: Run prepare-data to verify it executes**

```bash
npm run prepare-data
```

Expected output:

```
→ prepare-data
  checking sources… ✓ 7 sources OK

prepare-data complete in 0.NNs
```

- [ ] **Step 5: Verify `static/data/` was created with subdirs**

```bash
ls static/data/ static/data/ccc/
```

Expected: `bible/`, `ccc/`. CCC contains: `chapters`, `en-bref`, `guide-de-lecture`, `paragraphs`.

- [ ] **Step 6: Commit**

```bash
git add scripts/prepare-data.ts scripts/prepare/validators.ts package.json package-lock.json
git commit -m "feat: prepare-data scaffolding with source validation"
```

---

### Task B5: Generate `structure.json` from CCC source

**Files:**
- Create: `scripts/prepare/structure.ts`
- Modify: `scripts/prepare-data.ts`
- Test: `tests/unit/prepare/structure.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/prepare/structure.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildStructure } from '../../../scripts/prepare/structure';

describe('buildStructure', () => {
	const fixture = [
		{
			type: 'part',
			title: 'PROLOGUE',
			children: [
				{
					type: 'paragraph',
					number: 1,
					text_html: '<span>Dieu, infiniment Parfait...</span>',
					cross_refs: [],
					bible_refs: [],
					citations: []
				}
			]
		},
		{
			type: 'part',
			title: 'PREMIÈRE PARTIE : LA PROFESSION DE LA FOI',
			children: [
				{
					type: 'section',
					title: 'PREMIÈRE SECTION : « JE CROIS » – « NOUS CROYONS »',
					children: [
						{
							type: 'chapter',
							title: 'CHAPITRE PREMIER : L\'HOMME EST « CAPABLE » DE DIEU',
							children: [
								{
									type: 'heading',
									title: 'I. Le désir de Dieu',
									children: [
										{ type: 'paragraph', number: 27, text_html: '', cross_refs: [], bible_refs: [], citations: [] }
									]
								}
							]
						}
					]
				}
			]
		}
	];

	it('produces parts with slugs', () => {
		const result = buildStructure(fixture as any);
		expect(result.parts).toHaveLength(2);
		expect(result.parts[0].slug).toBe('prologue');
		expect(result.parts[1].slug).toMatch(/profession/);
	});

	it('builds chapter slugs that strip "CHAPITRE PREMIER" prefix', () => {
		const result = buildStructure(fixture as any);
		const part = result.parts[1];
		const chapter = part.sections[0].chapters[0];
		expect(chapter.slug).toBe('lhomme-est-capable-de-dieu');
	});

	it('records paragraph numbers per chapter', () => {
		const result = buildStructure(fixture as any);
		const chapter = result.parts[1].sections[0].chapters[0];
		expect(chapter.paragraphs).toContain(27);
	});

	it('throws on slug collision within parent', () => {
		const colliding = [
			{ type: 'part', title: 'A', children: [] },
			{ type: 'part', title: 'A', children: [] }
		];
		expect(() => buildStructure(colliding as any)).toThrow(/Slug collision/);
	});
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
npm run test -- structure.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `scripts/prepare/structure.ts`**

```ts
import { slugify, uniqueSlug } from './slug.ts';

interface RawNode {
	type: string;
	title?: string;
	number?: number;
	text_html?: string;
	children?: RawNode[];
}

export interface BuiltStructure {
	corpus: 'ccc';
	parts: BuiltPart[];
}

export interface BuiltPart {
	slug: string;
	title: string;
	sections: BuiltSection[];
	prologue?: boolean;
}

export interface BuiltSection {
	slug: string;
	title: string;
	chapters: BuiltChapter[];
}

export interface BuiltChapter {
	slug: string;
	title: string;
	articles: BuiltArticle[];
	paragraphs: number[];
	headings: BuiltHeading[];
}

export interface BuiltArticle {
	slug: string;
	title: string;
	headings: BuiltHeading[];
	paragraphs: number[];
}

export interface BuiltHeading {
	id: string;
	level: number;
	title: string;
	paragraph_start: number;
}

const CHAPITRE_PREFIX = /^CHAPITRE\s+(PREMIER|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME|HUITIÈME|NEUVIÈME|DIXIÈME)?\s*[:.\s-]*/iu;
const PART_PREFIX = /^(PREMIÈRE|DEUXIÈME|TROISIÈME|QUATRIÈME)\s+PARTIE\s*[:.\s-]*/iu;
const SECTION_PREFIX = /^(PREMIÈRE|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME)\s+SECTION\s*[:.\s-]*/iu;
const ARTICLE_PREFIX = /^Article\s+\d+\s*[:.\s-]*/iu;

function stripPrefix(title: string, regex: RegExp): string {
	return title.replace(regex, '').trim();
}

function collectParagraphs(node: RawNode, into: number[]): void {
	if (node.type === 'paragraph' && typeof node.number === 'number') into.push(node.number);
	for (const c of node.children ?? []) collectParagraphs(c, into);
}

function collectHeadings(nodes: RawNode[]): BuiltHeading[] {
	const out: BuiltHeading[] = [];
	for (const n of nodes) {
		if (n.type === 'heading' || n.type === 'sub_heading') {
			const level = n.type === 'heading' ? 2 : 3;
			const title = (n.title ?? '').trim();
			const id = slugify(title) || `h-${out.length}`;
			let firstParagraph = -1;
			for (const c of n.children ?? []) {
				if (c.type === 'paragraph' && typeof c.number === 'number') {
					firstParagraph = c.number;
					break;
				}
			}
			if (firstParagraph >= 0) out.push({ id, level, title, paragraph_start: firstParagraph });
		}
	}
	return out;
}

export function buildStructure(parts: RawNode[]): BuiltStructure {
	const partSlugs = new Set<string>();
	const builtParts: BuiltPart[] = [];

	for (const partRaw of parts) {
		const isPrologue = (partRaw.title ?? '').trim().toUpperCase() === 'PROLOGUE';
		const partTitle = isPrologue ? 'Prologue' : stripPrefix(partRaw.title ?? '', PART_PREFIX);
		const partSlug = isPrologue ? 'prologue' : uniqueSlug(partTitle, partSlugs);

		const sectionSlugs = new Set<string>();
		const builtSections: BuiltSection[] = [];

		for (const childRaw of partRaw.children ?? []) {
			if (childRaw.type !== 'section') continue;
			const sectionTitle = stripPrefix(childRaw.title ?? '', SECTION_PREFIX);
			const sectionSlug = uniqueSlug(sectionTitle, sectionSlugs);

			const chapterSlugs = new Set<string>();
			const builtChapters: BuiltChapter[] = [];
			for (const chapRaw of childRaw.children ?? []) {
				if (chapRaw.type !== 'chapter') continue;
				const chapTitle = stripPrefix(chapRaw.title ?? '', CHAPITRE_PREFIX);
				const chapSlug = uniqueSlug(chapTitle, chapterSlugs);

				const chapParagraphs: number[] = [];
				collectParagraphs(chapRaw, chapParagraphs);

				const articleSlugs = new Set<string>();
				const articles: BuiltArticle[] = [];
				for (const aRaw of chapRaw.children ?? []) {
					if (aRaw.type !== 'article') continue;
					const aTitle = stripPrefix(aRaw.title ?? '', ARTICLE_PREFIX);
					const aSlug = uniqueSlug(aTitle, articleSlugs);
					const aParas: number[] = [];
					collectParagraphs(aRaw, aParas);
					articles.push({
						slug: aSlug,
						title: aTitle,
						headings: collectHeadings(aRaw.children ?? []),
						paragraphs: aParas
					});
				}

				builtChapters.push({
					slug: chapSlug,
					title: chapTitle,
					articles,
					paragraphs: chapParagraphs,
					headings: collectHeadings(chapRaw.children ?? [])
				});
			}

			builtSections.push({ slug: sectionSlug, title: sectionTitle, chapters: builtChapters });
		}

		builtParts.push({ slug: partSlug, title: partTitle, sections: builtSections, prologue: isPrologue });
	}

	return { corpus: 'ccc', parts: builtParts };
}
```

- [ ] **Step 4: Wire it into `prepare-data.ts`**

After the source-check block:

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { buildStructure } from './prepare/structure.ts';

// ... inside main(), after source check:

logStep('building structure');
const rawParts = JSON.parse(readFileSync(join(SOURCES, 'ccc_paras_processed.json'), 'utf8'));
const structure = buildStructure(rawParts);
writeFileSync(join(OUT, 'ccc/structure.json'), JSON.stringify(structure, null, 2));
endStep(`${structure.parts.length} parts`);
```

- [ ] **Step 5: Run prepare-data to verify**

```bash
npm run prepare-data
```

Expected:

```
→ prepare-data
  checking sources… ✓ 7 sources OK
  building structure… ✓ 5 parts

prepare-data complete in N.NNs
```

- [ ] **Step 6: Inspect output**

```bash
node -e "const s=require('./static/data/ccc/structure.json'); console.log(s.parts.map(p => ({slug: p.slug, sections: p.sections.length})))"
```

Expected: prints all 5 parts with section counts (Prologue: 0, others 2/7/10/2 sections respectively).

- [ ] **Step 7: Run unit test**

```bash
npm run test -- structure.test.ts
```

Expected: PASS, 4 assertions.

- [ ] **Step 8: Commit**

```bash
git add scripts/prepare-data.ts scripts/prepare/structure.ts tests/unit/prepare/structure.test.ts
git commit -m "feat: generate ccc/structure.json with hierarchical slugs"
```

---

### Task B6: Validate structure against `toc.ncx`

**Files:**
- Create: `scripts/prepare/toc-validator.ts`
- Modify: `scripts/prepare-data.ts`
- Test: `tests/unit/prepare/toc-validator.test.ts`

**Tooling:** use `context7` for `xml2js` if uncertain about `parseStringPromise` return shape (deeply-nested array structure trips up many engineers).

- [ ] **Step 1: Write failing test**

`tests/unit/prepare/toc-validator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractTocStructure } from '../../../scripts/prepare/toc-validator';

describe('extractTocStructure', () => {
	it('extracts navPoint labels from a minimal toc.ncx', () => {
		const xml = `<?xml version='1.0' encoding='UTF-8'?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/">
	<navMap>
		<navPoint><navLabel><text>PROLOGUE</text></navLabel><content src="x.xhtml"/></navPoint>
		<navPoint><navLabel><text>PREMIÈRE PARTIE</text></navLabel><content src="y.xhtml"/></navPoint>
	</navMap>
</ncx>`;
		const points = extractTocStructure(xml);
		expect(points).toContainEqual(expect.objectContaining({ label: 'PROLOGUE' }));
		expect(points).toContainEqual(expect.objectContaining({ label: 'PREMIÈRE PARTIE' }));
	});
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test -- toc-validator.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write `scripts/prepare/toc-validator.ts`**

```ts
import { parseStringPromise } from 'xml2js';
import type { BuiltStructure } from './structure.ts';

export interface TocPoint {
	label: string;
	src: string;
}

export async function extractTocStructure(xml: string): Promise<TocPoint[]> {
	const parsed = await parseStringPromise(xml);
	const points: TocPoint[] = [];
	function walk(navPoints: any): void {
		for (const np of navPoints ?? []) {
			const label = np.navLabel?.[0]?.text?.[0] ?? '';
			const src = np.content?.[0]?.$?.src ?? '';
			points.push({ label: String(label).trim(), src });
			if (np.navPoint) walk(np.navPoint);
		}
	}
	walk(parsed.ncx.navMap?.[0]?.navPoint);
	return points;
}

// Loose validator: confirm the major part labels in our structure are present in the TOC.
export function validateAgainstToc(structure: BuiltStructure, points: TocPoint[]): void {
	const tocLabels = new Set(points.map((p) => p.label.toUpperCase()));

	const requiredLabels = ['PROLOGUE', 'PREMIÈRE PARTIE', 'DEUXIÈME PARTIE', 'TROISIÈME PARTIE', 'QUATRIÈME PARTIE'];
	const missing = requiredLabels.filter((label) => !Array.from(tocLabels).some((l) => l.startsWith(label)));
	if (missing.length > 0) {
		throw new Error(`toc-validator: missing labels in toc.ncx: ${missing.join(', ')}`);
	}
}
```

(Note: `xml2js` was installed in B1.)

- [ ] **Step 4: Wire into prepare-data.ts**

```ts
import { extractTocStructure, validateAgainstToc } from './prepare/toc-validator.ts';

// ... after building structure:
logStep('validating against toc.ncx');
const tocXml = readFileSync(join(SOURCES, 'toc.ncx'), 'utf8');
const tocPoints = await extractTocStructure(tocXml);
validateAgainstToc(structure, tocPoints);
endStep(`${tocPoints.length} navPoints`);
```

- [ ] **Step 5: Run prepare-data**

```bash
npm run prepare-data
```

Expected: structure step + validation step both succeed.

- [ ] **Step 6: Run unit test**

```bash
npm run test -- toc-validator.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/prepare/toc-validator.ts scripts/prepare-data.ts tests/unit/prepare/toc-validator.test.ts
git commit -m "feat: validate generated structure against toc.ncx"
```

---

### Task B7: Generate per-paragraph JSON files

**Files:**
- Create: `scripts/prepare/paragraphs.ts`
- Modify: `scripts/prepare-data.ts`
- Test: `tests/unit/prepare/paragraphs.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/prepare/paragraphs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractParagraphs } from '../../../scripts/prepare/paragraphs';

describe('extractParagraphs', () => {
	it('flattens all paragraphs with metadata', () => {
		const fixture = [
			{
				type: 'part',
				title: 'A',
				children: [
					{
						type: 'paragraph',
						number: 1,
						text_html: '<span>x</span>',
						cross_refs: ['2'],
						bible_refs: [{ text: 'Mt 1:1' }],
						citations: []
					},
					{
						type: 'chapter',
						title: 'B',
						children: [
							{
								type: 'paragraph',
								number: 2,
								text_html: '<span>y</span>',
								cross_refs: [],
								bible_refs: [],
								citations: [],
								refs: [{ type: 'magisterial', raw: 'GS 19', idx: 'a' }]
							}
						]
					}
				]
			}
		];
		const result = extractParagraphs(fixture as any);
		expect(result.size).toBe(2);
		expect(result.get(1)?.cross_refs).toEqual(['2']);
		expect(result.get(2)?.magisterial_refs[0]?.raw).toBe('GS 19');
	});
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npm run test -- paragraphs.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write `scripts/prepare/paragraphs.ts`**

```ts
import type { Paragraph } from '../../src/lib/data/types.ts';

interface RawNode {
	type: string;
	number?: number;
	text_html?: string;
	cross_refs?: string[];
	bible_refs?: { text: string }[];
	citations?: { text_html: string }[];
	refs?: { type: string; raw: string; idx?: string; doc_raw?: string }[];
	children?: RawNode[];
}

export function extractParagraphs(parts: RawNode[]): Map<number, Paragraph> {
	const out = new Map<number, Paragraph>();
	function walk(node: RawNode) {
		if (node.type === 'paragraph' && typeof node.number === 'number') {
			out.set(node.number, {
				corpus: 'ccc',
				number: node.number,
				text_html: node.text_html ?? '',
				cross_refs: node.cross_refs ?? [],
				bible_refs: (node.bible_refs ?? []).map((b) => ({ text: b.text })),
				citations: (node.citations ?? []).map((c) => ({ text_html: c.text_html })),
				magisterial_refs: (node.refs ?? []).map((r) => ({
					type: r.type as Paragraph['magisterial_refs'][number]['type'],
					raw: r.raw,
					idx: r.idx,
					doc_raw: r.doc_raw
				}))
			});
		}
		for (const c of node.children ?? []) walk(c);
	}
	for (const p of parts) walk(p);
	return out;
}
```

- [ ] **Step 4: Wire into prepare-data.ts**

```ts
import { extractParagraphs } from './prepare/paragraphs.ts';

// ... after structure validation:
logStep('extracting paragraphs');
const paragraphs = extractParagraphs(rawParts);
for (const [n, p] of paragraphs) {
	writeFileSync(join(OUT, `ccc/paragraphs/${n}.json`), JSON.stringify(p));
}
endStep(`${paragraphs.size} paragraphs`);
```

- [ ] **Step 5: Run prepare-data**

```bash
npm run prepare-data
```

Expected:

```
  extracting paragraphs… ✓ 2865 paragraphs
```

- [ ] **Step 6: Verify file count**

```bash
ls static/data/ccc/paragraphs/ | wc -l
```

Expected: `2865`.

- [ ] **Step 7: Spot-check one paragraph**

```bash
cat static/data/ccc/paragraphs/27.json | python3 -m json.tool | head -20
```

Expected: shows `corpus: "ccc"`, `number: 27`, `cross_refs`, etc.

- [ ] **Step 8: Commit**

```bash
git add scripts/prepare/paragraphs.ts scripts/prepare-data.ts tests/unit/prepare/paragraphs.test.ts
git commit -m "feat: generate per-paragraph JSON files (2865 paragraphs)"
```

---

### Task B8: Generate per-chapter JSON files with prev/next + headings

**Files:**
- Create: `scripts/prepare/chapters.ts`
- Modify: `scripts/prepare-data.ts`
- Test: `tests/unit/prepare/chapters.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/prepare/chapters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildChapterFiles } from '../../../scripts/prepare/chapters';
import { buildStructure } from '../../../scripts/prepare/structure';

describe('buildChapterFiles', () => {
	const minimal = [
		{
			type: 'part',
			title: 'PREMIÈRE PARTIE: TEST',
			children: [
				{
					type: 'section',
					title: 'PREMIÈRE SECTION: ALPHA',
					children: [
						{
							type: 'chapter',
							title: 'Chapitre A',
							children: [
								{ type: 'heading', title: 'I. Un', children: [{ type: 'paragraph', number: 1, text_html: '', cross_refs: [], bible_refs: [], citations: [] }] },
								{ type: 'heading', title: 'II. Deux', children: [{ type: 'paragraph', number: 2, text_html: '', cross_refs: [], bible_refs: [], citations: [] }] }
							]
						},
						{
							type: 'chapter',
							title: 'Chapitre B',
							children: [
								{ type: 'paragraph', number: 3, text_html: '', cross_refs: [], bible_refs: [], citations: [] }
							]
						}
					]
				}
			]
		}
	];

	it('generates one file per chapter with prev/next links', () => {
		const structure = buildStructure(minimal as any);
		const chapters = buildChapterFiles(structure, minimal as any);
		const names = chapters.map((c) => c.slug);
		expect(names).toEqual(['chapitre-a', 'chapitre-b']);
		expect(chapters[0].next?.slug).toBe('chapitre-b');
		expect(chapters[0].prev).toBeUndefined();
		expect(chapters[1].prev?.slug).toBe('chapitre-a');
	});

	it('records headings with paragraph_start', () => {
		const structure = buildStructure(minimal as any);
		const chapters = buildChapterFiles(structure, minimal as any);
		expect(chapters[0].headings).toHaveLength(2);
		expect(chapters[0].headings[0].paragraph_start).toBe(1);
	});
});
```

- [ ] **Step 2: Run, verify fail**

```bash
npm run test -- chapters.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write `scripts/prepare/chapters.ts`**

```ts
import type { Chapter, ChapterHeading } from '../../src/lib/data/types.ts';
import type { BuiltStructure } from './structure.ts';

interface RawNode {
	type: string;
	title?: string;
	number?: number;
	children?: RawNode[];
}

export function buildChapterFiles(structure: BuiltStructure, rawParts: RawNode[]): Chapter[] {
	const chapters: Chapter[] = [];
	for (const part of structure.parts) {
		for (const section of part.sections) {
			for (let i = 0; i < section.chapters.length; i++) {
				const c = section.chapters[i];
				const prev = i > 0 ? section.chapters[i - 1] : undefined;
				const next = i < section.chapters.length - 1 ? section.chapters[i + 1] : undefined;
				const chapter: Chapter = {
					corpus: 'ccc',
					slug: c.slug,
					title: c.title,
					part_slug: part.slug,
					section_slug: section.slug,
					paragraphs: c.paragraphs,
					headings: c.headings.map<ChapterHeading>((h) => ({
						id: h.id,
						level: h.level,
						title: h.title,
						paragraph_start: h.paragraph_start
					})),
					prev: prev ? { slug: prev.slug, title: prev.title } : undefined,
					next: next ? { slug: next.slug, title: next.title } : undefined
				};
				chapters.push(chapter);
			}
		}
	}
	return chapters;
}
```

- [ ] **Step 4: Wire into prepare-data.ts**

```ts
import { buildChapterFiles } from './prepare/chapters.ts';

// ... after paragraphs:
logStep('building chapters');
const chapters = buildChapterFiles(structure, rawParts);
for (const ch of chapters) {
	writeFileSync(join(OUT, `ccc/chapters/${ch.slug}.json`), JSON.stringify(ch));
}
endStep(`${chapters.length} chapters`);
```

- [ ] **Step 5: Run prepare-data**

```bash
npm run prepare-data
```

Expected: builds chapters, prints count (~140).

- [ ] **Step 6: Run unit test**

```bash
npm run test -- chapters.test.ts
```

Expected: PASS, 2 assertions.

- [ ] **Step 7: Commit**

```bash
git add scripts/prepare/chapters.ts scripts/prepare-data.ts tests/unit/prepare/chapters.test.ts
git commit -m "feat: generate per-chapter JSON with headings and prev/next"
```

---

### Task B9: Extract En Bref blocks

**Files:**
- Create: `scripts/prepare/enbref.ts`
- Modify: `scripts/prepare-data.ts`
- Test: `tests/unit/prepare/enbref.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/prepare/enbref.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractEnBref } from '../../../scripts/prepare/enbref';

describe('extractEnBref', () => {
	it('finds en_bref blocks under chapters and articles', () => {
		const fixture = [
			{
				type: 'part',
				title: 'X',
				children: [
					{
						type: 'section',
						title: 'Y',
						children: [
							{
								type: 'chapter',
								title: 'Z',
								children: [
									{ type: 'paragraph', number: 1 },
									{
										type: 'en_bref',
										title: 'EN BREF',
										children: [
											{ type: 'paragraph', number: 44 },
											{ type: 'paragraph', number: 45 }
										]
									}
								]
							}
						]
					}
				]
			}
		];
		const result = extractEnBref(fixture as any);
		expect(result).toHaveLength(1);
		expect(result[0].chapter_slug).toBe('z');
		expect(result[0].paragraphs).toEqual([44, 45]);
	});
});
```

- [ ] **Step 2: Run, fail**

```bash
npm run test -- enbref.test.ts
```

- [ ] **Step 3: Write `scripts/prepare/enbref.ts`**

```ts
import { slugify } from './slug.ts';
import type { EnBrefBlock } from '../../src/lib/data/types.ts';

interface RawNode {
	type: string;
	title?: string;
	number?: number;
	children?: RawNode[];
}

export function extractEnBref(parts: RawNode[]): EnBrefBlock[] {
	const out: EnBrefBlock[] = [];

	function findEnBrefIn(node: RawNode, ownerSlug: string) {
		for (const c of node.children ?? []) {
			if (c.type === 'en_bref') {
				const paragraphs: number[] = [];
				function collect(n: RawNode) {
					if (n.type === 'paragraph' && typeof n.number === 'number') paragraphs.push(n.number);
					for (const x of n.children ?? []) collect(x);
				}
				collect(c);
				out.push({ chapter_slug: ownerSlug, paragraphs });
			}
		}
	}

	function walk(node: RawNode) {
		if (node.type === 'chapter' && node.title) {
			findEnBrefIn(node, slugify(node.title.replace(/^CHAPITRE\s+\S+\s*[:.\s-]*/iu, '')));
		}
		for (const c of node.children ?? []) walk(c);
	}

	for (const p of parts) walk(p);
	return out;
}
```

- [ ] **Step 4: Wire into prepare-data.ts**

```ts
import { extractEnBref } from './prepare/enbref.ts';

// ... after chapters:
logStep('extracting en bref');
const enbref = extractEnBref(rawParts);
for (const block of enbref) {
	writeFileSync(join(OUT, `ccc/en-bref/${block.chapter_slug}.json`), JSON.stringify(block));
}
endStep(`${enbref.length} blocks`);
```

- [ ] **Step 5: Run + verify**

```bash
npm run test -- enbref.test.ts && npm run prepare-data
```

Expected: ~30+ en-bref blocks.

- [ ] **Step 6: Commit**

```bash
git add scripts/prepare/enbref.ts scripts/prepare-data.ts tests/unit/prepare/enbref.test.ts
git commit -m "feat: extract En Bref summary blocks per chapter"
```

---

### Task B10: Parse `sigles.xhtml` → `abbreviations.json`

**Files:**
- Create: `scripts/prepare/abbreviations.ts`
- Modify: `scripts/prepare-data.ts`
- Test: `tests/unit/prepare/abbreviations.test.ts`

**Tooling:** use `context7` for `parse5` to confirm AST node shape (`tagName`, `nodeName`, `childNodes`, text-node `value`) — the AST is forgiving but quirky. If you discover the AST is too painful for this case, `cheerio` is an acceptable alternative — flag it as a concern and continue with `parse5`.

- [ ] **Step 1: Failing test**

`tests/unit/prepare/abbreviations.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseSigles } from '../../../scripts/prepare/abbreviations';

describe('parseSigles', () => {
	it('extracts abbreviation → expansion pairs from XHTML table', () => {
		const xml = `<html><body>
			<table>
				<tbody>
					<tr><td>AA</td><td>Apostolicam actuositatem</td></tr>
					<tr><td>LG</td><td>Lumen Gentium</td></tr>
				</tbody>
			</table>
		</body></html>`;
		const map = parseSigles(xml);
		expect(map['AA']).toBe('Apostolicam actuositatem');
		expect(map['LG']).toBe('Lumen Gentium');
	});

	it('skips empty rows', () => {
		const xml = `<table><tr><td>AA</td><td>X</td></tr><tr><td> </td><td>Y</td></tr></table>`;
		const map = parseSigles(xml);
		expect(Object.keys(map)).toEqual(['AA']);
	});
});
```

- [ ] **Step 2: Fail**

```bash
npm run test -- abbreviations.test.ts
```

- [ ] **Step 3: Write `scripts/prepare/abbreviations.ts`**

```ts
import { parse } from 'parse5';
import type { AbbreviationMap } from '../../src/lib/data/types.ts';

interface ParseNode {
	tagName?: string;
	nodeName: string;
	childNodes?: ParseNode[];
	value?: string;
}

function* iterate(node: ParseNode): Generator<ParseNode> {
	yield node;
	for (const child of node.childNodes ?? []) yield* iterate(child as ParseNode);
}

function textOf(node: ParseNode): string {
	if (node.nodeName === '#text') return (node.value ?? '').trim();
	let s = '';
	for (const c of node.childNodes ?? []) s += textOf(c as ParseNode);
	return s.trim();
}

export function parseSigles(xml: string): AbbreviationMap {
	const doc = parse(xml) as unknown as ParseNode;
	const out: AbbreviationMap = {};
	for (const n of iterate(doc)) {
		if (n.tagName === 'tr') {
			const tds = (n.childNodes ?? []).filter((c) => (c as ParseNode).tagName === 'td') as ParseNode[];
			if (tds.length >= 2) {
				const abbr = textOf(tds[0]);
				const expansion = textOf(tds[1]);
				if (abbr && expansion) out[abbr] = expansion;
			}
		}
	}
	return out;
}
```

- [ ] **Step 4: Wire into prepare-data.ts**

```ts
import { parseSigles } from './prepare/abbreviations.ts';

// ... after en-bref:
logStep('parsing abbreviations');
const sigles = readFileSync(join(SOURCES, 'sigles.xhtml'), 'utf8');
const abbrs = parseSigles(sigles);
writeFileSync(join(OUT, 'ccc/abbreviations.json'), JSON.stringify(abbrs, null, 2));
endStep(`${Object.keys(abbrs).length} entries`);
```

- [ ] **Step 5: Run + verify**

```bash
npm run test -- abbreviations.test.ts && npm run prepare-data
cat static/data/ccc/abbreviations.json | python3 -m json.tool | head -10
```

Expected: shows `"AA": "Apostolicam actuositatem"` etc.

- [ ] **Step 6: Commit**

```bash
git add scripts/prepare/abbreviations.ts scripts/prepare-data.ts tests/unit/prepare/abbreviations.test.ts
git commit -m "feat: parse sigles.xhtml into abbreviations.json"
```

---

### Task B11: Generate `bible-index.json` (passthrough + light validation)

**Files:**
- Create: `scripts/prepare/bible-index.ts`
- Modify: `scripts/prepare-data.ts`
- Test: `tests/unit/prepare/bible-index.test.ts`

- [ ] **Step 1: Failing test**

`tests/unit/prepare/bible-index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { processBibleIndex } from '../../../scripts/prepare/bible-index';

describe('processBibleIndex', () => {
	it('passes through ref → paragraph mappings', () => {
		const input = { 'Mt 28:19-20': [849, 1257], 'Mt 28:20': [80] };
		const output = processBibleIndex(input, new Set([80, 849, 1257]));
		expect(output['Mt 28:19-20']).toEqual([849, 1257]);
	});

	it('drops references to nonexistent paragraphs (with warning)', () => {
		const input = { 'Mt 1:1': [99999] };
		const output = processBibleIndex(input, new Set([1, 2, 3]));
		expect(output['Mt 1:1']).toBeUndefined();
	});
});
```

- [ ] **Step 2: Fail**

```bash
npm run test -- bible-index.test.ts
```

- [ ] **Step 3: Write `scripts/prepare/bible-index.ts`**

```ts
export function processBibleIndex(
	raw: Record<string, number[]>,
	knownParagraphs: Set<number>
): Record<string, number[]> {
	const out: Record<string, number[]> = {};
	const dropped: string[] = [];
	for (const [ref, paragraphs] of Object.entries(raw)) {
		const valid = paragraphs.filter((n) => knownParagraphs.has(n));
		if (valid.length === 0) {
			dropped.push(ref);
			continue;
		}
		out[ref] = valid;
	}
	if (dropped.length > 0) {
		process.stderr.write(`  warn: bible-index dropped ${dropped.length} refs with no valid paragraphs\n`);
	}
	return out;
}
```

- [ ] **Step 4: Wire into prepare-data.ts**

```ts
import { processBibleIndex } from './prepare/bible-index.ts';

// ... after abbreviations:
logStep('processing bible index');
const knownParas = new Set(paragraphs.keys());
const rawBibleIdx = JSON.parse(readFileSync(join(SOURCES, 'ccc_bible_index_clean.json'), 'utf8'));
const bibleIdx = processBibleIndex(rawBibleIdx, knownParas);
writeFileSync(join(OUT, 'ccc/bible-index.json'), JSON.stringify(bibleIdx));
endStep(`${Object.keys(bibleIdx).length} bible refs`);
```

- [ ] **Step 5: Verify + commit**

```bash
npm run test -- bible-index.test.ts && npm run prepare-data
git add scripts/prepare/bible-index.ts scripts/prepare-data.ts tests/unit/prepare/bible-index.test.ts
git commit -m "feat: process bible-index.json with paragraph validity check"
```

---

### Task B12: Parse NCL USFX → `bible/ncl.json`

**Files:**
- Create: `scripts/prepare/ncl.ts`
- Modify: `scripts/prepare-data.ts`
- Test: `tests/unit/prepare/ncl.test.ts`

**Tooling:** the plan implements a streaming regex parser (xml2js's deep nesting is awkward for USFX's mixed text+markers structure). If you suspect an edge case is being missed (book/chapter/verse boundary), inspect 5-10 raw verse blocks from `scripts/data-sources/ncl/francl_usfx.xml` and add fixtures to the test. **Do not** swap to a streaming SAX parser without flagging — the regex approach is intentional for this format.

- [ ] **Step 1: Failing test**

`tests/unit/prepare/ncl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseUSFX } from '../../../scripts/prepare/ncl';

describe('parseUSFX', () => {
	it('extracts verse text by book/chapter/verse, stripping Strong\'s tags', () => {
		const xml = `<usfx>
			<book id="GEN">
				<c id="1"/>
				<p style="p"><v id="1" bcv="GEN.1.1"/><w s="H7225">Au Commencement</w>
				<w s="H0430">Dieu</w>
				<w s="H1254">créa</w>
				<ve/></p>
				<p style="p"><v id="2" bcv="GEN.1.2"/><w>La</w> <w>terre</w><ve/></p>
			</book>
		</usfx>`;
		const result = parseUSFX(xml);
		expect(result['GEN']['1']['1']).toMatch(/Au Commencement/);
		expect(result['GEN']['1']['1']).toMatch(/Dieu/);
		expect(result['GEN']['1']['2']).toMatch(/terre/);
	});
});
```

- [ ] **Step 2: Fail**

```bash
npm run test -- ncl.test.ts
```

- [ ] **Step 3: Write `scripts/prepare/ncl.ts`**

```ts
import { parseStringPromise } from 'xml2js';

type Bible = Record<string, Record<string, Record<string, string>>>;

interface VerseAccum {
	bcv: string;
	parts: string[];
}

function flushText(node: any): string {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(flushText).join(' ');
	if (typeof node === 'object' && node !== null) {
		// xml2js represents text in node._ when there are attributes
		if (typeof node._ === 'string') return node._;
		let combined = '';
		for (const v of Object.values(node)) combined += ' ' + flushText(v);
		return combined.trim();
	}
	return '';
}

export async function parseUSFX(xml: string): Promise<Bible> {
	// Phase 1 strategy: walk the XML tree manually rather than use xml2js's deep nesting,
	// because USFX has v markers and ve markers as siblings of <w> elements with mixed text.
	const result: Bible = {};
	let currentBook = '';
	let currentChap = '';
	let currentVerse: string | null = null;
	let buf: string[] = [];

	function commitVerse() {
		if (currentVerse !== null && currentBook && currentChap) {
			const text = buf
				.join(' ')
				.replace(/\s+/g, ' ')
				.trim();
			if (text) {
				if (!result[currentBook]) result[currentBook] = {};
				if (!result[currentBook][currentChap]) result[currentBook][currentChap] = {};
				result[currentBook][currentChap][currentVerse] = text;
			}
		}
		buf = [];
	}

	// Stream-style regex parse:
	const tagRe = /<(\w+)\b([^>]*?)\/?>|<\/(\w+)>|([^<]+)/g;
	let match: RegExpExecArray | null;
	while ((match = tagRe.exec(xml)) !== null) {
		const [, openTag, attrs, closeTag, text] = match;
		if (openTag === 'book') {
			const idMatch = attrs.match(/id="([^"]+)"/);
			currentBook = idMatch ? idMatch[1] : '';
			currentChap = '';
			currentVerse = null;
			buf = [];
		} else if (openTag === 'c') {
			const idMatch = attrs.match(/id="([^"]+)"/);
			commitVerse();
			currentChap = idMatch ? idMatch[1] : '';
			currentVerse = null;
		} else if (openTag === 'v') {
			commitVerse();
			const idMatch = attrs.match(/id="([^"]+)"/);
			currentVerse = idMatch ? idMatch[1] : null;
		} else if (openTag === 've' || closeTag === 'p') {
			// no-op markers
		} else if (text !== undefined) {
			const cleaned = text.replace(/\s+/g, ' ').trim();
			if (cleaned) buf.push(cleaned);
		}
	}
	commitVerse();
	return result;
}
```

- [ ] **Step 4: Wire into prepare-data.ts**

```ts
import { parseUSFX } from './prepare/ncl.ts';

// ... after bible-index:
logStep('parsing NCL bible');
const nclXml = readFileSync(join(SOURCES, 'ncl/francl_usfx.xml'), 'utf8');
const ncl = await parseUSFX(nclXml);
writeFileSync(join(OUT, 'bible/ncl.json'), JSON.stringify(ncl));
endStep(`${Object.keys(ncl).length} books`);
```

- [ ] **Step 5: Verify + spot-check**

```bash
npm run test -- ncl.test.ts && npm run prepare-data
node -e "const b=require('./static/data/bible/ncl.json'); console.log(Object.keys(b).slice(0,5)); console.log(b.MAT['28']['19'])"
```

Expected: prints first 5 book IDs (GEN, EXO, etc.) and Mt 28:19 verse text including "Allez donc, de toutes les nations…".

- [ ] **Step 6: Commit**

```bash
git add scripts/prepare/ncl.ts scripts/prepare-data.ts tests/unit/prepare/ncl.test.ts
git commit -m "feat: parse Neo-Crampon Libre USFX into bible/ncl.json"
```

---

## Section C — Routing & Reading View Foundations

### Task C1: cccref param matcher

**Files:**
- Create: `src/params/cccref.ts`
- Test: `tests/unit/cccref.test.ts`

- [ ] **Step 1: Failing test**

`tests/unit/cccref.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { match } from '../../src/params/cccref';

describe('cccref matcher', () => {
	it('matches single paragraph numbers', () => {
		expect(match('27')).toBe(true);
		expect(match('1')).toBe(true);
		expect(match('2865')).toBe(true);
	});

	it('matches paragraph ranges', () => {
		expect(match('27-30')).toBe(true);
		expect(match('1-2865')).toBe(true);
	});

	it('rejects non-numeric and slug-like inputs', () => {
		expect(match('profession-de-la-foi')).toBe(false);
		expect(match('27a')).toBe(false);
		expect(match('-27')).toBe(false);
		expect(match('27-')).toBe(false);
		expect(match('')).toBe(false);
	});
});
```

- [ ] **Step 2: Fail**

```bash
npm run test -- cccref.test.ts
```

- [ ] **Step 3: Write `src/params/cccref.ts`**

```ts
export function match(param: string): boolean {
	return /^\d+(-\d+)?$/.test(param);
}
```

- [ ] **Step 4: Pass**

```bash
npm run test -- cccref.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/params/cccref.ts tests/unit/cccref.test.ts
git commit -m "feat: cccref param matcher for paragraph and range URLs"
```

---

### Task C2: Data loaders

**Files:**
- Create: `src/lib/data/loaders.ts`
- Test: `tests/unit/loaders.test.ts`

- [ ] **Step 1: Failing test**

`tests/unit/loaders.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { loadParagraph, loadChapter, loadStructure } from '$lib/data/loaders';

describe('loaders', () => {
	it('loadParagraph resolves to typed paragraph', async () => {
		const fakeFetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						corpus: 'ccc',
						number: 27,
						text_html: '<span>x</span>',
						cross_refs: [],
						bible_refs: [],
						citations: [],
						magisterial_refs: []
					})
			})
		) as any;
		const p = await loadParagraph(27, fakeFetch);
		expect(p.number).toBe(27);
	});

	it('loadParagraph throws on 404', async () => {
		const fakeFetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 })) as any;
		await expect(loadParagraph(99999, fakeFetch)).rejects.toThrow();
	});
});
```

- [ ] **Step 2: Fail**

```bash
npm run test -- loaders.test.ts
```

- [ ] **Step 3: Write `src/lib/data/loaders.ts`**

```ts
import type { Paragraph, Chapter, AbbreviationMap } from './types';

type Fetch = typeof fetch;

async function fetchJson<T>(url: string, fetcher: Fetch): Promise<T> {
	const res = await fetcher(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return res.json() as Promise<T>;
}

export function loadParagraph(n: number, fetcher: Fetch = fetch): Promise<Paragraph> {
	return fetchJson<Paragraph>(`/data/ccc/paragraphs/${n}.json`, fetcher);
}

export function loadChapter(slug: string, fetcher: Fetch = fetch): Promise<Chapter> {
	return fetchJson<Chapter>(`/data/ccc/chapters/${slug}.json`, fetcher);
}

export function loadStructure(fetcher: Fetch = fetch): Promise<unknown> {
	return fetchJson<unknown>('/data/ccc/structure.json', fetcher);
}

export function loadAbbreviations(fetcher: Fetch = fetch): Promise<AbbreviationMap> {
	return fetchJson<AbbreviationMap>('/data/ccc/abbreviations.json', fetcher);
}
```

- [ ] **Step 4: Pass**

```bash
npm run test -- loaders.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/loaders.ts tests/unit/loaders.test.ts
git commit -m "feat: data loaders for paragraphs, chapters, structure, abbreviations"
```

---

### Task C3: Single-paragraph route `/ccc/[ref=cccref]`

**Files:**
- Create: `src/routes/ccc/[ref=cccref]/+page.ts`
- Create: `src/routes/ccc/[ref=cccref]/+page.svelte`
- Create: `src/lib/components/ccc/ParagraphView.svelte`
- Create: `src/lib/components/ccc/ParagraphRenderer.svelte`
- Test: `tests/e2e/reader.test.ts`

**Tooling:** use the `svelte` MCP to verify SvelteKit `+page.ts` / `PageLoad` typing and the Svelte 4 syntax (`export let`, `{@html}`, `$:` reactive). Use `context7` for Playwright if test syntax is uncertain.

- [ ] **Step 1: Write `+page.ts` to load paragraph data**

`src/routes/ccc/[ref=cccref]/+page.ts`:

```ts
import { error } from '@sveltejs/kit';
import { loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const ref = params.ref!;
	const isRange = ref.includes('-');
	if (isRange) {
		const [from, to] = ref.split('-').map((s) => parseInt(s, 10));
		if (from < 1 || to < from || to > 2865) throw error(404, 'Plage invalide');
		const paragraphs = [];
		for (let n = from; n <= to; n++) {
			paragraphs.push(await loadParagraph(n, fetch));
		}
		return { kind: 'range' as const, from, to, paragraphs };
	}
	const n = parseInt(ref, 10);
	if (n < 1 || n > 2865) throw error(404, 'Paragraphe inconnu');
	const paragraph = await loadParagraph(n, fetch);
	return { kind: 'paragraph' as const, paragraph };
};
```

- [ ] **Step 2: Write `+page.svelte`**

`src/routes/ccc/[ref=cccref]/+page.svelte`:

```svelte
<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	export let data;
</script>

<svelte:head>
	{#if data.kind === 'paragraph'}
		<title>§ {data.paragraph.number} — Catéchisme</title>
	{:else}
		<title>§ {data.from}–{data.to} — Catéchisme</title>
	{/if}
</svelte:head>

<main class="mx-auto max-w-reader px-6 py-12">
	{#if data.kind === 'paragraph'}
		<ParagraphView paragraph={data.paragraph} />
	{:else}
		{#each data.paragraphs as p (p.number)}
			<ParagraphView paragraph={p} />
		{/each}
	{/if}
</main>
```

- [ ] **Step 3: Write `ParagraphView.svelte`**

`src/lib/components/ccc/ParagraphView.svelte`:

```svelte
<script lang="ts">
	import type { Paragraph } from '$lib/data/types';
	import ParagraphRenderer from './ParagraphRenderer.svelte';
	import CitationBlock from './CitationBlock.svelte';
	export let paragraph: Paragraph;
</script>

<article class="mb-8">
	<div class="flex gap-4">
		<a
			href="/ccc/{paragraph.number}"
			class="flex-none w-12 text-right pt-1 font-ui font-semibold text-accent tabular-nums hover:underline"
			aria-label="Lien vers le paragraphe {paragraph.number}"
		>
			{paragraph.number}
		</a>
		<div class="flex-1">
			<ParagraphRenderer html={paragraph.text_html} />
			{#each paragraph.citations as cite, i (i)}
				<CitationBlock html={cite.text_html} />
			{/each}
		</div>
	</div>
</article>
```

- [ ] **Step 4: Write `ParagraphRenderer.svelte`**

`src/lib/components/ccc/ParagraphRenderer.svelte`:

```svelte
<script lang="ts">
	export let html: string;
</script>

<div class="prose-paragraph leading-relaxed text-lg">
	{@html html}
</div>

<style>
	.prose-paragraph :global(sup.srcRef) {
		color: var(--color-accent);
		font-size: 0.7em;
		margin-left: 0.1em;
		cursor: help;
	}
	.prose-paragraph :global(sup.srcRef.cccRef::before) {
		content: '§';
	}
</style>
```

- [ ] **Step 5: Write a stub `CitationBlock.svelte`** (full styling in Task C8)

`src/lib/components/ccc/CitationBlock.svelte`:

```svelte
<script lang="ts">
	export let html: string;
</script>

<div class="citation-block mt-2 mb-4 ml-4 pl-4 border-l border-muted text-sm text-muted">
	{@html html}
</div>
```

- [ ] **Step 6: Run dev server, manually verify `/ccc/27` renders**

```bash
npm run dev
```

Visit `http://localhost:5173/ccc/27`. Expected: paragraph 27 text appears with the number `27` in gold to the left.

- [ ] **Step 7: Write Playwright e2e test**

`tests/e2e/reader.test.ts`:

```ts
import { test, expect } from '@playwright/test';

test('paragraph 27 page renders', async ({ page }) => {
	await page.goto('/ccc/27');
	await expect(page).toHaveTitle(/§ 27/);
	await expect(page.getByText('27', { exact: true }).first()).toBeVisible();
	await expect(page.getByText(/désir de Dieu/i)).toBeVisible();
});

test('paragraph range 27-30 renders', async ({ page }) => {
	await page.goto('/ccc/27-30');
	await expect(page).toHaveTitle(/§ 27.30/);
});

test('invalid paragraph returns 404', async ({ page }) => {
	const res = await page.goto('/ccc/99999');
	expect(res?.status()).toBe(404);
});
```

- [ ] **Step 8: Run e2e**

```bash
npm run test:e2e
```

Expected: all 3 e2e tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/routes/ccc/[ref=cccref]/ src/lib/components/ccc/ tests/e2e/reader.test.ts
git commit -m "feat: render single paragraph and range views at /ccc/[ref]"
```

---

### Task C4: Chapter route + ChapterOutline

**Files:**
- Create: `src/routes/ccc/[part]/[section]/[chapter]/+page.ts`
- Create: `src/routes/ccc/[part]/[section]/[chapter]/+page.svelte`
- Create: `src/lib/components/ccc/CCCReader.svelte`
- Create: `src/lib/components/ccc/ChapterOutline.svelte`
- Create: `src/lib/components/ccc/EnBrefBlock.svelte`
- Create: `src/lib/stores/outline.ts`

**Tooling:** use the `svelte` MCP to confirm `IntersectionObserver` lifecycle inside `onMount` returns the cleanup correctly, and the `class:active={cond}` syntax for conditional classes. Verify the `{@const}` block usage inside `{#each}` if you adopt it — it's Svelte 4-compat but easy to misspell.

- [ ] **Step 1: Write the outline store**

`src/lib/stores/outline.ts`:

```ts
import { writable } from 'svelte/store';

export const activeHeadingId = writable<string | null>(null);
```

- [ ] **Step 2: Write `+page.ts`**

`src/routes/ccc/[part]/[section]/[chapter]/+page.ts`:

```ts
import { error } from '@sveltejs/kit';
import { loadChapter, loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const chapter = await loadChapter(params.chapter!, fetch);
		const paragraphs = await Promise.all(chapter.paragraphs.map((n) => loadParagraph(n, fetch)));
		// Verify part_slug & section_slug match URL (catches stale links)
		if (chapter.part_slug !== params.part || chapter.section_slug !== params.section) {
			throw error(404, 'Chapitre introuvable');
		}
		// Optionally load en-bref (best-effort)
		let enBref = null;
		try {
			const r = await fetch(`/data/ccc/en-bref/${chapter.slug}.json`);
			if (r.ok) enBref = await r.json();
		} catch {}
		return { chapter, paragraphs, enBref };
	} catch (e) {
		throw error(404, 'Chapitre introuvable');
	}
};
```

- [ ] **Step 3: Write `+page.svelte`**

```svelte
<script lang="ts">
	import CCCReader from '$lib/components/ccc/CCCReader.svelte';
	export let data;
</script>

<svelte:head>
	<title>{data.chapter.title} — Catéchisme</title>
</svelte:head>

<CCCReader chapter={data.chapter} paragraphs={data.paragraphs} enBref={data.enBref} />
```

- [ ] **Step 4: Write `CCCReader.svelte`**

```svelte
<script lang="ts">
	import type { Chapter, Paragraph, EnBrefBlock as EBT } from '$lib/data/types';
	import ChapterOutline from './ChapterOutline.svelte';
	import ParagraphView from './ParagraphView.svelte';
	import EnBrefBlock from './EnBrefBlock.svelte';
	export let chapter: Chapter;
	export let paragraphs: Paragraph[];
	export let enBref: EBT | null = null;
</script>

<div class="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-10">
	<aside class="hidden lg:block">
		<div class="sticky top-24">
			<ChapterOutline chapter={chapter} />
		</div>
	</aside>

	<main>
		<header class="mb-8">
			<p class="font-ui text-sm uppercase tracking-wider text-muted">Chapitre</p>
			<h1 class="font-ui text-3xl font-bold mt-1">{chapter.title}</h1>
		</header>

		{#each paragraphs as p, i (p.number)}
			{#if chapter.headings.find((h) => h.paragraph_start === p.number)}
				{@const h = chapter.headings.find((hh) => hh.paragraph_start === p.number)}
				{#if h}
					<h2 id={h.id} class="font-ui text-xl font-semibold mt-12 mb-4 scroll-mt-24">{h.title}</h2>
				{/if}
			{/if}
			<ParagraphView paragraph={p} />
		{/each}

		{#if enBref}
			<EnBrefBlock enBref={enBref} />
		{/if}

		<nav class="mt-12 flex justify-between font-ui text-sm">
			{#if chapter.prev}
				<a href="/ccc/{chapter.part_slug}/{chapter.section_slug}/{chapter.prev.slug}" class="text-accent hover:underline">← {chapter.prev.title}</a>
			{:else}<span></span>{/if}
			{#if chapter.next}
				<a href="/ccc/{chapter.part_slug}/{chapter.section_slug}/{chapter.next.slug}" class="text-accent hover:underline">{chapter.next.title} →</a>
			{:else}<span></span>{/if}
		</nav>
	</main>
</div>
```

- [ ] **Step 5: Write `ChapterOutline.svelte`**

```svelte
<script lang="ts">
	import type { Chapter } from '$lib/data/types';
	import { activeHeadingId } from '$lib/stores/outline';
	import { onMount } from 'svelte';
	export let chapter: Chapter;
	let observer: IntersectionObserver;

	onMount(() => {
		observer = new IntersectionObserver(
			(entries) => {
				const visible = entries.filter((e) => e.isIntersecting);
				if (visible.length > 0) {
					$activeHeadingId = visible[0].target.id;
				}
			},
			{ rootMargin: '-20% 0px -75% 0px', threshold: 0 }
		);
		for (const h of chapter.headings) {
			const el = document.getElementById(h.id);
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	});
</script>

<nav aria-label="Plan du chapitre" class="font-ui text-sm">
	<ul class="space-y-1">
		{#each chapter.headings as h}
			<li>
				<a
					href="#{h.id}"
					class="block py-1 pl-3 border-l-2 transition-colors"
					class:border-accent={$activeHeadingId === h.id}
					class:font-semibold={$activeHeadingId === h.id}
					class:text-accent={$activeHeadingId === h.id}
					class:border-transparent={$activeHeadingId !== h.id}
					class:text-muted={$activeHeadingId !== h.id}
				>
					{h.title}
				</a>
			</li>
		{/each}
	</ul>
</nav>
```

- [ ] **Step 6: Stub `EnBrefBlock.svelte`** (will be styled fully in Task D2)

```svelte
<script lang="ts">
	import type { EnBrefBlock } from '$lib/data/types';
	export let enBref: EnBrefBlock;
</script>

<aside class="mt-16 p-6 bg-accent/10 border-l-4 border-accent">
	<p class="font-ui text-xs uppercase tracking-wider text-accent font-bold">En Bref</p>
	<p class="text-sm text-muted mt-2">Paragraphes de résumé : {enBref.paragraphs.join(', ')}</p>
</aside>
```

- [ ] **Step 7: Manual smoke test**

```bash
npm run dev
```

Visit `http://localhost:5173/ccc/profession-de-la-foi/credo/lhomme-est-capable-de-dieu` (slug name based on actual generated structure — verify via `cat static/data/ccc/structure.json | python3 -m json.tool`). Expected: chapter renders with sticky outline on left.

- [ ] **Step 8: Commit**

```bash
git add src/routes/ccc/[part]/[section]/[chapter]/ src/lib/components/ccc/ src/lib/stores/outline.ts
git commit -m "feat: chapter reader with sticky outline and prev/next nav"
```

---

### Task C5: Part/section overview routes

**Files:**
- Create: `src/routes/ccc/[part]/+page.ts`, `+page.svelte`
- Create: `src/routes/ccc/[part]/[section]/+page.ts`, `+page.svelte`

- [ ] **Step 1: Write `[part]/+page.ts`**

```ts
import { error } from '@sveltejs/kit';
import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const struct = (await loadStructure(fetch)) as { parts: Array<{ slug: string; title: string; sections: any[] }> };
	const part = struct.parts.find((p) => p.slug === params.part);
	if (!part) throw error(404, 'Partie introuvable');
	return { part };
};
```

- [ ] **Step 2: Write `[part]/+page.svelte`**

```svelte
<script lang="ts">
	export let data;
</script>

<svelte:head><title>{data.part.title} — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-12">
	<h1 class="font-ui text-4xl font-bold mb-8">{data.part.title}</h1>
	<ol class="space-y-6">
		{#each data.part.sections as section}
			<li>
				<a href="/ccc/{data.part.slug}/{section.slug}" class="block group">
					<h2 class="font-ui text-2xl font-semibold group-hover:text-accent">{section.title}</h2>
					<p class="text-muted text-sm mt-1">{section.chapters.length} chapitres</p>
				</a>
			</li>
		{/each}
	</ol>
</main>
```

- [ ] **Step 3: Write `[part]/[section]/+page.ts` + `+page.svelte` (mirror pattern, with chapter list)**

```ts
import { error } from '@sveltejs/kit';
import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const struct = (await loadStructure(fetch)) as { parts: any[] };
	const part = struct.parts.find((p) => p.slug === params.part);
	if (!part) throw error(404);
	const section = part.sections.find((s: any) => s.slug === params.section);
	if (!section) throw error(404);
	return { part, section };
};
```

```svelte
<script lang="ts">
	export let data;
</script>

<svelte:head><title>{data.section.title} — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-12">
	<p class="font-ui text-sm text-muted">
		<a href="/ccc/{data.part.slug}" class="hover:underline">{data.part.title}</a>
	</p>
	<h1 class="font-ui text-4xl font-bold mt-2 mb-8">{data.section.title}</h1>
	<ol class="space-y-4">
		{#each data.section.chapters as chapter}
			<li>
				<a href="/ccc/{data.part.slug}/{data.section.slug}/{chapter.slug}" class="block group">
					<h2 class="font-ui text-xl font-semibold group-hover:text-accent">{chapter.title}</h2>
					<p class="text-muted text-sm">{chapter.paragraphs.length} paragraphes</p>
				</a>
			</li>
		{/each}
	</ol>
</main>
```

- [ ] **Step 4: Smoke test all routes**

```bash
npm run dev
```

Visit `/ccc/profession-de-la-foi`, then click into a section, then a chapter. Expected: navigation works.

- [ ] **Step 5: Commit**

```bash
git add src/routes/ccc/[part]/+page.* src/routes/ccc/[part]/[section]/+page.*
git commit -m "feat: part and section overview routes"
```

---

### Task C6: Sommaire route + CCC home + redirects

**Files:**
- Create: `src/routes/ccc/+page.ts`, `+page.svelte`
- Create: `src/routes/ccc/sommaire/+page.ts`, `+page.svelte`
- Create: `src/routes/ccc/partie/[n]/+page.ts` (redirects)
- Create: `src/routes/ccc/prologue/+page.ts`, `+page.svelte`

- [ ] **Step 1: `/ccc/sommaire` — full TOC**

```ts
// +page.ts
import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	return { structure: await loadStructure(fetch) };
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
	export let data;
	const struct = data.structure as { parts: any[] };
</script>

<svelte:head><title>Sommaire — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-4xl px-6 py-12">
	<h1 class="font-ui text-4xl font-bold mb-8">Sommaire complet</h1>

	{#each struct.parts as part}
		<section class="mb-10">
			<h2 class="font-ui text-2xl font-bold mb-4">
				<a href="/ccc/{part.slug}" class="hover:text-accent">{part.title}</a>
			</h2>
			{#each part.sections as section}
				<h3 class="font-ui text-lg font-semibold mt-6 mb-2 ml-4">
					<a href="/ccc/{part.slug}/{section.slug}" class="hover:text-accent">{section.title}</a>
				</h3>
				<ul class="ml-8 space-y-1 text-sm">
					{#each section.chapters as chap}
						<li>
							<a href="/ccc/{part.slug}/{section.slug}/{chap.slug}" class="hover:text-accent">
								{chap.title}
							</a>
							{#if chap.articles.length}
								<ul class="ml-4 mt-1 text-muted">
									{#each chap.articles as article}
										<li>
											<a href="/ccc/{part.slug}/{section.slug}/{chap.slug}/{article.slug}" class="hover:text-accent">
												{article.title}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			{/each}
		</section>
	{/each}
</main>
```

- [ ] **Step 2: `/ccc` — corpus home**

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { loadStructure } from '$lib/data/loaders';
	let parts: any[] = [];
	onMount(async () => {
		parts = ((await loadStructure()) as any).parts;
	});
</script>

<svelte:head><title>Catéchisme de l'Église catholique</title></svelte:head>

<main class="mx-auto max-w-4xl px-6 py-16">
	<h1 class="font-ui text-5xl font-bold mb-4">Catéchisme de l'Église catholique</h1>
	<p class="text-lg text-muted mb-12">Édition française complète, recherche par paragraphe, référence biblique et thème.</p>

	{#if parts.length}
		<div class="grid sm:grid-cols-2 gap-6">
			{#each parts as p}
				<a href="/ccc/{p.slug}" class="block p-6 border border-border rounded-lg hover:border-accent">
					<h2 class="font-ui text-xl font-semibold">{p.title}</h2>
				</a>
			{/each}
		</div>
	{/if}

	<p class="mt-12">
		<a href="/ccc/sommaire" class="text-accent hover:underline font-ui">Sommaire complet →</a>
	</p>
</main>
```

- [ ] **Step 3: Redirect `/ccc/partie/[n]` → part slug**

```ts
// src/routes/ccc/partie/[n]/+page.ts
import { redirect } from '@sveltejs/kit';
import { loadStructure } from '$lib/data/loaders';
import type { PageLoad } from './$types';

const PART_INDEX_TO_SLUG_HINT = {
	'1': 1, '2': 2, '3': 3, '4': 4
} as const;

export const load: PageLoad = async ({ params, fetch }) => {
	const n = params.n!;
	const struct = (await loadStructure(fetch)) as { parts: any[] };
	const idx = parseInt(n, 10);
	const nonPrologue = struct.parts.filter((p) => !p.prologue);
	const target = nonPrologue[idx - 1];
	if (!target) throw new Error(`Partie ${n} introuvable`);
	throw redirect(308, `/ccc/${target.slug}`);
};
```

- [ ] **Step 4: `/ccc/prologue`**

```ts
// +page.ts
import { loadStructure } from '$lib/data/loaders';
import { error } from '@sveltejs/kit';
import { loadParagraph } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const struct = (await loadStructure(fetch)) as { parts: any[] };
	const prologue = struct.parts.find((p) => p.prologue);
	if (!prologue) throw error(404);
	// Prologue paragraphs live as direct children, not nested in sections — read structure.json directly
	const paragraphs = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map((n) => loadParagraph(n, fetch)));
	return { paragraphs };
};
```

```svelte
<script lang="ts">
	import ParagraphView from '$lib/components/ccc/ParagraphView.svelte';
	export let data;
</script>

<svelte:head><title>Prologue — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-reader px-6 py-12">
	<h1 class="font-ui text-4xl font-bold mb-10">Prologue</h1>
	{#each data.paragraphs as p (p.number)}
		<ParagraphView paragraph={p} />
	{/each}
</main>
```

- [ ] **Step 5: Smoke test**

```bash
npm run dev
```

Visit `/`, `/ccc`, `/ccc/sommaire`, `/ccc/prologue`, `/ccc/partie/1` (should redirect).

- [ ] **Step 6: Commit**

```bash
git add src/routes/ccc/+page.* src/routes/ccc/sommaire/ src/routes/ccc/partie/ src/routes/ccc/prologue/
git commit -m "feat: ccc home, sommaire (full TOC), prologue, partie redirects"
```

---

## Section D — Branding & Visual Polish (Phase 1)

### Task D1: Optimize logos (one-time script)

**Files:**
- Create: `bin/optimize-logos.ts`
- Modify: `package.json`
- Adds (committed): `static/img/logo/*.{webp,png}`

**Tooling:** use `context7` for `sharp` to confirm the chained API for `.resize().webp().toFile()` and the `fit: 'contain'` option behavior with transparency.

- [ ] **Step 1: Write `bin/optimize-logos.ts`**

```ts
#!/usr/bin/env tsx
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SIZES = [32, 48, 64, 96, 128, 192];
const SRC = 'scripts/data-sources/logos';
const OUT = 'static/img/logo';

interface Variant { src: string; baseName: string; }

const variants: Variant[] = [
	{ src: 'catechisme-logo.png', baseName: 'logo' },
	{ src: 'catechisme-logo-white.png', baseName: 'logo-dark' }
];

mkdirSync(OUT, { recursive: true });

async function run() {
	for (const v of variants) {
		for (const size of SIZES) {
			await sharp(join(SRC, v.src))
				.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
				.webp({ quality: 90 })
				.toFile(join(OUT, `${v.baseName}-${size}.webp`));
			await sharp(join(SRC, v.src))
				.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
				.png()
				.toFile(join(OUT, `${v.baseName}-${size}.png`));
		}
	}
	console.log(`Optimized logos written to ${OUT}/ (${variants.length * SIZES.length * 2} files).`);
}

run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add npm script**

In `package.json`:

```json
"optimize-logos": "tsx bin/optimize-logos.ts"
```

- [ ] **Step 3: Run it once**

```bash
npm run optimize-logos
```

Expected: prints "Optimized logos written…", `static/img/logo/` contains 24 files (2 variants × 6 sizes × 2 formats).

- [ ] **Step 4: Update `static/img/logo/` gitignore exception**

The earlier gitignore excludes `/static/data/` (generated). Logos in `/static/img/logo/` are committed. No change needed unless the gitignore inadvertently excludes them — verify:

```bash
git check-ignore -v static/img/logo/logo-64.webp
```

Expected: prints "no ignore" (or empty output).

- [ ] **Step 5: Commit logos + script**

```bash
git add bin/optimize-logos.ts package.json package-lock.json static/img/logo/
git commit -m "feat: one-time logo optimization script with webp + png at 6 sizes"
```

---

### Task D2: Wordmark + LogoMark + TopBar

**Files:**
- Create: `src/lib/components/ui/Wordmark.svelte`
- Create: `src/lib/components/ui/LogoMark.svelte`
- Create: `src/lib/components/ui/TopBar.svelte`
- Modify: `src/routes/+layout.svelte`

**Tooling:** use the `svelte` MCP for `<picture>` element usage in Svelte and any quirks with class binding. Reference DR's `TopBar.svelte` (in `../douayrheimsbible/src/lib/components/`) for the slot/prop patterns to follow — read it first via the `Explore` agent if uncertain.

- [ ] **Step 1: `Wordmark.svelte`**

```svelte
<div class="font-ui leading-[1.05]">
	<div class="text-[20px] font-bold tracking-tight text-foreground">Catéchisme</div>
	<div class="text-[14px] font-medium text-muted">de l'Église</div>
	<div class="text-[14px] font-medium text-muted">Catholique</div>
</div>
```

- [ ] **Step 2: `LogoMark.svelte`**

```svelte
<picture>
	<source media="(prefers-color-scheme: dark)" srcset="/img/logo/logo-dark-64.webp 1x, /img/logo/logo-dark-128.webp 2x" type="image/webp" />
	<source srcset="/img/logo/logo-64.webp 1x, /img/logo/logo-128.webp 2x" type="image/webp" />
	<img src="/img/logo/logo-64.png" alt="Catéchisme de l'Église catholique" width="56" height="56" class="block" />
</picture>
```

- [ ] **Step 3: `TopBar.svelte`**

```svelte
<script lang="ts">
	import LogoMark from './LogoMark.svelte';
	import Wordmark from './Wordmark.svelte';
</script>

<header class="border-b border-border bg-background sticky top-0 z-30">
	<div class="mx-auto max-w-7xl px-6 py-3 flex items-center gap-6 min-h-[80px]">
		<a href="/" class="flex items-center gap-3 flex-none" aria-label="Accueil">
			<LogoMark />
			<Wordmark />
		</a>

		<div class="flex-1"></div>
		<div class="hidden lg:block w-full max-w-[460px]">
			<input
				type="search"
				placeholder="Chercher § 27, Mt 28:19, péché originel…"
				class="w-full h-10 px-4 rounded-md border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-accent"
				disabled
				aria-label="Recherche (à venir)"
			/>
		</div>
		<div class="flex-1"></div>

		<nav class="flex items-center gap-6 font-ui text-sm font-semibold flex-none">
			<a href="/ccc" class="hover:text-accent">Catéchisme</a>
			<a href="/bible" class="hover:text-accent">Bible</a>
			<a href="/ccc/sommaire" class="hover:text-accent">Sommaire</a>
			<a href="/a-propos" class="hover:text-accent">À propos</a>
		</nav>
		<button
			type="button"
			class="ml-2 w-9 h-9 rounded-md bg-accent/10 text-foreground flex items-center justify-center hover:bg-accent/20"
			aria-label="Préférences"
			disabled
		>
			⚙
		</button>
	</div>
</header>
```

- [ ] **Step 4: Wire TopBar into `+layout.svelte`**

```svelte
<script lang="ts">
	import '../app.css';
	import TopBar from '$lib/components/ui/TopBar.svelte';
</script>

<TopBar />
<slot />
```

- [ ] **Step 5: Smoke test**

```bash
npm run dev
```

Visit `/` and `/ccc/27`. Expected: TopBar with logo, wordmark, disabled search bar centered, nav links + settings on right.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ui/ src/routes/+layout.svelte
git commit -m "feat: TopBar with logo, 3-line wordmark, centered (disabled) search, nav cluster"
```

---

### Task D3: Web fonts + theme tokens

**Files:**
- Modify: `src/app.html`, `src/app.css`

- [ ] **Step 1: Reference Libre Baskerville from Google Fonts**

`src/app.html`:

```html
<!DOCTYPE html>
<html lang="fr" data-theme="light">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width" />
		<link rel="icon" type="image/webp" href="/img/logo/logo-32.webp" />
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" />
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

- [ ] **Step 2: Update `--font-ui` in `app.css`**

In `:root` block, change:

```
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

(Renaming from "Gotham" placeholder — Inter is the actual web font we load.)

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```

Body text should now be in Libre Baskerville; UI text (TopBar, headings) in Inter.

- [ ] **Step 4: Commit**

```bash
git add src/app.html src/app.css
git commit -m "feat: load Libre Baskerville and Inter from Google Fonts"
```

---

### Task D4: Theme store + dark mode toggle

**Files:**
- Create: `src/lib/stores/prefs.ts`
- Create: `src/lib/components/ui/ModeToggle.svelte`
- Modify: `src/lib/components/ui/TopBar.svelte` (replace ⚙ stub with ModeToggle)
- Create: theme-bootstrap inline script in `src/app.html`

- [ ] **Step 1: Add inline theme bootstrap to `app.html`** to prevent FOUC

In `<head>`, before `%sveltekit.head%`:

```html
<script>
	(function () {
		try {
			var stored = localStorage.getItem('lecatechisme.theme');
			var theme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
			document.documentElement.setAttribute('data-theme', theme);
		} catch (e) {}
	})();
</script>
```

- [ ] **Step 2: Write `src/lib/stores/prefs.ts` (minimal Phase 1 subset)**

```ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';
const KEY = 'lecatechisme.theme';

function readInitial(): Theme {
	if (!browser) return 'light';
	const stored = localStorage.getItem(KEY) as Theme | null;
	if (stored === 'light' || stored === 'dark') return stored;
	return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = writable<Theme>(readInitial());

if (browser) {
	theme.subscribe((t) => {
		document.documentElement.setAttribute('data-theme', t);
		localStorage.setItem(KEY, t);
	});
}
```

- [ ] **Step 3: Write `ModeToggle.svelte`**

```svelte
<script lang="ts">
	import { theme } from '$lib/stores/prefs';
	function toggle() {
		theme.update((t) => (t === 'light' ? 'dark' : 'light'));
	}
</script>

<button
	type="button"
	class="ml-2 w-9 h-9 rounded-md bg-accent/10 hover:bg-accent/20 flex items-center justify-center text-base"
	on:click={toggle}
	aria-label="Basculer le thème"
>
	{#if $theme === 'dark'}☀{:else}☾{/if}
</button>
```

- [ ] **Step 4: Replace stub button in `TopBar.svelte`**

Replace the disabled `⚙` button with:

```svelte
<ModeToggle />
```

…and add at the top: `import ModeToggle from './ModeToggle.svelte';`

- [ ] **Step 5: Smoke test**

```bash
npm run dev
```

Click the toggle in the TopBar. Body should switch between light parchment and dark warm-charcoal. Reload should preserve.

- [ ] **Step 6: Commit**

```bash
git add src/app.html src/lib/stores/prefs.ts src/lib/components/ui/ModeToggle.svelte src/lib/components/ui/TopBar.svelte
git commit -m "feat: theme store + dark mode toggle with no-FOUC bootstrap"
```

---

### Task D5: Final Phase 1 polish — error page, A propos stub, sitemap

**Files:**
- Create: `src/routes/+error.svelte`
- Create: `src/routes/a-propos/+page.svelte`
- Create: `src/routes/sitemap.xml/+server.ts`

- [ ] **Step 1: Write `+error.svelte`**

```svelte
<script lang="ts">
	import { page } from '$app/stores';
</script>

<main class="mx-auto max-w-2xl px-6 py-24 text-center">
	<h1 class="font-ui text-6xl font-bold text-accent">{$page.status}</h1>
	<p class="mt-4 text-xl text-muted">{$page.error?.message ?? 'Une erreur est survenue.'}</p>
	<a href="/" class="mt-10 inline-block text-accent hover:underline font-ui">← Retour à l'accueil</a>
</main>
```

- [ ] **Step 2: Write `/a-propos/+page.svelte` stub**

```svelte
<svelte:head><title>À propos — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-3xl px-6 py-16 prose">
	<h1>À propos</h1>
	<p>Cette édition en ligne du Catéchisme de l'Église catholique est gratuite, sans publicité.</p>
	<p>Édition française définitive, traduite par Henri Rochais. © Libreria Editrice Vaticana.</p>
</main>
```

- [ ] **Step 3: Write a basic sitemap generator**

```ts
// src/routes/sitemap.xml/+server.ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const struct = (await (await fetch('/data/ccc/structure.json')).json()) as { parts: any[] };
	const urls: string[] = ['/', '/ccc', '/ccc/sommaire', '/ccc/prologue', '/a-propos'];

	for (const part of struct.parts) {
		if (part.prologue) continue;
		urls.push(`/ccc/${part.slug}`);
		for (const section of part.sections) {
			urls.push(`/ccc/${part.slug}/${section.slug}`);
			for (const chap of section.chapters) {
				urls.push(`/ccc/${part.slug}/${section.slug}/${chap.slug}`);
				for (const article of chap.articles) {
					urls.push(`/ccc/${part.slug}/${section.slug}/${chap.slug}/${article.slug}`);
				}
			}
		}
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `	<url><loc>https://lecatechisme.fr${u}</loc></url>`).join('\n')}
</urlset>`;

	return new Response(xml, { headers: { 'content-type': 'application/xml' } });
};
```

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Visit `/sitemap.xml`. Expected: well-formed XML listing top-level pages + ~140 chapter URLs. Visit `/foo`. Expected: error page with "404".

- [ ] **Step 5: Commit**

```bash
git add src/routes/+error.svelte src/routes/a-propos/+page.svelte src/routes/sitemap.xml/
git commit -m "feat: error page, about stub, basic sitemap generator"
```

---

### Task D6: First production deploy

**Files:**
- Verify: `wrangler.toml`, `static/_headers`, `static/_redirects`
- Modify: `package.json` (set `engines.node`)

- [ ] **Step 1: Pin Node version**

In `package.json`:

```json
"engines": {
	"node": ">=20"
}
```

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: clean build, output at `.svelte-kit/cloudflare/`.

- [ ] **Step 3: Local preview against the build**

```bash
npm run preview
```

Visit `localhost:4173`. Smoke-test all routes: `/`, `/ccc`, `/ccc/sommaire`, `/ccc/prologue`, `/ccc/27`, `/ccc/profession-de-la-foi/credo/<some-chapter-slug>`.

- [ ] **Step 4: Push to GitHub, verify Cloudflare Pages auto-deploys**

```bash
git push origin main
```

Watch the Cloudflare Pages dashboard. Expected: build succeeds, preview URL works end-to-end.

- [ ] **Step 5: Manual verification on the deployed URL**

- Confirm logos load (light + dark)
- Confirm `/ccc/27` works
- Confirm a chapter page loads with sticky outline
- Confirm theme toggle persists across reload
- Confirm 404 page is styled

- [ ] **Step 6: Final Phase 1 commit (if any deploy-config touch-ups)**

```bash
git add -p
git commit -m "feat: Phase 1 complete — deployable CCC reader on Cloudflare Pages"
git push origin main
```

---

## Phase 1 Done — What Ships

- Site live on `*.pages.dev`
- Reading routes: `/ccc/{n}`, `/ccc/{n}-{m}`, `/ccc/[part]`, `/ccc/[part]/[section]`, `/ccc/[part]/[section]/[chapter]`, `/ccc/sommaire`, `/ccc/prologue`, `/ccc`, `/`
- Sticky chapter outline with active-heading tracking
- Prev/next chapter navigation
- Inline `§NNN` and Bible-ref markers (no panel/tooltip behavior yet — Phase 2)
- Optimized logos, theme toggle (light/dark), Libre Baskerville body
- Sitemap, error page, About stub
- Cloudflare Pages deploy

## Subsequent Phases — Outline

### Phase 2: Study Panel + Cross-Refs + `/bible/`
- Generalized `StudyPanel` with `tabs: TabDef[]` prop
- `RefTooltip` (hover) + `linkifyRefs` action (click → panel)
- Tabs: Bible, Renvois, Cités par, Sources, En Bref
- `/bible/`, `/bible/[book]`, `/bible/[book]/[ch]`, `/bible/[book]/[ch]/[v]` — book grid → verse → CCC paragraphs that cite it
- Catéchisme cascading dropdown in TopBar
- Citations rendered with full inline styling
- Article-level routes
- Build subagents from spec sections §6 (Reading View), §5 (Components), §4 (Routes — `/bible/`)

### Phase 3: Search
- MiniSearch index build (5 doc types: paragraph, chapter, article, theme, source)
- French stemmer + stop words + accent insensitivity
- Header search input wired with intent detection (paragraph #, range, Bible ref, magisterial ref, fulltext)
- Result dropdown with enriched cards for theme/source results
- `/recherche` advanced page with filters
- Cloudflare KV namespace + `npm run upload-index` script
- Build from spec §8

### Phase 4: Polish & Launch
- All v1 reading prefs (font picker, dyslexia, all toggles)
- PWA + offline (service worker + manifest)
- Schema.org per-paragraph markup
- llms.txt, robots.txt, OpenGraph
- Print stylesheet
- Lighthouse ≥95 across the four scores
- WCAG AA pass
- Final domain wiring (`lecatechisme.fr` once registered)
- Build from spec §10–§13

---

## Self-Review Notes

Reviewed Phase 1 plan against the spec. Findings:

- Spec §3 data outputs covered: ✓ (B5–B12 generate structure, paragraphs, chapters, en-bref, abbreviations, bible-index, NCL).
- Spec §3 outputs deferred to later phases (acknowledged, NOT in Phase 1): citations.json (D2's CitationBlock will start using it once it's generated — needs to land in Phase 1 actually). 
- **Gap caught**: `citations.json` and `refs.json` are referenced by `ParagraphView`'s `CitationBlock` rendering in C3 but no task generates them in Phase 1. Adding a brief note: the `Citation` data is already inline within each paragraph's `text_html` and `citations` array (per §2 `Paragraph` type). The standalone `citations.json` aggregate file is not strictly required for inline rendering. Aggregate files are needed for Phase 2 panel tabs and search. **No fix needed for Phase 1**.
- Spec §3 thematic-index, sources-index, NCL parsing tasks: only NCL (B12) is in Phase 1 because it's needed for Phase 2's RefTooltip preview cache. Thematic + Sources parsing deferred to Phase 3 (search), which is when their output is first consumed.
- Spec §4 routes covered: ✓ (paragraph, range, part, section, chapter, sommaire, prologue, partie redirect, ccc home, homepage placeholder).
- Spec §4 deferred: article route, /bible/, /recherche, /a-propos sub-pages — Phases 2–4 as outlined.
- Spec §5 components: ✓ Phase 1 subset (CCCReader, ParagraphView, ParagraphRenderer, ChapterOutline, EnBrefBlock stub, CitationBlock stub, Wordmark, LogoMark, TopBar). Deferred: StudyPanel, RefTooltip, all panel tabs, BookGrid/etc., SearchResultCard.
- Spec §6 Layout polish (~750px reader): ✓ via Tailwind `max-w-reader` set to 750px in A2.
- Spec §6 keyboard nav: deferred to Phase 4 (polish).
- Spec §7 TopBar layout: ✓ — single row, brand left, search center (disabled in Phase 1), nav+settings right.
- Spec §10 Visual style: ✓ basic — theme tokens, Libre Baskerville, dark/light, gold accent. Full prefs panel deferred to Phase 4.
- Spec §13 SEO: basic sitemap done, schema/OG/llms.txt deferred to Phase 4.

Type consistency check: `Paragraph` type used in C3 matches B2 definition. `Chapter` in C4 matches. `BuiltStructure` is a build-time-only type; runtime uses `unknown` cast (acceptable for Phase 1 — cleanup in Phase 4).

No placeholders remain. No "TBD" or "implement later". Each step has executable code or commands.
