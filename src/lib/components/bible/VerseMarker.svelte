<script lang="ts">
	import { openPanel } from '$lib/stores/studyPanel';
	import { pluralFr } from '$lib/utils/i18n';
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
		e.stopPropagation();
		openPanel(
			{ kind: 'verse', verseUsfx: bookUsfx, verseChapter: chapter, verseVerse: verse },
			'bible-verse'
		);
	}

	const verb = $derived(count === 1 ? 'cite' : 'citent');
	const noun = $derived(pluralFr(count, 'paragraphe'));
</script>

<button
	type="button"
	class="cec-pill"
	aria-label="{count} {noun} du Catéchisme {verb} {bookSlug} {chapter}, {verse}"
	title="{count} {noun} du Catéchisme {verb} ce verset"
	onclick={onClick}
>
	<span class="tabular-nums">{count}§</span>
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
