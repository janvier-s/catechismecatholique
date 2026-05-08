<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { loadNclBook } from '$lib/data/loaders';
	import { bookBySlug } from '$lib/utils/bibleBookSlug';
	import { parseTrentBibleRef } from '$lib/utils/linkifyRefs';
	import type { NclBible } from '$lib/data/types';
	import type { TrentFootnote } from '$lib/stores/studyPanel';

	type ResolvedFootnote = {
		n: number;
		text: string;
		// When the footnote text parses as a Bible ref, render the verse text;
		// otherwise just show the raw text (patristic / council refs).
		ref?: {
			slug: string;
			frenchName: string;
			chapter: number;
			verse?: number;
			verseText: string;
		};
	};

	let resolved: ResolvedFootnote[] = $state([]);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'trent-paragraph') {
			resolved = [];
			return;
		}
		const fns = ctx.footnotes;

		// Eagerly fetch every NCL book referenced by parseable footnotes so
		// we can render verse text inline. Books are cached; refetching is
		// cheap, but we still de-duplicate to avoid redundant Promise churn.
		const usfxes = new Set<string>();
		const parsed: { fn: TrentFootnote; ref: ReturnType<typeof parseTrentBibleRef> }[] = [];
		for (const fn of fns) {
			const ref = parseTrentBibleRef(fn.text);
			parsed.push({ fn, ref });
			if (ref) {
				const book = bookBySlug(ref.slug);
				if (book) usfxes.add(book.usfx);
			}
		}

		(async () => {
			const usfxList = Array.from(usfxes);
			const books = await Promise.all(usfxList.map((u) => loadNclBook(u)));
			const bible: NclBible = {};
			for (let i = 0; i < usfxList.length; i++) {
				const data = books[i];
				if (data) bible[usfxList[i]!] = data;
			}
			resolved = parsed.map(({ fn, ref }): ResolvedFootnote => {
				if (!ref) return { n: fn.n, text: fn.text };
				const book = bookBySlug(ref.slug);
				if (!book) return { n: fn.n, text: fn.text };
				const chData = bible[book.usfx]?.[String(ref.chapter)];
				const verseText = ref.verse !== undefined ? (chData?.[String(ref.verse)] ?? '') : '';
				return {
					n: fn.n,
					text: fn.text,
					ref: {
						slug: ref.slug,
						frenchName: book.frenchName,
						chapter: ref.chapter,
						verse: ref.verse,
						verseText
					}
				};
			});
		})();
	});
</script>

<div class="font-ui text-sm">
	{#if resolved.length === 0}
		<p class="text-muted italic">Aucune note pour ce paragraphe.</p>
	{:else}
		<ul class="space-y-3 sm:space-y-4">
			{#each resolved as r (r.n)}
				<li class="trent-note">
					<div class="flex items-baseline gap-1.5">
						<sup class="ref-marker">{r.n}</sup>
						{#if r.ref}
							<a
								href={r.ref.verse !== undefined
									? `/bible/${r.ref.slug}/${r.ref.chapter}/${r.ref.verse}`
									: `/bible/${r.ref.slug}/${r.ref.chapter}`}
								class="font-semibold text-accent hover:underline"
							>
								{r.ref.frenchName}
								{r.ref.chapter}{#if r.ref.verse !== undefined},
									{r.ref.verse}{/if}
							</a>
						{:else}
							<span class="non-bible">{r.text}</span>
						{/if}
					</div>
					{#if r.ref}
						{#if r.ref.verse === undefined}
							<a
								href={`/bible/${r.ref.slug}/${r.ref.chapter}`}
								target="_blank"
								rel="noopener noreferrer"
								class="mt-1 inline-block text-[13px] text-accent hover:underline"
							>
								Lire le chapitre entier&nbsp;→
							</a>
						{:else if r.ref.verseText}
							<p class="mt-1.5 verse-text font-body">{r.ref.verseText}</p>
						{:else}
							<p class="mt-1 text-xs text-muted italic">Verset non disponible.</p>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.trent-note {
		padding: 0.25rem 0.5rem;
		margin: -0.25rem -0.5rem;
	}
	.ref-marker {
		color: var(--color-muted);
		font-weight: 500;
		font-size: 0.75em;
	}
	.non-bible {
		color: var(--color-fg);
		font-size: 0.92em;
		line-height: 1.5;
	}
	.verse-text {
		font-size: 15px;
		line-height: 1.65;
		color: var(--color-fg);
		opacity: 0.92;
	}
</style>
