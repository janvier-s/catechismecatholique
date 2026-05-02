<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	type Struct = {
		parts: Array<{
			slug: string;
			title: string;
			prologue?: boolean;
			sections: Array<{
				slug: string;
				title: string;
				chapters: Array<{
					slug: string;
					title: string;
					articles: Array<{ slug: string; title: string }>;
				}>;
			}>;
		}>;
	};
	const struct = $derived(data.structure as Struct);
</script>

<svelte:head><title>Sommaire — Catéchisme</title></svelte:head>

<main class="mx-auto max-w-4xl px-6 py-12">
	<h1 class="font-ui text-4xl font-bold mb-8">Sommaire complet</h1>

	{#each struct.parts as part (part.slug)}
		<section class="mb-10">
			<h2 class="font-ui text-2xl font-bold mb-4">
				<a href="/ccc/{part.slug}" class="hover:text-accent">{part.title}</a>
			</h2>
			{#each part.sections as section (section.slug)}
				<h3 class="font-ui text-lg font-semibold mt-6 mb-2 ml-4">
					<a href="/ccc/{part.slug}/{section.slug}" class="hover:text-accent">{section.title}</a>
				</h3>
				<ul class="ml-8 space-y-1 text-sm">
					{#each section.chapters as chap (chap.slug)}
						<li>
							<a href="/ccc/{part.slug}/{section.slug}/{chap.slug}" class="hover:text-accent">
								{chap.title}
							</a>
							{#if chap.articles.length}
								<ul class="ml-4 mt-1 text-muted">
									{#each chap.articles as article (article.slug)}
										<li>
											<a href="/ccc/{part.slug}/{section.slug}/{chap.slug}/{article.slug}" class="hover:text-accent">
												{article.title}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			{/each}
		</section>
	{/each}
</main>
