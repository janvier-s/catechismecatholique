<script lang="ts">
	import { page } from '$app/state';
	import { sidebarOpen } from '$lib/stores/sidebar';
	import { loadStructure, loadChapter, loadParagraphContexts } from '$lib/data/loaders';
	import type { Chapter, ParagraphContext } from '$lib/data/types';
	import SidebarItem from './SidebarItem.svelte';

	type Heading = { id: string; title: string; paragraph_start: number };
	type Article = {
		slug: string;
		title: string;
		number?: number;
		paragraphs: number[];
		headings: Heading[];
	};
	type Chap = {
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
		chapters: Chap[];
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

	let structure: { parts: Part[] } | null = $state(null);
	let activeChapter: Chapter | null = $state(null);
	let paragraphContexts: Record<number, ParagraphContext> | null = $state(null);

	$effect(() => {
		(async () => {
			structure = (await loadStructure()) as { parts: Part[] };
		})();
	});

	$effect(() => {
		(async () => {
			paragraphContexts = await loadParagraphContexts();
		})();
	});

	// Detect a paragraph URL like /ccc/{n} or /ccc/{n}-{m} → derive the deepest
	// container the paragraph belongs to (article > chapter > section > part)
	// so the sidebar can highlight it AND auto-load the chapter detail.
	const activeParagraph = $derived.by(() => {
		const m = page.url.pathname.match(/^\/ccc\/(\d+)(?:-\d+)?$/);
		return m ? parseInt(m[1]!, 10) : null;
	});

	const activeContext: ParagraphContext | null = $derived(
		activeParagraph !== null && paragraphContexts
			? (paragraphContexts[activeParagraph] ?? null)
			: null
	);

	// The href of the deepest item the current page corresponds to.
	// Used for sidebar item highlighting (passed via context to SidebarItem).
	function deepestHref(c: ParagraphContext): string {
		if (c.article && c.section && c.chapter) {
			return `/ccc/${c.part.slug}/${c.section.slug}/${c.chapter.slug}/${c.article.slug}`;
		}
		if (c.chapter && c.section) {
			return `/ccc/${c.part.slug}/${c.section.slug}/${c.chapter.slug}`;
		}
		if (c.section) {
			return `/ccc/${c.part.slug}/${c.section.slug}`;
		}
		return `/ccc/${c.part.slug}`;
	}

	const activeHref: string = $derived.by(() => {
		if (activeParagraph === null) return page.url.pathname;
		const c = activeContext;
		if (!c) return page.url.pathname;
		return deepestHref(c);
	});

	// Load detailed chapter data when on a chapter URL OR when on a paragraph URL
	// whose context places it in a chapter — so we can expand headings/en_brefs.
	$effect(() => {
		const m = page.url.pathname.match(/^\/ccc\/[^/]+\/[^/]+\/([^/]+)/);
		const directSlug = m ? m[1]! : null;
		const c = activeContext as ParagraphContext | null;
		const ctxSlug: string | null = c && c.chapter ? c.chapter.slug : null;
		const slug = directSlug ?? ctxSlug;
		if (!slug) {
			activeChapter = null;
			return;
		}
		(async () => {
			try {
				activeChapter = await loadChapter(slug);
			} catch {
				activeChapter = null;
			}
		})();
	});

	function chapterChildren(ch: Chap, partSlug: string, sectionSlug: string): Item[] {
		const baseHref = `/ccc/${partSlug}/${sectionSlug}/${ch.slug}`;
		const out: Item[] = [];
		const detail = activeChapter && activeChapter.slug === ch.slug ? activeChapter : null;

		if (detail) {
			for (const a of detail.articles) {
				const articleHref = `${baseHref}/${a.slug}`;
				const articleChildren: Item[] = a.headings.map((h) => ({
					title: h.title,
					href: `${articleHref}#${h.id}`
				}));
				// En Bref blocks whose first paragraph falls within this article go INSIDE it
				const articleParas = a.paragraphs;
				const articleMin = articleParas.length > 0 ? articleParas[0]! : 0;
				const articleMax = articleParas.length > 0 ? articleParas[articleParas.length - 1]! : 0;
				for (const block of detail.en_brefs ?? []) {
					if (block.paragraphs.length === 0) continue;
					const firstP = block.paragraphs[0]!;
					if (firstP >= articleMin && firstP <= articleMax) {
						articleChildren.push({
							title: 'En Bref',
							href: `${baseHref}#en-bref-${firstP}`
						});
					}
				}
				out.push({
					title: a.title,
					number: a.number,
					typeLabel: 'Article',
					href: articleHref,
					children: articleChildren.length > 0 ? articleChildren : undefined
				});
			}
			if (detail.articles.length === 0) {
				for (const h of detail.headings) {
					out.push({ title: h.title, href: `${baseHref}#${h.id}` });
				}
				// Chapter-level en_brefs (when no articles exist)
				for (const block of detail.en_brefs ?? []) {
					if (block.paragraphs.length === 0) continue;
					const firstP = block.paragraphs[0];
					out.push({ title: 'En Bref', href: `${baseHref}#en-bref-${firstP}` });
				}
			} else {
				// Any en_brefs not assigned to an article (shouldn't happen with new logic, but
				// fall back to chapter-level if their first paragraph isn't in any article)
				const inAnyArticle = (firstP: number) =>
					detail.articles.some((a) => {
						const ps = a.paragraphs;
						return ps.length > 0 && firstP >= ps[0]! && firstP <= ps[ps.length - 1]!;
					});
				for (const block of detail.en_brefs ?? []) {
					if (block.paragraphs.length === 0) continue;
					const firstP = block.paragraphs[0]!;
					if (!inAnyArticle(firstP)) {
						out.push({ title: 'En Bref', href: `${baseHref}#en-bref-${firstP}` });
					}
				}
			}
		} else {
			for (const a of ch.articles) {
				out.push({
					title: a.title,
					number: a.number,
					typeLabel: 'Article',
					href: `${baseHref}/${a.slug}`
				});
			}
		}
		return out;
	}

	const tree: Item[] = $derived.by(() => {
		if (!structure) return [];
		return structure.parts.map((part): Item => {
			if (part.prologue) {
				return { title: part.title, href: `/ccc/prologue` };
			}
			return {
				title: part.title,
				number: part.number,
				typeLabel: 'Partie',
				href: `/ccc/${part.slug}`,
				children: part.sections.map(
					(section): Item => ({
						title: section.title,
						number: section.number,
						typeLabel: 'Section',
						href: `/ccc/${part.slug}/${section.slug}`,
						children: [
							...section.chapters.map((chapter): Item => {
								const children = chapterChildren(chapter, part.slug, section.slug);
								return {
									title: chapter.title,
									number: chapter.number,
									typeLabel: 'Chapitre',
									href: `/ccc/${part.slug}/${section.slug}/${chapter.slug}`,
									children: children.length > 0 ? children : undefined
								};
							}),
							...(section.articles_direct ?? []).map(
								(article): Item => ({
									title: article.title,
									number: article.number,
									typeLabel: 'Article',
									href: `/ccc/${article.paragraphs[0]}-${article.paragraphs[article.paragraphs.length - 1]}`
								})
							)
						]
					})
				)
			};
		});
	});
</script>

{#if $sidebarOpen}
	<aside
		class="hidden lg:flex sticky top-[80px] h-[calc(100vh-80px)] w-[280px] bg-panel border-r border-border z-20 flex-none flex-col"
	>
		<div class="flex items-center justify-between p-2 border-b border-border">
			<span class="font-ui text-xs uppercase tracking-wider text-muted ml-2">Sommaire</span>
			<button
				type="button"
				onclick={() => sidebarOpen.set(false)}
				class="w-7 h-7 flex items-center justify-center rounded hover:bg-accent/10 text-muted hover:text-accent"
				aria-label="Fermer la barre latérale"
				title="Fermer"
			>
				◧
			</button>
		</div>
		<nav
			class="flex-1 overflow-y-auto p-3 font-ui styled-scroll"
			aria-label="Plan du Catéchisme"
			style="scrollbar-gutter: stable;"
		>
			<ul class="space-y-0.5">
				{#each tree as item (item.href)}
					<SidebarItem {item} {activeHref} />
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
	.styled-scroll::-webkit-scrollbar {
		width: 7px;
		-webkit-appearance: none;
	}
	.styled-scroll::-webkit-scrollbar-track {
		background: color-mix(in srgb, var(--color-border) 40%, transparent);
	}
	.styled-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		border-radius: 4px;
		border: 1px solid transparent;
		background-clip: padding-box;
		min-height: 40px;
	}
	.styled-scroll::-webkit-scrollbar-thumb:hover {
		background: color-mix(in srgb, var(--color-accent) 70%, transparent);
		background-clip: padding-box;
	}
</style>
