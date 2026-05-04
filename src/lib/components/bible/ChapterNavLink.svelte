<script lang="ts">
	import BookNavChevron from './BookNavChevron.svelte';

	let {
		href,
		direction,
		chapter
	}: {
		href: string;
		direction: 'prev' | 'next';
		chapter: number;
	} = $props();
</script>

<div class="relative group/chapnav shrink-0">
	<a
		{href}
		class="text-subtle hover:text-accent transition-colors block p-2 -m-2"
		aria-label="Chapitre {direction === 'prev' ? 'précédent' : 'suivant'}"
	>
		<BookNavChevron {direction} double={false} />
	</a>
	<div
		class="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-[5px] px-[6px] py-[3px] bg-foreground text-background text-[11px] rounded-[3px] whitespace-nowrap opacity-0 group-hover/chapnav:opacity-100 transition-opacity z-50"
		style="transition-delay: 150ms;"
	>
		Chapitre {chapter}
	</div>
</div>
