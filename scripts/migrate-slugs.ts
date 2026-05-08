#!/usr/bin/env tsx
/**
 * One-off migration: rewrite static/data/ JSON from old-format slugs
 * (e.g. `la-profession-de-la-foi`) to new numbered short-slugs
 * (e.g. `1-profession-de-la-foi`).
 *
 * Delete this file after running.
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { numberedSlug } from './prepare/slug.js';

const DATA = 'static/data';

// ─── 1. Build CEC slug mapping ────────────────────────────────────────────────

interface SlugEntry {
	oldSlug: string;
	newSlug: string;
	/** Context for diagnostics */
	kind: 'part' | 'section' | 'chapter' | 'article';
}

const cecStructure = JSON.parse(readFileSync(`${DATA}/cec/structure.json`, 'utf8'));
// slug → new slug (for non-ambiguous slugs)
const cecMap = new Map<string, string>();
// For the special duplicate case: partSlug/sectionSlug/chapterSlug/articleSlug → new article slug
// We store a separate articleMap for slugs that collide with their chapter
const articleOverrides = new Map<string, string>(); // chapterOldSlug + '/' + articleOldSlug → newSlug
const allEntries: SlugEntry[] = [];

let partN = 0;
for (const part of cecStructure.parts as any[]) {
	const partOldSlug: string = part.slug;
	let partNewSlug: string;
	if (partOldSlug === 'prologue') {
		partNewSlug = 'prologue';
	} else {
		partN++;
		partNewSlug = numberedSlug(partN, part.title as string, 30, new Set());
	}
	cecMap.set(partOldSlug, partNewSlug);
	allEntries.push({ oldSlug: partOldSlug, newSlug: partNewSlug, kind: 'part' });

	let secN = 0;
	for (const section of (part.sections as any[]) ?? []) {
		secN++;
		const secOldSlug: string = section.slug;
		const secNewSlug = numberedSlug(secN, section.title as string, 30, new Set());
		cecMap.set(secOldSlug, secNewSlug);
		allEntries.push({ oldSlug: secOldSlug, newSlug: secNewSlug, kind: 'section' });

		let chapN = 0;
		for (const chap of (section.chapters as any[]) ?? []) {
			chapN++;
			const chapOldSlug: string = chap.slug;
			const chapNewSlug = numberedSlug(chapN, chap.title as string, 30, new Set());
			cecMap.set(chapOldSlug, chapNewSlug);
			allEntries.push({ oldSlug: chapOldSlug, newSlug: chapNewSlug, kind: 'chapter' });

			const takenA = new Set<string>();
			for (const art of (chap.articles as any[]) ?? []) {
				const artOldSlug: string = art.slug;
				const artN: number = art.number ?? 0;
				const artNewSlug = numberedSlug(artN, art.title as string, 30, takenA);
				if (cecMap.has(artOldSlug) && cecMap.get(artOldSlug) !== artNewSlug) {
					// Collision: same old slug maps to different new slugs (chapter vs article)
					// Store the article override keyed by chapOldSlug/artOldSlug
					articleOverrides.set(`${chapOldSlug}/${artOldSlug}`, artNewSlug);
					console.warn(
						`[WARN] Ambiguous old slug "${artOldSlug}": ` +
							`chapter→"${cecMap.get(artOldSlug)}", article→"${artNewSlug}". ` +
							`Will use path-aware replacement for article occurrences.`
					);
				} else {
					cecMap.set(artOldSlug, artNewSlug);
				}
				allEntries.push({ oldSlug: artOldSlug, newSlug: artNewSlug, kind: 'article' });
			}
		}

		// articles_direct under section (no chapter wrapper)
		const takenAD = new Set<string>();
		for (const art of (section.articles_direct as any[]) ?? []) {
			const artOldSlug: string = art.slug;
			const artN: number = art.number ?? 0;
			const artNewSlug = numberedSlug(artN, art.title as string, 30, takenAD);
			if (!cecMap.has(artOldSlug)) {
				cecMap.set(artOldSlug, artNewSlug);
			}
			allEntries.push({ oldSlug: artOldSlug, newSlug: artNewSlug, kind: 'article' });
		}
	}
}

// ─── 2. Build Compendium slug mapping ─────────────────────────────────────────

