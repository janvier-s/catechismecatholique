<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadBibleVerseIndex, loadConcordanceVerseIndex } from '$lib/data/loaders';
	import { BOOKS } from '$lib/utils/bibleBookSlug';
	import ParagraphList from './ParagraphList.svelte';

	let paragraphs: number[] = $state([]);
	let bookFrenchName = $state('');
	let label = $state('');
	let source = $state<'ccc' | 'concordance'>('ccc');

	// Per-run token: increments on each effect entry. Async closures
	// check this before assigning so a stale load can't clobber a newer one.
	let runId = 0;

	$effect(() => {
		const ctx = $studyPanel.context;
		if (!ctx?.verseUsfx) return;
		source = ctx.verseSource ?? 'ccc';
		const myRun = ++runId;
		(async () => {
			const idx =
				source === 'concordance' ? await loadConcordanceVerseIndex() : await loadBibleVerseIndex();
			if (myRun !== runId) return; // a newer effect run started; abort stale write
			paragraphs = idx[ctx.verseUsfx!]?.[String(ctx.verseChapter)]?.[String(ctx.verseVerse)] ?? [];
			const book = BOOKS.find((b) => b.usfx === ctx.verseUsfx);
			bookFrenchName = book?.frenchName ?? ctx.verseUsfx!;
			label = `${bookFrenchName} ${ctx.verseChapter}, ${ctx.verseVerse}`;
		})();
	});

	const intro = $derived(
		source === 'concordance'
			? `${paragraphs.length} renvoi(s) de la concordance pour`
			: `${paragraphs.length} paragraphe(s) du Catéchisme citent`
	);
	const empty = $derived(
		source === 'concordance' ? 'Aucun renvoi pour ce verset.' : 'Aucune citation pour ce verset.'
	);
</script>

<div class="font-ui text-xs text-muted mb-3">
	{intro}
	<span class="font-semibold text-accent">{label}</span>
</div>
<ParagraphList numbers={paragraphs} emptyMessage={empty} />
