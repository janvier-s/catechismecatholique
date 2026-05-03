<script lang="ts">
	import { openPanel } from '$lib/stores/studyPanel';
	let {
		bookSlug,
		bookUsfx,
		chapter,
		verse,
		count
	}: {
		bookSlug: string;
		bookUsfx: string;
		chapter: number;
		verse: number;
		count: number;
	} = $props();

	function onClick(e: MouseEvent) {
		e.preventDefault();
		openPanel(
			{ paragraph: 0, verseUsfx: bookUsfx, verseChapter: chapter, verseVerse: verse },
			'bible-verse'
		);
	}
</script>

<button
	type="button"
	class="cec-pill"
	aria-label="{count} paragraphe(s) du Catéchisme citent {bookSlug} {chapter}, {verse}"
	title="{count} paragraphe(s) du Catéchisme citent ce verset"
	onclick={onClick}
>
	CEC
</button>

<style>
	.cec-pill {
		display: inline-flex;
		align-items: baseline;
		gap: 1px;
		font-family: var(--font-ui);
		font-size: 0.65em;
		font-weight: 600;
		line-height: 1;
		padding: 1px 4px;
		margin: 0 2px;
		border-radius: 3px;
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		vertical-align: 0.2em;
		cursor: pointer;
		border: 0;
	}
	.cec-pill:hover {
		background: color-mix(in srgb, var(--color-accent) 22%, transparent);
	}
</style>
