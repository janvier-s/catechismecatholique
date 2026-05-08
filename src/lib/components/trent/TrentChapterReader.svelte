<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import type { TrentChapterFile, TrentSectionFile, TrentFootnote } from '$lib/data/types';
	import BreadcrumbRail from '$lib/components/ui/BreadcrumbRail.svelte';
	import NavCard from '$lib/components/ui/NavCard.svelte';
	import { scrollSpy } from '$lib/utils/scrollSpy';
	import { get } from 'svelte/store';
	import { prefs } from '$lib/stores/prefs';
	import { getFontById } from '$lib/data/fonts';
	import { studyPanel, openPanel, closePanel } from '$lib/stores/studyPanel';
	import { parseTrentBibleRef } from '$lib/utils/linkifyRefs';

	let { chapter, sections }: { chapter: TrentChapterFile; sections: TrentSectionFile[] } = $props();

	const readerFont = $derived(getFontById($prefs.fontFamily));

	// Split "Part title : Main title" at the first " : "
	const colonIdx = $derived(chapter.title.indexOf(' : '));
	const chapterSubtitle = $derived(colonIdx > 0 ? chapter.title.slice(0, colonIdx) : undefined);
	const chapterMainTitle = $derived(
		colonIdx > 0 ? chapter.title.slice(colonIdx + 3) : chapter.title
	);

	function processHtml(html: string, footnotes: TrentFootnote[]): string {
		const fnMap = new Map(footnotes.map((f) => [f.n, f.text]));
		return html.replace(/<sup class="trentRef" data-n="(\d+)">\d+<\/sup>/g, (_, nStr: string) => {
			const n = parseInt(nStr, 10);
			const ref = parseTrentBibleRef(fnMap.get(n) ?? '');
			if (!ref) return `<sup class="trent-fn-marker" data-n="${n}">${n}</sup>`;
			const dataVerse = ref.verse !== undefined ? ` data-verse="${ref.verse}"` : '';
			return `<sup class="trent-fn-marker" data-n="${n}" data-slug="${ref.slug}" data-chapter="${ref.chapter}"${dataVerse}>${n}</sup>`;
		});
	}

	function footnotesForParagraph(
		paragraphHtml: string,
		footnotes: TrentFootnote[]
	): TrentFootnote[] {
		const nums = new SvelteSet<number>();
		const re = /data-n="(\d+)"/g;
		let m;
		while ((m = re.exec(paragraphHtml)) !== null) nums.add(parseInt(m[1]!, 10));
		return footnotes.filter((fn) => nums.has(fn.n));
	}

	function onParagraphClick(p: { number: number; html: string }, footnotes: TrentFootnote[]) {
		const s = get(studyPanel);
		const fns = footnotesForParagraph(p.html, footnotes);
		if (s.open && s.context?.kind === 'trent-paragraph' && s.context.paragraph === p.number) {
			closePanel();
			return;
		}
		if (fns.length === 0) return;
		openPanel({ kind: 'trent-paragraph', paragraph: p.number, footnotes: fns }, 'trent-notes');
	}

	const NAV_LABELS = {
		prev: { section: '← Section précédente', chapter: '← Chapitre précédent' },
		next: { section: 'Section suivante →', chapter: 'Chapitre suivant →' }
	} as const;
</script>

<main
	class="mx-auto max-w-reader px-6 max-md:px-0 py-10"
	data-corpus="trent"
	style:font-family={readerFont?.stack ?? undefined}
	use:scrollSpy
>
	<header class="mb-8">
		<BreadcrumbRail
			crumbs={[
				{ href: '/trente', title: 'Catéchisme de Trente' },
				{
					href: `/trente`,
					kicker: chapter.part_title,
					title: chapter.title
				}
			]}
		/>
		<p class="font-ui text-sm uppercase tracking-wider text-muted">Chapitre {chapter.number}</p>
		{#if chapterSubtitle}
			<p class="font-ui text-base text-subtle mt-0.5">{chapterSubtitle}</p>
		{/if}
		<h1 class="font-heading text-4xl font-semibold mt-1 text-heading">{chapterMainTitle}</h1>
	</header>

	{#each sections as section (section.slug)}
		<section id="s-{section.slug}" class="mb-12">
			{#if sections.length > 1}
				<h2
					class="font-heading text-2xl font-semibold mt-6 mb-4 text-heading"
					id="h-{section.slug}"
				>
					{section.title}
				</h2>
			{/if}

			{#each section.paragraphs as p (p.number)}
				{@const processedHtml = processHtml(p.html, section.footnotes)}
				{@const hasNotes = /data-n="\d+"/.test(processedHtml)}
				<article class="mb-8 trent-paragraph" id="p-{p.number}">
					<div class="paragraph-grid">
						<div class="number-wrap flex-none w-12 flex items-center justify-end pt-1">
							<button
								type="button"
								class="number-col font-ui font-semibold tabular-nums"
								class:has-notes={hasNotes}
								class:no-notes={!hasNotes}
								onclick={() => onParagraphClick(p, section.footnotes)}
								aria-label={hasNotes
									? `Ouvrir les notes du paragraphe ${p.number}`
									: `Paragraphe ${p.number} — aucune note`}
							>
								{p.number}
							</button>
						</div>
						<div class="content-col">
							<div class="prose-paragraph" data-paragraph={p.number}>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html processedHtml}
							</div>
						</div>
					</div>
				</article>
			{/each}
		</section>
	{/each}

	<nav
		class="mt-16 pt-6 border-t border-border flex items-stretch justify-between gap-6 font-ui"
		aria-label="Chapitre précédent ou suivant"
	>
		{#if chapter.prev}
			<NavCard
				direction="prev"
				href={chapter.prev.href}
				eyebrow={NAV_LABELS.prev[chapter.prev.kind]}
				title={chapter.prev.title}
			/>
		{:else}
			<span class="nav-spacer"></span>
		{/if}
		{#if chapter.next}
			<NavCard
				direction="next"
				href={chapter.next.href}
				eyebrow={NAV_LABELS.next[chapter.next.kind]}
				title={chapter.next.title}
			/>
		{:else}
			<span class="nav-spacer"></span>
		{/if}
	</nav>
</main>

<style>
	.paragraph-grid {
		display: flex;
		gap: 1rem;
	}

	.number-wrap {
		align-self: flex-start;
	}

	.number-col.has-notes {
		color: var(--color-accent);
	}
	.number-col.has-notes:hover {
		text-decoration: underline;
	}
	.number-col.no-notes {
		color: var(--color-muted);
		cursor: default;
	}

	.content-col {
		flex: 1;
		min-width: 0;
	}

	.content-col :global(.prose-paragraph p) {
		margin-bottom: 0.85em;
	}
	.content-col :global(.prose-paragraph p:last-child) {
		margin-bottom: 0;
	}

	.content-col :global(sup.trent-fn-marker) {
		color: var(--color-accent);
		font-size: 0.7em;
		vertical-align: super;
		line-height: 0;
		cursor: pointer;
		transition: opacity 120ms ease;
	}
	.content-col :global(sup.trent-fn-marker:hover) {
		opacity: 0.7;
	}

	@media (max-width: 640px) {
		.paragraph-grid {
			flex-direction: column;
			gap: 0.25rem;
		}
		.number-wrap {
			width: auto;
			justify-content: flex-start;
			padding-top: 0;
		}
		.content-col {
			font-size: 1rem;
			line-height: 1.6;
		}
	}

	.nav-spacer {
		flex: 1;
	}
</style>
