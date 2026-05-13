<script lang="ts">
	type Video = {
		id: string;
		title: string;
		thumbnail: string;
		duration: string;
		views: string;
	};

	type Playlist = {
		playlistId: string;
		playlistTitle: string;
		videos: Video[];
	};

	let {
		playlist,
		heading = 'Enseignements en vidéo',
		channel
	}: {
		playlist: Playlist;
		heading?: string;
		channel?: { name: string; href: string };
	} = $props();

	let selectedIndex = $state(0);
	let isPlaying = $state(false);

	const selected = $derived(playlist.videos[selectedIndex]!);
	const playlistHref = $derived(`https://www.youtube.com/playlist?list=${playlist.playlistId}`);
	const embedSrc = $derived(
		`https://www.youtube-nocookie.com/embed/${selected.id}?list=${playlist.playlistId}&autoplay=1&rel=0`
	);

	function selectVideo(i: number) {
		if (i === selectedIndex && isPlaying) return;
		selectedIndex = i;
		isPlaying = true;
	}
</script>

<section class="ytp" aria-label={heading}>
	<header class="ytp-head">
		<div>
			<p class="ytp-kicker">Vidéos</p>
			<h2 class="ytp-heading">{heading}</h2>
			{#if channel}
				<p class="ytp-channel">
					Chaîne <a href={channel.href} target="_blank" rel="noopener noreferrer">{channel.name}</a>
				</p>
			{/if}
		</div>
		<a class="ytp-all" href={playlistHref} target="_blank" rel="noopener noreferrer">
			Playlist sur YouTube<span aria-hidden="true">&nbsp;↗</span>
		</a>
	</header>

	<div class="ytp-grid">
		<!-- Player -->
		<div class="ytp-player">
			<div class="ytp-frame">
				{#if isPlaying}
					<iframe
						src={embedSrc}
						title={selected.title}
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowfullscreen
						referrerpolicy="strict-origin-when-cross-origin"
					></iframe>
				{:else}
					<button
						class="ytp-poster"
						type="button"
						onclick={() => (isPlaying = true)}
						aria-label="Lire {selected.title}"
					>
						<img src={selected.thumbnail} alt="" loading="lazy" referrerpolicy="no-referrer" />
						<span class="ytp-play" aria-hidden="true">
							<svg viewBox="0 0 68 48" width="68" height="48">
								<path
									d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
									fill="#f00"
								/>
								<path d="M45 24 27 14v20" fill="#fff" />
							</svg>
						</span>
					</button>
				{/if}
			</div>
			<div class="ytp-current">
				<p class="ytp-current-title">{selected.title}</p>
				{#if selected.views}
					<p class="ytp-current-views">{selected.views}</p>
				{/if}
			</div>
		</div>

		<!-- Playlist column -->
		<aside class="ytp-list-wrap" aria-label="Vidéos de la playlist">
			<div class="ytp-list-head">
				<span class="ytp-list-title">{playlist.playlistTitle}</span>
				<span class="ytp-list-count">{playlist.videos.length} vidéos</span>
			</div>
			<ol class="ytp-list styled-scroll styled-scroll-accent">
				{#each playlist.videos as v, i (v.id)}
					<li>
						<button
							type="button"
							class="ytp-item"
							class:is-active={i === selectedIndex}
							onclick={() => selectVideo(i)}
						>
							<span class="ytp-num" aria-hidden="true">{i + 1}</span>
							<span class="ytp-thumb">
								<img src={v.thumbnail} alt="" loading="lazy" referrerpolicy="no-referrer" />
							</span>
							<span class="ytp-item-body">
								<span class="ytp-item-title">{v.title}</span>
								{#if v.views}
									<span class="ytp-item-views">{v.views}</span>
								{/if}
							</span>
						</button>
					</li>
				{/each}
			</ol>
		</aside>
	</div>
</section>

<style>
	.ytp {
		margin-top: clamp(2.5rem, 5vw, 4rem);
		padding-top: clamp(1.5rem, 3vw, 2.5rem);
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
	}

	/* ── Header ──────────────────────────────────────────────────────── */
	.ytp-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.ytp-kicker {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.4rem;
	}

	.ytp-heading {
		font-family: var(--font-heading);
		font-style: italic;
		font-size: clamp(1.45rem, 3vw, 2rem);
		font-weight: 700;
		line-height: 1.15;
		margin: 0;
	}

	.ytp-channel {
		font-family: var(--font-ui);
		font-size: 0.8rem;
		color: var(--color-muted);
		margin: 0.4rem 0 0;
	}

	.ytp-channel a {
		color: var(--color-fg);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--color-fg) 30%, transparent);
		text-underline-offset: 3px;
		transition: color 160ms;
	}

	.ytp-channel a:hover {
		color: var(--color-accent);
	}

	.ytp-all {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		text-decoration: none;
		padding: 0.45rem 0.85rem;
		border: 1px solid color-mix(in srgb, var(--color-fg) 18%, transparent);
		border-radius: 999px;
		transition:
			color 160ms,
			border-color 160ms,
			background 160ms;
	}

	.ytp-all:hover {
		color: var(--color-fg);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}

	/* ── Grid ────────────────────────────────────────────────────────── */
	.ytp-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr);
		gap: 1.25rem;
	}

	@media (max-width: 880px) {
		.ytp-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ── Player ──────────────────────────────────────────────────────── */
	.ytp-frame {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: 6px;
		overflow: hidden;
		background: #000;
		box-shadow: 0 4px 18px -10px rgba(0, 0, 0, 0.4);
	}

	.ytp-frame iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}

	.ytp-poster {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: #000;
		cursor: pointer;
		display: block;
	}

	.ytp-poster img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.92;
		transition: opacity 200ms;
	}

	.ytp-poster:hover img {
		opacity: 1;
	}

	.ytp-play {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		justify-content: center;
		filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));
		opacity: 0.92;
		transition: opacity 160ms;
	}

	.ytp-poster:hover .ytp-play {
		opacity: 1;
	}

	.ytp-current {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.85rem;
		margin-top: 0.85rem;
	}

	.ytp-current-title {
		font-family: var(--font-ui);
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-fg);
		margin: 0;
		flex: 1;
		min-width: 0;
	}

	.ytp-current-views {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
		white-space: nowrap;
		flex-shrink: 0;
		margin: 0;
	}

	/* ── List column ─────────────────────────────────────────────────── */
	.ytp-list-wrap {
		display: flex;
		flex-direction: column;
		border: 1px solid color-mix(in srgb, var(--color-fg) 10%, transparent);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-fg) 2%, var(--color-panel));
		overflow: hidden;
		max-height: 480px;
	}

	@media (max-width: 880px) {
		.ytp-list-wrap {
			max-height: 420px;
		}
	}

	.ytp-list-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
		background: color-mix(in srgb, var(--color-fg) 3%, transparent);
		flex-shrink: 0;
	}

	.ytp-list-title {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-fg);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.ytp-list-count {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		color: var(--color-muted);
		flex-shrink: 0;
		letter-spacing: 0.04em;
	}

	.ytp-list {
		list-style: none;
		padding: 0.25rem;
		margin: 0;
		overflow-y: auto;
		scrollbar-gutter: stable;
		flex: 1;
	}

	.ytp-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.5rem;
		border: 0;
		background: transparent;
		border-radius: 4px;
		cursor: pointer;
		text-align: left;
		transition: background 140ms;
	}

	.ytp-item:hover {
		background: color-mix(in srgb, var(--color-fg) 5%, transparent);
	}

	.ytp-item.is-active {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
	}

	.ytp-item.is-active .ytp-item-title {
		color: var(--color-fg);
	}

	.ytp-num {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
		flex: 0 0 1.2rem;
		text-align: right;
	}

	.ytp-item.is-active .ytp-num {
		color: var(--color-accent);
	}

	.ytp-thumb {
		flex: 0 0 84px;
		aspect-ratio: 16 / 9;
		border-radius: 3px;
		overflow: hidden;
		background: #000;
	}

	.ytp-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.ytp-item-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.ytp-item-title {
		font-family: var(--font-ui);
		font-size: 0.82rem;
		line-height: 1.3;
		color: var(--color-subtle);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.ytp-item:hover .ytp-item-title {
		color: var(--color-fg);
	}

	.ytp-item-views {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
		line-height: 1;
	}

	@media print {
		.ytp {
			display: none;
		}
	}
</style>