const compStructure = JSON.parse(readFileSync(`${DATA}/compendium/structure.json`, 'utf8'));
const compMap = new Map<string, string>();
for (let i = 0; i < (compStructure.parts as any[]).length; i++) {
	const part = compStructure.parts[i] as any;
	const oldSlug: string = part.slug;
	const newSlug = numberedSlug(i + 1, part.title as string, 30, new Set());
	compMap.set(oldSlug, newSlug);
	console.log(`Compendium part: "${oldSlug}" → "${newSlug}"`);
}
// appendix slug 'annexe' stays as-is

// ─── 3. Combined reporting ─────────────────────────────────────────────────────

console.log(`\nCEC mappings: ${cecMap.size}`);
console.log(`Compendium mappings: ${compMap.size}`);
console.log(`Article overrides (ambiguous): ${articleOverrides.size}`);
for (const [key, val] of articleOverrides) {
	console.log(`  override: "${key}" → "${val}"`);
}

// Combined slug map
const allMap = new Map([...cecMap, ...compMap]);

// Sort old slugs by length descending so longer slugs replace before their substrings
const sortedOld = [...allMap.keys()].sort((a, b) => b.length - a.length);

// ─── 4. Walk and rewrite JSON files ───────────────────────────────────────────

function walkDir(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walkDir(p));
		else if (entry.name.endsWith('.json')) out.push(p);
	}
	return out;
}

/**
 * Recursively walk a parsed JSON value, applying slug substitutions in-place.
 *
 * Strategy:
 *  - For string values that look like URL paths or slug references,
 *    apply the global map.
 *  - For the special ambiguous article case (je-crois-en-lesprit-saint),
 *    detect context via the parent key and apply the override.
 *
 * Returns the (potentially mutated) value.
 */
function walkValue(
	val: unknown,
	parentKey: string | null,
	grandparentKey: string | null,
	ancestors: unknown[]
): unknown {
	if (typeof val === 'string') {
		return applySlugSubs(val, parentKey, grandparentKey, ancestors);
	}
	if (Array.isArray(val)) {
		for (let i = 0; i < val.length; i++) {
			val[i] = walkValue(val[i], parentKey, null, [...ancestors, val]);
		}
		return val;
	}
	if (val !== null && typeof val === 'object') {
		const obj = val as Record<string, unknown>;
		for (const k of Object.keys(obj)) {
			obj[k] = walkValue(obj[k], k, parentKey, [...ancestors, obj]);
		}
		return obj;
	}
	return val;
}

/**
 * Apply slug substitutions to a single string value.
 *
 * For URL strings (start with /cec/ or /compendium/), replace path segments.
 * For known slug field names, replace the slug directly.
 * For search-index document IDs (h:slug#...), replace the slug part.
 */
function applySlugSubs(
	s: string,
	parentKey: string | null,
	grandparentKey: string | null,
	_ancestors: unknown[]
): string {
	// Detect if this looks like a URL path
	if (s.startsWith('/cec/') || s.startsWith('/compendium/')) {
		return replaceInUrl(s);
	}

	// Search-index document IDs: "h:chapterslug#heading-id"
	if (s.startsWith('h:')) {
		const hashIdx = s.indexOf('#');
		if (hashIdx > 0) {
			const chapPart = s.slice(2, hashIdx);
			const rest = s.slice(hashIdx);
			const newChap = allMap.get(chapPart) ?? chapPart;
			return `h:${newChap}${rest}`;
		}
	}

	// Slug fields: direct slug replacement with context-awareness
	if (
		parentKey === 'slug' ||
		parentKey === 'chapter_slug' ||
		parentKey === 'part_slug' ||
		parentKey === 'section_slug'
	) {
		// For article.slug, we need to detect if it's an article context
		// We handle this via the article overrides below; for now use global map
		const mapped = allMap.get(s);
		return mapped ?? s;
	}

	// Default: try to replace if it's an exact known old slug
	// (handles breadcrumb or other direct slug references)
	if (allMap.has(s)) {
		return allMap.get(s)!;
	}

	return s;
}

/**
 * Replace slug segments in a URL path, handling the ambiguous article case.
 *
 * URL structure for CEC:
 *   /cec/<partSlug>
 *   /cec/<partSlug>/<sectionSlug>
 *   /cec/<partSlug>/<sectionSlug>/<chapterSlug>
 *   /cec/<partSlug>/<sectionSlug>/<chapterSlug>/<articleSlug>
 *
 * For compendium:
 *   /compendium/<partSlug>
 *   /compendium/<partSlug>/<questionN>
 */
