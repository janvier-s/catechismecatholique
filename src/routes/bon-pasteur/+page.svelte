<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import CollectionPage from '$lib/components/ui/CollectionPage.svelte';
	import type { CollectionGroup } from '$lib/components/ui/CollectionPage.svelte';
	import YoutubePlaylist from '$lib/components/bon-pasteur/YoutubePlaylist.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const groups: CollectionGroup[] = [
		{
			columns: 4,
			items: [
				{
					slug: 'catechisme-adultes-ibp',
					href: '/bon-pasteur/catechisme-adultes-laguerie/01-la-doctrine-catholique',
					image: '/img/bibliotheque/ibp-catechisme-adultes.webp',
					eyebrow: '28 leçons',
					title: 'Cours de catéchisme pour adultes',
					subtitle: 'Séminaire Saint-Vincent de Courtalin',
					blurb: `De l'existence de Dieu aux sacrements, de la morale aux vertus cardinales.`
				},
				{
					slug: 'liturgie-laguerie',
					href: null,
					image: '/img/bibliotheque/ibp-liturgie-nuls.webp',
					eyebrow: '22 chapitres',
					title: 'La Liturgie pour les Nuls',
					subtitle: 'Abbé Philippe Laguérie',
					blurb: 'La messe et le culte catholique expliqués pour tous.'
				},
				{
					slug: 'dieu',
					href: '/bon-pasteur/dieu/ch-01',
					image: '/img/bibliotheque/ibp-dieu.webp',
					eyebrow: '13 chapitres',
					title: 'Dieu',
					subtitle: 'Doctrine de la foi',
					blurb: `Dieu, la Trinité, la Création, les anges, le Péché originel, le Rédempteur, Marie, l'Église, les Fins dernières.`
				},
				{
					slug: 'liturgie',
					href: '/bon-pasteur/liturgie/ch-01',
					image: '/img/bibliotheque/ibp-liturgie.webp',
					eyebrow: '10 chapitres',
					title: 'La Liturgie',
					subtitle: 'Abbé Marin Cottard',
					blurb:
						'Actes du culte, lieux sacrés, autel, vases et vêtements liturgiques, année liturgique.'
				}
			]
		}
	];
</script>

<MetaTags
	title="Institut du Bon Pasteur · Catéchèse"
	description="Quatre cours de catéchèse de l'Institut du Bon Pasteur : catéchisme pour adultes, doctrine de la foi, liturgie catholique et la liturgie pour les nuls."
/>

<div class="ibp-wrap">
	<CollectionPage kicker="Institut du Bon Pasteur" title="Catéchèse du<br />Bon Pasteur" {groups}>
		{#snippet lede()}
			<p class="ibp-desc">
				Fondé en 2006, l'Institut du Bon Pasteur est une société de vie apostolique dont les prêtres
				célèbrent les sacrements selon la forme extraordinaire du rite romain. Les cours présentés
				ici ont été dispensés par des prêtres de l'Institut et s'inscrivent dans la Tradition de
				l'Église Catholique.
			</p>
			<div class="ibp-links">
				<a
					href="https://www.institutdubonpasteur.org/"
					class="ibp-link"
					target="_blank"
					rel="noopener noreferrer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
						/>
					</svg>
					<span>Site web</span>
				</a>
				<a
					href="https://www.facebook.com/Institut.du.Bon.Pasteur"
					class="ibp-link"
					target="_blank"
					rel="noopener noreferrer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 256 256"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm8,191.63V152h24a8,8,0,0,0,0-16H136V112a16,16,0,0,1,16-16h16a8,8,0,0,0,0-16H152a32,32,0,0,0-32,32v24H96a8,8,0,0,0,0,16h24v63.63a88,88,0,1,1,16,0Z"
						/>
					</svg>
					<span>Facebook</span>
				</a>
				<a
					href="https://www.instagram.com/institut_du_bon_pasteur"
					class="ibp-link"
					target="_blank"
					rel="noopener noreferrer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 256 256"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24Zm40,152a40,40,0,0,1-40,40H80a40,40,0,0,1-40-40V80A40,40,0,0,1,80,40h96a40,40,0,0,1,40,40ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z"
						/>
					</svg>
					<span>Instagram</span>
				</a>
				<a
					href="https://www.youtube.com/@_credo"
					class="ibp-link"
					target="_blank"
					rel="noopener noreferrer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 256 256"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							d="M164.44,121.34l-48-32A8,8,0,0,0,104,96v64a8,8,0,0,0,12.44,6.66l48-32a8,8,0,0,0,0-13.32ZM120,145.05V111l25.58,17ZM234.33,69.52a24,24,0,0,0-14.49-16.4C185.56,39.88,131,40,128,40s-57.56-.12-91.84,13.12a24,24,0,0,0-14.49,16.4C19.08,79.5,16,97.74,16,128s3.08,48.5,5.67,58.48a24,24,0,0,0,14.49,16.41C69,215.56,120.4,216,127.34,216h1.32c6.94,0,58.37-.44,91.18-13.11a24,24,0,0,0,14.49-16.41c2.59-10,5.67-28.22,5.67-58.48S236.92,79.5,234.33,69.52Zm-15.49,113a8,8,0,0,1-4.77,5.49c-31.65,12.22-85.48,12-86,12H128c-.54,0-54.33.2-86-12a8,8,0,0,1-4.77-5.49C34.8,173.39,32,156.57,32,128s2.8-45.39,5.16-54.47A8,8,0,0,1,41.93,68c30.52-11.79,81.66-12,85.85-12h.27c.54,0,54.38-.18,86,12a8,8,0,0,1,4.77,5.49C221.2,82.61,224,99.43,224,128S221.2,173.39,218.84,182.47Z"
						/>
					</svg>
					<span>YouTube</span>
				</a>
			</div>
		{/snippet}

		{#snippet footer()}
			<YoutubePlaylist
				playlist={data.playlist}
				heading="Enseignements des prêtres de l'Institut du Bon Pasteur"
				channel={{ name: 'CREDO', href: 'https://www.youtube.com/@credo_off' }}
			/>
		{/snippet}
	</CollectionPage>
</div>

<style>
	.ibp-wrap :global(.hero-title) {
		font-style: normal;
	}

	.ibp-desc {
		max-width: 52ch;
		margin: 0 auto;
		font-style: italic;
		font-size: 0.97rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}

	.ibp-links {
		display: flex;
		justify-content: center;
		gap: 0.25rem;
		margin-top: 1.5rem;
		margin-bottom: -1rem;
		flex-wrap: wrap;
	}

	.ibp-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		padding: 0.6rem 1rem;
		border-radius: 6px;
		color: var(--color-muted);
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: 0.64rem;
		font-style: normal;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transition:
			color 150ms ease,
			background 150ms ease;
	}

	.ibp-link:hover {
		color: var(--color-fg);
		background: color-mix(in srgb, var(--color-fg) 5%, transparent);
	}

	.ibp-link svg {
		width: 1.35rem;
		height: 1.35rem;
		flex-shrink: 0;
	}
</style>
