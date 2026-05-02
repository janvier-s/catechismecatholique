<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	type Range = { from: number; to: number };
	type Article = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
	};
	type Chapter = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
		articles: Article[];
	};
	type Section = {
		slug: string;
		title: string;
		number?: number;
		range?: Range;
		chapters: Chapter[];
		articles_direct?: Article[];
	};
	type Part = {
		slug: string;
		title: string;
		number?: number;
		prologue?: boolean;
		range?: Range;
		sections: Section[];
	};
	type Struct = { parts: Part[] };
	const struct = $derived(data.structure as Struct);

	function fmtRange(r: Range | undefined): string {
		if (!r) return '';
		return r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`;
	}
</script>

<svelte:head><title>Sommaire — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-4xl px-6 py-12">
	<h1 class="font-heading text-5xl font-semibold mb-10">Sommaire complet</h1>

	{#each struct.parts as part (part.slug)}
		<section class="mb-10">
			<h2 class="font-heading text-3xl font-semibold mb-4">
				<a href="/ccc/{part.slug}" class="hover:text-accent">
					<span class="font-bold">
						{part.prologue ? 'Prologue' : `Partie ${part.number}`} :
					</span>
					{part.prologue ? '' : part.title}
					{#if part.range}
						<span class="font-normal text-subtle text-base">({fmtRange(part.range)})</span>
					{/if}
				</a>
			</h2>

			{#each part.sections as section (section.slug)}
				<div class="ml-4 mt-5 pl-4">
					<h3 class="font-ui text-lg font-semibold mb-2">
						<a href="/ccc/{part.slug}/{section.slug}" class="hover:text-accent">
							<span class="font-semibold">
								{section.number ? `Section ${section.number}` : 'Section'} :
							</span>
							{section.title}
							{#if section.range}
								<span class="font-normal text-subtle text-sm">({fmtRange(section.range)})</span>
							{/if}
						</a>
					</h3>

					{#each section.chapters as chap (chap.slug)}
						<div class="ml-4 mt-3 pl-4">
							<p class="font-ui font-medium">
								<a
									href="/ccc/{part.slug}/{section.slug}/{chap.slug}"
									class="text-muted hover:text-accent"
								>
									<span class="font-semibold">Chapitre {chap.number} :</span>
									{chap.title}
									{#if chap.range}
										<span class="text-subtle text-xs">({fmtRange(chap.range)})</span>
									{/if}
								</a>
							</p>
							{#if chap.articles.length}
								<ul class="ml-4 mt-1 space-y-0.5 text-sm">
									{#each chap.articles as article (article.slug)}
										<li class="pl-3 border-l border-border">
											<a
												href="/ccc/{part.slug}/{section.slug}/{chap.slug}/{article.slug}"
												class="text-muted hover:text-accent"
											>
												<span class="font-semibold">Article {article.number} :</span>
												{article.title}
												{#if article.range}
													<span class="text-subtle text-xs">({fmtRange(article.range)})</span>
												{/if}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}

					{#if section.articles_direct?.length}
						<div class="ml-4 mt-2 pl-4">
							{#each section.articles_direct as article (article.slug)}
								<p class="text-sm">
									<a
										href="/ccc/{part.slug}/{section.slug}/{article.slug}"
										class="text-muted hover:text-accent"
									>
										<span class="font-semibold">Article {article.number} :</span>
										{article.title}
										{#if article.range}
											<span class="text-subtle text-xs">({fmtRange(article.range)})</span>
										{/if}
									</a>
								</p>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</section>
	{/each}
</main>