function replaceInUrl(url: string): string {
	if (url.startsWith('/cec/')) {
		const withoutPrefix = url.slice(5); // strip /cec/
		const segments = withoutPrefix.split('/');
		const newSegments = segments.map((seg, i) => {
			if (i === 2 && segments.length === 4) {
				// This is a chapter slug in a 4-segment path (part/section/chapter/article)
				return allMap.get(seg) ?? seg;
			}
			if (i === 3 && segments.length === 4) {
				// This is an article slug — check for override first
				const chapterOldSlug = segments[2]!;
				const overrideKey = `${chapterOldSlug}/${seg}`;
				if (articleOverrides.has(overrideKey)) {
					return articleOverrides.get(overrideKey)!;
				}
				return allMap.get(seg) ?? seg;
			}
			// For all other positions, just map normally
			return allMap.get(seg) ?? seg;
		});
		return '/cec/' + newSegments.join('/');
	}

	if (url.startsWith('/compendium/')) {
		const withoutPrefix = url.slice(12); // strip /compendium/
		const segments = withoutPrefix.split('/');
		const newSegments = segments.map((seg) => {
			// Only replace part slugs; leave question numbers as-is
			return compMap.get(seg) ?? seg;
		});
		return '/compendium/' + newSegments.join('/');
	}

	return url;
}

// Now process the paragraph-context files separately for the article slug override
// because in paragraph-context files, the "slug" field under "article" must map
// to the article new slug (not the chapter new slug).
function rewriteParagraphContext(obj: Record<string, unknown>): void {
	// obj has keys: part, section, chapter, article (optional)
	// Each has a "slug" field. We can determine context from the parent key.
	//
	// IMPORTANT: Read the chapter old slug BEFORE rewriting any slugs,
	// because the override key is built from old chapter slug + old article slug.
	const chapterOldSlug = (
		(obj['chapter'] as Record<string, unknown> | undefined)?.slug as string | undefined
	);

	for (const topKey of Object.keys(obj)) {
		const child = obj[topKey] as Record<string, unknown> | undefined;
		if (child && typeof child === 'object' && !Array.isArray(child)) {
			if (topKey === 'article' && child.slug) {
				const articleOldSlug = child.slug as string;
				const overrideKey = `${chapterOldSlug}/${articleOldSlug}`;
				if (articleOverrides.has(overrideKey)) {
					child.slug = articleOverrides.get(overrideKey)!;
				} else {
					child.slug = allMap.get(articleOldSlug) ?? articleOldSlug;
				}
			} else if (child.slug) {
				child.slug = allMap.get(child.slug as string) ?? child.slug;
			}
		}
	}
}

// Also handle structure.json article slugs in-place with the override
function rewriteStructureArticle(
	artObj: Record<string, unknown>,
	chapterOldSlug: string
): void {
	const artOldSlug = artObj.slug as string;
	const overrideKey = `${chapterOldSlug}/${artOldSlug}`;
	if (articleOverrides.has(overrideKey)) {
		artObj.slug = articleOverrides.get(overrideKey)!;
	} else {
		artObj.slug = allMap.get(artOldSlug) ?? artOldSlug;
	}
}

// Collect all JSON files to process (exclude glossaire, bible, concordance)
const allFiles = walkDir(DATA).filter((f) => {
	const rel = f.slice(DATA.length + 1);
	return (
		!rel.startsWith('glossaire/') &&
		!rel.startsWith('bible/') &&
		!rel.startsWith('concordance/')
	);
});

console.log(`\nProcessing ${allFiles.length} JSON files...`);

let editedCount = 0;

