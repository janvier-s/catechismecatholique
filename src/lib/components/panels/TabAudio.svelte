<script lang="ts">
	import { get } from 'svelte/store';
	import { page } from '$app/state';
	import { studyPanel, openPanel } from '$lib/stores/studyPanel';
	import { loadParagraphContext, loadChapter } from '$lib/data/loaders';
	import {
		loadAudioIndex,
		audioUrlForParagraph,
		audioUrlForEnBref,
		type AudioIndex
	} from '$lib/data/audioIndex';

	const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
	const STORAGE_KEY = 'ccc-audio-state';

	type PersistedState = { paragraph: number; time: number; rate: number; volume: number };

	let index: AudioIndex | null = $state(null);
	let chapterTitle: string = $state('');
	let mode: 'paragraph' | 'en-bref' = $state('paragraph');
	let enBrefChapterSlug: string | null = $state(null);
	let enBrefChapterTitle: string = $state('');
	let speedMenuOpen = $state(false);

	let audio: HTMLAudioElement | null = $state(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let rate = $state(1);
	let volume = $state(1);
	let ready = $state(false);

	const currentParagraph = $derived(
		$studyPanel.context?.kind === 'paragraph' ? $studyPanel.context.paragraph : null
	);

	const currentUrl = $derived.by(() => {
		if (!index) return null;
		if (mode === 'en-bref' && enBrefChapterSlug) {
			return audioUrlForEnBref(index, enBrefChapterSlug);
		}
		return currentParagraph !== null ? audioUrlForParagraph(index, currentParagraph) : null;
	});

	// Playlist mode: only active when the URL is /cec/N-M (a range), not
	// for single paragraphs or chapter views. Prev/next + track list are
	// gated on this.
	const playlistRange = $derived.by(() => {
		const m = page.url.pathname.match(/^\/cec\/(\d+)-(\d+)$/);
		if (!m) return null;
		const from = parseInt(m[1]!, 10);
		const to = parseInt(m[2]!, 10);
		if (to <= from) return null;
		return { from, to };
	});

	type PlaylistItem = { n: number; duration_ms: number };
	const playlistItems = $derived.by<PlaylistItem[]>(() => {
		if (!playlistRange || !index) return [];
		const items: PlaylistItem[] = [];
		for (let n = playlistRange.from; n <= playlistRange.to; n++) {
			const entry = index.paragraphs[String(n)];
			if (entry) items.push({ n, duration_ms: entry.duration_ms });
		}
		return items;
	});

	const playlistPosition = $derived(
		playlistItems.findIndex((p) => p.n === currentParagraph)
	);
	const prevInPlaylist = $derived(
		playlistPosition > 0 ? (playlistItems[playlistPosition - 1]?.n ?? null) : null
	);
	const nextInPlaylist = $derived(
		playlistPosition >= 0 && playlistPosition < playlistItems.length - 1
			? (playlistItems[playlistPosition + 1]?.n ?? null)
			: null
	);
	const isPlaylist = $derived(playlistItems.length > 1);

	// Load audio index once.
	$effect(() => {
		(async () => {
			index = await loadAudioIndex();
		})();
	});

	// Load chapter title and en-bref availability for the current paragraph.
	$effect(() => {
		const n = currentParagraph;
		if (n === null) {
			chapterTitle = '';
			enBrefChapterSlug = null;
			enBrefChapterTitle = '';
			return;
		}
		(async () => {
			const ctx = await loadParagraphContext(n);
			if (!ctx?.chapter) {
				chapterTitle = '';
				enBrefChapterSlug = null;
				enBrefChapterTitle = '';
				return;
			}
			const chapter = await loadChapter(ctx.chapter.slug);
			chapterTitle = chapter.title;
			if (index && index.en_bref_combined[ctx.chapter.slug]) {
				enBrefChapterSlug = ctx.chapter.slug;
				enBrefChapterTitle = chapter.title;
			} else {
				enBrefChapterSlug = null;
				enBrefChapterTitle = '';
			}
		})();
	});

	$effect(() => {
		if (!audio || !ready) return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const s = JSON.parse(raw) as PersistedState;
			if (typeof s.rate === 'number') {
				rate = s.rate;
				audio.playbackRate = s.rate;
			}
			if (typeof s.volume === 'number') {
				volume = s.volume;
				audio.volume = s.volume;
			}
			if (
				typeof s.paragraph === 'number' &&
				s.paragraph === currentParagraph &&
				typeof s.time === 'number'
			) {
				audio.currentTime = s.time;
			}
		} catch {
			// noop
		}
	});

	function persist(): void {
		if (currentParagraph === null) return;
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ paragraph: currentParagraph, time: currentTime, rate, volume })
			);
		} catch {
			// noop
		}
	}

	function play(): void {
		audio?.play();
	}
	function pause(): void {
		audio?.pause();
	}
	function toggle(): void {
		if (!audio) return;
		audio.paused ? play() : pause();
	}
	function skip(deltaSec: number): void {
		if (!audio) return;
		audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + deltaSec));
	}
	function setRate(r: number): void {
		rate = r;
		if (audio) audio.playbackRate = r;
		speedMenuOpen = false;
		persist();
	}
	function setVolume(v: number): void {
		volume = v;
		if (audio) audio.volume = v;
		persist();
	}
	function seekTo(sec: number): void {
		if (!audio) return;
		audio.currentTime = sec;
	}
	function goToParagraph(n: number): void {
		const wasPlaying = !audio?.paused;
		const s = get(studyPanel);
		openPanel({ kind: 'paragraph', paragraph: n }, s.activeTab ?? 'audio');
		if (wasPlaying) setTimeout(() => audio?.play(), 60);
	}

	function fmtTime(sec: number): string {
		if (!isFinite(sec) || sec < 0) return '0:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	$effect(() => {
		if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
		if (currentParagraph === null) return;
		navigator.mediaSession.metadata = new MediaMetadata({
			title:
				mode === 'en-bref'
					? `En bref — ${enBrefChapterTitle || 'CCC'}`
					: `CCC §${currentParagraph}`,
			artist: 'Catéchisme de l’Église catholique',
			album: chapterTitle || 'CCC'
		});
		navigator.mediaSession.setActionHandler('play', play);
		navigator.mediaSession.setActionHandler('pause', pause);
		navigator.mediaSession.setActionHandler('seekbackward', () => skip(-5));
		navigator.mediaSession.setActionHandler('seekforward', () => skip(5));
		navigator.mediaSession.setActionHandler('previoustrack', () => {
			if (prevInPlaylist !== null) goToParagraph(prevInPlaylist);
		});
		navigator.mediaSession.setActionHandler('nexttrack', () => {
			if (nextInPlaylist !== null) goToParagraph(nextInPlaylist);
		});
	});

	function onLoaded() {
		if (!audio) return;
		duration = audio.duration;
		ready = true;
	}
	function onTimeUpdate() {
		if (!audio) return;
		currentTime = audio.currentTime;
		if (Math.floor(currentTime) % 5 === 0) persist();
	}
	function onPlay() {
		isPlaying = true;
	}
	function onPause() {
		isPlaying = false;
		persist();
	}
	function onEnded() {
		isPlaying = false;
		persist();
		// Auto-advance only in playlist mode.
		if (isPlaylist && nextInPlaylist !== null) {
			goToParagraph(nextInPlaylist);
		}
	}

	function setMode(m: 'paragraph' | 'en-bref'): void {
		if (mode === m) return;
		mode = m;
		ready = false;
		currentTime = 0;
		duration = 0;
	}
