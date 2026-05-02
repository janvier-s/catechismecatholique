<script lang="ts">
	import type { Chapter } from '$lib/data/types';
	import { activeHeadingId } from '$lib/stores/outline';
	let { chapter }: { chapter: Chapter } = $props();

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
		for (const h of chapter.headings) {
			const el = document.getElementById(h.id);
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	});
</script>

<nav aria-label="Plan du chapitre" class="font-ui text-sm">
	<ul class="space-y-1">
		{#each chapter.headings as h (h.id)}
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
