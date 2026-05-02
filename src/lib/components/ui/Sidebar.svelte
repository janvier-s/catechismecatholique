<script lang="ts">
	import { page } from '$app/state';
	import { sidebarOpen } from '$lib/stores/sidebar';
	import { loadStructure, loadChapter } from '$lib/data/loaders';
	import type { Chapter } from '$lib/data/types';
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

	$effect(() => {
		(async () => {
			structure = (await loadStructure()) as { parts: Part[] };
		})();
	});

	// Load detailed chapter data when on a chapter URL — gives us headings/en_brefs
	// to expand inside the active chapter (replacing the old ChapterOutline).
	$effect(() => {
		const m = page.url.pathname.match(/^\/ccc\/[^/]+\/[^/]+\/([^/]+)/);
		if (!m) {
			activeChapter = null;
			return;
		}
		const slug = m[1]!;
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
			}
			for (const block of detail.en_brefs ?? []) {
				if (block.paragraphs.length === 0) continue;
				const firstP = block.paragraphs[0];
				out.push({ title: 'En Bref', href: `${baseHref}#en-bref-${firstP}` });
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
					<SidebarItem {item} />
				{/each}
			</ul>
		</nav>
	</aside>
{/if}

<style>
	.styled-scroll {
		scrollbar-width: thin;
	}
	.styled-scroll::-webkit-scrollbar {
		width: 6px;
	}
	.styled-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		border-radius: 3px;
	}
</style>
