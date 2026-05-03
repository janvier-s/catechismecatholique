<script lang="ts">
	import { openPanel } from '$lib/stores/studyPanel';
	let {
		bookSlug,
		bookUsfx,
		chapter,
		verse,
		count,
		variant = 'ccc'
	}: {
		bookSlug: string;
		bookUsfx: string;
		chapter: number;
		verse: number;
		count: number;
		variant?: 'ccc' | 'concordance';
	} = $props();

	const label = $derived(
		variant === 'concordance'
			? `${count} renvoi(s) de la concordance pour ${bookSlug} ${chapter}, ${verse}`
			: `${count} paragraphe(s) du Catéchisme citent ${bookSlug} ${chapter}, ${verse}`
	);

	const title = $derived(
		variant === 'concordance'
			? `${count} renvoi(s) de la concordance`
			: `${count} paragraphe(s) du Catéchisme citent ce verset`
	);

	function onClick(e: MouseEvent) {
		e.preventDefault();
		openPanel(
			{
				paragraph: 0,
				verseUsfx: bookUsfx,
				verseChapter: chapter,
				verseVerse: verse,
				verseSource: variant
			},
			'bible-verse'
		);
	}
</script>

<button
	type="button"
	class="cec-pill"
	class:cec-pill--concordance={variant === 'concordance'}
	aria-label={label}
	{title}
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
	.cec-pill--concordance {
		color: var(--color-muted);
		background: transparent;
		border: 1px dotted color-mix(in srgb, var(--color-muted) 60%, transparent);
		padding: 0 3px;
		font-weight: 500;
	}
	.cec-pill--concordance:hover {
		background: color-mix(in srgb, var(--color-muted) 8%, transparent);
		border-color: var(--color-muted);
	}
</style>
