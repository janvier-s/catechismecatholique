<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadBibleVerseIndex } from '$lib/data/loaders';
	import { BOOKS } from '$lib/utils/bibleBookSlug';
	import { pluralFr } from '$lib/utils/i18n';
	import ParagraphList from './ParagraphList.svelte';

	let paragraphs: number[] = $state([]);
	let bookFrenchName = $state('');
	let label = $state('');

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'verse') return;
		(async () => {
			const idx = await loadBibleVerseIndex();
			paragraphs = idx[ctx.verseUsfx]?.[String(ctx.verseChapter)]?.[String(ctx.verseVerse)] ?? [];
			const book = BOOKS.find((b) => b.usfx === ctx.verseUsfx);
			bookFrenchName = book?.frenchName ?? ctx.verseUsfx;
			label = `${bookFrenchName} ${ctx.verseChapter}, ${ctx.verseVerse}`;
		})();
	});
</script>

<div class="font-ui text-xs text-muted mb-3">
	{paragraphs.length}
	{pluralFr(paragraphs.length, 'paragraphe')} du Catéchisme {paragraphs.length === 1
		? 'cite'
		: 'citent'}
	<span class="font-semibold text-accent">{label}</span>
</div>
<ParagraphList numbers={paragraphs} emptyMessage="Aucune citation pour ce verset." />
