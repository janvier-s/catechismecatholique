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
					children: part.sections.map(
						(section): Item => ({
							title: section.title,
							number: section.number,
							typeLabel: 'Section',
							href: `/ccc/${part.slug}/${section.slug}`,
							children: [
								...section.chapters.map(
									(chapter): Item => ({
										title: chapter.title,
										number: chapter.number,
										typeLabel: 'Chapitre',
										href: `/ccc/${part.slug}/${section.slug}/${chapter.slug}`,
										children: chapter.articles.map(
											(article): Item => ({
												title: article.title,
												number: article.number,
												typeLabel: 'Article',
												href: `/ccc/${part.slug}/${section.slug}/${chapter.slug}/${article.slug}`
											})
										)
									})
								),
								...(section.articles_direct ?? []).map((article): Item => {
									const first = article.paragraphs[0];
									const last = article.paragraphs[article.paragraphs.length - 1];
									return {
										title: article.title,
										number: article.number,
										typeLabel: 'Article',
										href: `/ccc/${first}-${last}`
									};
								})
							]
						})
					)
				};
			});
		})();
	});
</script>

{#if $sidebarOpen}
	<aside
		class="hidden lg:block sticky top-[80px] h-[calc(100vh-80px)] w-[280px] bg-panel border-r border-border overflow-y-auto z-20 styled-scroll flex-none"
	>
		<nav class="p-3 font-ui" aria-label="Plan du Catéchisme">
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