for (const filePath of allFiles) {
	const rel = filePath.slice(DATA.length + 1);
	const originalContent = readFileSync(filePath, 'utf8');

	// Quick pre-check: does this file contain any old slug?
	let maybeNeedsEdit = false;
	for (const oldSlug of sortedOld) {
		if (originalContent.includes(oldSlug)) {
			maybeNeedsEdit = true;
			break;
		}
	}
	// Also check article overrides
	if (!maybeNeedsEdit) {
		for (const key of articleOverrides.keys()) {
			const artOld = key.split('/')[1]!;
			if (originalContent.includes(artOld)) {
				maybeNeedsEdit = true;
				break;
			}
		}
	}
	if (!maybeNeedsEdit) continue;

	let parsed: unknown;
	try {
		parsed = JSON.parse(originalContent);
	} catch (e) {
		console.error(`[ERROR] Failed to parse ${filePath}: ${e}`);
		continue;
	}

	// Special handling for paragraph-context files
	if (rel.startsWith('cec/paragraph-context/')) {
		rewriteParagraphContext(parsed as Record<string, unknown>);
		const newContent = JSON.stringify(parsed, null, '\t');
		if (newContent !== originalContent) {
			writeFileSync(filePath, newContent);
			editedCount++;
		}
		continue;
	}

	// Special handling for structure.json: need context-aware article slug replacement
	if (rel === 'cec/structure.json' || rel === 'cec/structure-toc.json') {
		const structObj = parsed as Record<string, unknown>;
		for (const part of (structObj.parts as any[]) ?? []) {
			const partOldSlug = part.slug as string;
			part.slug = allMap.get(partOldSlug) ?? partOldSlug;
			for (const sec of (part.sections as any[]) ?? []) {
				const secOldSlug = sec.slug as string;
				sec.slug = allMap.get(secOldSlug) ?? secOldSlug;
				for (const chap of (sec.chapters as any[]) ?? []) {
					const chapOldSlug = chap.slug as string;
					chap.slug = allMap.get(chapOldSlug) ?? chapOldSlug;
					for (const art of (chap.articles as any[]) ?? []) {
						rewriteStructureArticle(art, chapOldSlug);
					}
				}
				for (const art of (sec.articles_direct as any[]) ?? []) {
					const artOldSlug = art.slug as string;
					art.slug = allMap.get(artOldSlug) ?? artOldSlug;
				}
			}
		}
		// For structure-toc, also rewrite prev/next hrefs in all nested objects
		// by doing a full walk of the remaining string fields
		walkValue(structObj, null, null, []);
		const newContent = JSON.stringify(structObj, null, '\t');
		if (newContent !== originalContent) {
			writeFileSync(filePath, newContent);
			editedCount++;
		}
		continue;
	}

	// Special handling for chapter files: the top-level `slug` is a chapter slug,
	// `articles[i].slug` are article slugs, prev/next are hrefs
	if (rel.startsWith('cec/chapters/') || rel.startsWith('cec/chapters-full/')) {
		const chapObj = parsed as Record<string, unknown>;
		const chapOldSlug = chapObj.slug as string;

		// Rewrite chapter-level slug fields
		chapObj.slug = allMap.get(chapOldSlug) ?? chapOldSlug;
		if (chapObj.part_slug) chapObj.part_slug = allMap.get(chapObj.part_slug as string) ?? chapObj.part_slug;
		if (chapObj.section_slug) chapObj.section_slug = allMap.get(chapObj.section_slug as string) ?? chapObj.section_slug;

		// Rewrite article slugs in the articles array with override awareness
		for (const art of (chapObj.articles as any[]) ?? []) {
			rewriteStructureArticle(art, chapOldSlug);
		}

		// Walk the rest (prev/next hrefs, etc.) with generic walker
		walkValue(chapObj, null, null, []);

		const newContent = JSON.stringify(chapObj, null, '\t');
		if (newContent !== originalContent) {
			writeFileSync(filePath, newContent);
			editedCount++;
		}
		continue;
	}

	// For all other files (headings.json, q-ranges.json, compendium parts, search-index, etc.),
	// use the generic JSON walker
	walkValue(parsed, null, null, []);
	const newContent = JSON.stringify(parsed, null, '\t');
	if (newContent !== originalContent) {
		writeFileSync(filePath, newContent);
		editedCount++;
	}
}

console.log(`\nRewrote ${editedCount} files`);

// ─── 5. Rename files ──────────────────────────────────────────────────────────

function renameSlugFiles(dir: string, map: Map<string, string>): void {
	if (!statSync(dir).isDirectory()) return;
	for (const name of readdirSync(dir)) {
		if (!name.endsWith('.json')) continue;
		const baseSlug = name.slice(0, -5);
		if (map.has(baseSlug)) {
			const newName = map.get(baseSlug)! + '.json';
			if (newName !== name) {
				renameSync(join(dir, name), join(dir, newName));
				console.log(`renamed: ${name} → ${newName}`);
			}
		}
	}
}

console.log('\nRenaming chapter files...');
renameSlugFiles(`${DATA}/cec/chapters`, cecMap);
renameSlugFiles(`${DATA}/cec/chapters-full`, cecMap);
console.log('\nRenaming compendium part files...');
renameSlugFiles(`${DATA}/compendium/parts`, compMap);

console.log('\nDone.');
