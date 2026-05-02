<script lang="ts">
	import type { Chapter } from '$lib/data/types';
	import { activeHeadingId } from '$lib/stores/outline';
	let { chapter }: { chapter: Chapter } = $props();

	type OutlineItem =
		| { kind: 'article'; id: string; title: string; number?: number; paragraph_start: number }
		| { kind: 'heading'; id: string; title: string; level: number; paragraph_start: number; under_article: boolean };

	const items: OutlineItem[] = (() => {
		const out: OutlineItem[] = [];
		// Chapter-level headings (no article wrapping them)
		for (const h of chapter.headings) {
			out.push({
				kind: 'heading',
				id: h.id,
				title: h.title,
				level: h.level,
				paragraph_start: h.paragraph_start,
				under_article: false
			});
		}
		// Articles + their headings (indented under the article)
		for (const a of chapter.articles) {
			if (a.paragraphs.length === 0) continue;
			out.push({
				kind: 'article',
				id: a.slug,
				title: a.title,
				number: a.number,
				paragraph_start: a.paragraphs[0]!
			});
			for (const h of a.headings) {
				out.push({
					kind: 'heading',
					id: h.id,
					title: h.title,
					level: h.level,
					paragraph_start: h.paragraph_start,
					under_article: true
				});
			}
		}
		return out.sort((a, b) => a.paragraph_start - b.paragraph_start);
	})();

	$effect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries.filter((e) => e.isIntersecting);
				if (visible.length > 0 && visible[0]) {
					$activeHeadingId = visible[0].target.id;
				}
			},
			{ rootMargin: '-20% 0px -75% 0px', threshold: 0 }
		);
		for (const item of items) {
			const el = document.getElementById(item.id);
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	});
</script>

<nav aria-label="Plan du chapitre" class="font-ui text-sm">
	<ul class="space-y-0.5">
		{#each items as item (item.id)}
			<li>
				<a
					href="#{item.id}"
					class="block py-1 transition-colors text-xs leading-snug border-l-2 pl-3"
					class:border-accent={$activeHeadingId === item.id}
					class:font-semibold={$activeHeadingId === item.id}
					class:text-accent={$activeHeadingId === item.id}
					class:border-transparent={$activeHeadingId !== item.id}
					class:text-muted={$activeHeadingId !== item.id}
				>
					{#if item.kind === 'article'}
						<span
							class="block uppercase tracking-wider font-bold"
							class:text-foreground={$activeHeadingId !== item.id}
						>
							{item.number ? `Art. ${item.number} ·` : ''}
							{item.title}
						</span>
					{:else if item.under_article}
						<span class="block pl-3" class:pl-6={item.level === 3}>{item.title}</span>
					{:else}
						<span class:pl-3={item.level === 3}>{item.title}</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
</nav>