</script>

<div class="font-ui text-sm">
	{#if index === null}
		<p class="text-muted italic">Chargement…</p>
	{:else if !currentUrl}
		<p class="text-muted italic">Pas d'audio disponible pour ce paragraphe.</p>
	{:else}
		{#if enBrefChapterSlug}
			<div class="mb-3 inline-flex rounded-full border border-fg/15 overflow-hidden text-xs">
				<button
					type="button"
					class="px-3 py-1 transition-colors"
					class:active={mode === 'paragraph'}
					onclick={() => setMode('paragraph')}
				>
					CEC §{currentParagraph}
				</button>
				<button
					type="button"
					class="px-3 py-1 transition-colors"
					class:active={mode === 'en-bref'}
					onclick={() => setMode('en-bref')}
				>
					En bref
				</button>
			</div>
		{/if}

		<audio
			bind:this={audio}
			src={currentUrl}
			preload="metadata"
			onloadedmetadata={onLoaded}
			ontimeupdate={onTimeUpdate}
			onplay={onPlay}
			onpause={onPause}
			onended={onEnded}
			class="hidden"
		></audio>

		<div class="player rounded-lg p-4 space-y-3">
			<div class="text-[11px] uppercase tracking-[0.18em] text-muted font-bold flex items-center justify-between">
				<span>{mode === 'en-bref' ? 'En bref' : `Paragraphe ${currentParagraph}`}</span>
				{#if isPlaylist}
					<span class="text-fg/70 normal-case tracking-normal font-medium">
						{playlistPosition + 1} sur {playlistItems.length}
					</span>
				{/if}
			</div>

			<div class="flex items-center gap-3">
				{#if isPlaylist}
					<button
						type="button"
						class="nav-icon"
						onclick={() => prevInPlaylist !== null && goToParagraph(prevInPlaylist)}
						disabled={prevInPlaylist === null}
						aria-label="Paragraphe précédent"
						title="Précédent"
					>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"
							><path d="M6 5h2v14H6zM20 5v14L10 12z" /></svg
						>
					</button>
				{/if}
				<button
					type="button"
					class="play-btn"
					onclick={toggle}
					aria-label={isPlaying ? 'Pause' : 'Lecture'}
				>
					{#if isPlaying}
						<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"
							><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg
						>
					{:else}
						<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"
							><path d="M8 5v14l11-7z" /></svg
						>
					{/if}
				</button>
				{#if isPlaylist}
					<button
						type="button"
						class="nav-icon"
						onclick={() => nextInPlaylist !== null && goToParagraph(nextInPlaylist)}
						disabled={nextInPlaylist === null}
						aria-label="Paragraphe suivant"
						title="Suivant"
					>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"
							><path d="M16 5h2v14h-2zM4 5v14l10-7z" /></svg
						>
					</button>
				{/if}

				<div class="flex-1 flex items-center gap-2">
					<input
						type="range"
						min="0"
						max={duration || 0}
						step="0.1"
						value={currentTime}
						oninput={(e) => seekTo(parseFloat((e.currentTarget as HTMLInputElement).value))}
						class="scrub flex-1"
						aria-label="Position"
					/>
					<span class="tabular-nums text-[11px] text-muted whitespace-nowrap">
						{fmtTime(currentTime)} / {fmtTime(duration)}
					</span>
				</div>
			</div>

			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-0.5">
					<button type="button" class="icon-btn" onclick={() => skip(-5)} aria-label="Reculer 5 secondes" title="Reculer 5s">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
							stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg
						>
					</button>
					<button type="button" class="icon-btn" onclick={() => skip(5)} aria-label="Avancer 5 secondes" title="Avancer 5s">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
							stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg
						>
					</button>
					<div class="relative">
						<button
							type="button"
							class="icon-btn speed-pill"
							onclick={() => (speedMenuOpen = !speedMenuOpen)}
							aria-label="Vitesse de lecture"
							aria-expanded={speedMenuOpen}
							title="Vitesse"
						>
							{rate === 1 ? '1×' : `${rate}×`}
						</button>
						{#if speedMenuOpen}
							<div class="speed-menu" role="menu">
								{#each SPEEDS as s}
									<button
										type="button"
										class="speed-opt"
										class:active={Math.abs(rate - s) < 0.01}
										onclick={() => setRate(s)}
									>
										{s === 1 ? '1×' : `${s}×`}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div class="flex items-center gap-1.5">
					<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="text-muted"
						><path d="M3 9v6h4l5 5V4L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
					<input
						type="range"
						min="0"
						max="1"
						step="0.05"
						value={volume}
						oninput={(e) => setVolume(parseFloat((e.currentTarget as HTMLInputElement).value))}
						class="vol w-16"
						aria-label="Volume"
					/>
				</div>
			</div>
		</div>

		{#if isPlaylist}
			<div class="mt-4">
				<p class="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-2">
					Lecture en cours
				</p>
				<ul class="space-y-0.5">
					{#each playlistItems as item (item.n)}
						<li>
							<button
								type="button"
								class="track-row"
								class:playing={item.n === currentParagraph}
								onclick={() => goToParagraph(item.n)}
							>
								<span class="text-accent tabular-nums font-semibold">§{item.n}</span>
								<span class="flex-1"></span>
								<span class="tabular-nums text-[11px] text-muted">
									{fmtTime(item.duration_ms / 1000)}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>

<style>
	.player {
		background: color-mix(in srgb, var(--color-fg) 5%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	.play-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 9999px;
		background: var(--color-accent);
		color: white;
		flex-shrink: 0;
		transition: filter 120ms, transform 60ms;
	}
	.play-btn:hover {
		filter: brightness(1.08);
	}
	.play-btn:active {
		transform: scale(0.96);
	}
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		height: 28px;
		padding: 0 6px;
		border-radius: 6px;
		color: var(--color-fg);
		font-size: 11px;
		font-weight: 600;
		transition: background-color 120ms;
	}
	.icon-btn:hover {
		background: color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	.speed-pill {
		min-width: 36px;
	}
	.speed-menu {
		position: absolute;
		top: calc(100% + 6px);
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 4px;
		border-radius: 8px;
		background: var(--color-bg, white);
		border: 1px solid color-mix(in srgb, var(--color-fg) 15%, transparent);
	}
	.speed-opt {
		min-width: 38px;
		padding: 4px 8px;
		font-size: 11px;
		font-weight: 600;
		border-radius: 6px;
		color: var(--color-fg);
		white-space: nowrap;
		transition: background-color 120ms, color 120ms;
	}
	.speed-opt:hover {
		background: color-mix(in srgb, var(--color-fg) 6%, transparent);
	}
	.speed-opt.active {
		background: var(--color-accent);
		color: white;
	}
	.scrub,
	.vol {
		-webkit-appearance: none;
		appearance: none;
		height: 4px;
		background: color-mix(in srgb, var(--color-fg) 15%, transparent);
		border-radius: 2px;
		outline: none;
	}
	.scrub::-webkit-slider-thumb,
	.vol::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-accent);
		cursor: pointer;
		transition: transform 120ms;
	}
	.scrub::-webkit-slider-thumb:hover,
	.vol::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}
	.scrub::-moz-range-thumb,
	.vol::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border: none;
		border-radius: 50%;
		background: var(--color-accent);
		cursor: pointer;
	}
	.track-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 10px;
		border-radius: 6px;
		transition: background-color 120ms;
		text-align: left;
	}
	.track-row:hover {
		background: color-mix(in srgb, var(--color-fg) 6%, transparent);
	}
	.track-row.playing {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		border-left: 2px solid var(--color-accent);
		padding-left: 8px;
	}
	.nav-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 6px;
		color: var(--color-fg);
		flex-shrink: 0;
		transition: background-color 120ms;
	}
	.nav-icon:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	.nav-icon:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	button.active {
		background: var(--color-accent);
		color: white;
	}
	button:not(.active):not(.play-btn):not(.icon-btn):not(.nav-btn):not(.track-row):hover {
		background: color-mix(in srgb, var(--color-fg) 5%, transparent);
	}
</style>
