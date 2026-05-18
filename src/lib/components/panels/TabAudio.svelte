<script lang="ts">
	import { get } from 'svelte/store';
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
	let chapterParagraphs: number[] = $state([]);
	let chapterTitle: string = $state('');
	let mode: 'paragraph' | 'en-bref' = $state('paragraph');
	let enBrefChapterSlug: string | null = $state(null);
	let enBrefChapterTitle: string = $state('');

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

	const positionInChapter = $derived.by(() => {
		if (currentParagraph === null) return -1;
		return chapterParagraphs.indexOf(currentParagraph);
	});

	const prevParagraph: number | null = $derived(
		positionInChapter > 0 ? (chapterParagraphs[positionInChapter - 1] ?? null) : null
	);
	const nextParagraph: number | null = $derived(
		positionInChapter >= 0 && positionInChapter < chapterParagraphs.length - 1
			? (chapterParagraphs[positionInChapter + 1] ?? null)
			: null
	);

	// Load audio index once.
	$effect(() => {
		(async () => {
			index = await loadAudioIndex();
		})();
	});

	// Load chapter context for prev/next + en-bref availability.
	$effect(() => {
		const n = currentParagraph;
		if (n === null) {
			chapterParagraphs = [];
			chapterTitle = '';
			enBrefChapterSlug = null;
			enBrefChapterTitle = '';
			return;
		}
		(async () => {
			const ctx = await loadParagraphContext(n);
			if (!ctx?.chapter) {
				chapterParagraphs = [];
				chapterTitle = '';
				enBrefChapterSlug = null;
				enBrefChapterTitle = '';
				return;
			}
			const chapter = await loadChapter(ctx.chapter.slug);
			chapterParagraphs = chapter.paragraphs ?? [];
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

	// Restore persisted state on first mount.
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
			// Resume position only when same paragraph as last session.
			if (
				typeof s.paragraph === 'number' &&
				s.paragraph === currentParagraph &&
				typeof s.time === 'number'
			) {
				audio.currentTime = s.time;
			}
		} catch {
			// invalid stored data — ignore
		}
	});

	function persist(): void {
		if (currentParagraph === null) return;
		try {
			const s: PersistedState = {
				paragraph: currentParagraph,
				time: currentTime,
				rate,
				volume
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
		} catch {
			// localStorage disabled — fine
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
		const s = get(studyPanel);
		openPanel({ kind: 'paragraph', paragraph: n }, s.activeTab ?? 'audio');
		// Auto-play if we were playing before.
		const wasPlaying = !audio?.paused;
		// audio src will swap via reactive currentUrl; resume after load if needed
		if (wasPlaying) {
			setTimeout(() => audio?.play(), 50);
		}
	}

	function fmtTime(sec: number): string {
		if (!isFinite(sec) || sec < 0) return '0:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	// mediaSession (lock-screen / Bluetooth headset controls).
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
		navigator.mediaSession.setActionHandler('seekbackward', () => skip(-10));
		navigator.mediaSession.setActionHandler('seekforward', () => skip(10));
		navigator.mediaSession.setActionHandler('previoustrack', () => {
			if (prevParagraph !== null) goToParagraph(prevParagraph);
		});
		navigator.mediaSession.setActionHandler('nexttrack', () => {
			if (nextParagraph !== null) goToParagraph(nextParagraph);
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
		// throttle persistence to once per ~5s
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
	}

	function setMode(m: 'paragraph' | 'en-bref'): void {
		if (mode === m) return;
		mode = m;
		ready = false;
		currentTime = 0;
		duration = 0;
		// audio.src swaps via reactive currentUrl
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
			<div class="text-[11px] uppercase tracking-[0.18em] text-muted font-bold">
				{mode === 'en-bref' ? 'En bref' : `Paragraphe ${currentParagraph}`}
			</div>

			<div class="flex items-center gap-3">
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

				<div class="flex-1 flex items-center gap-2">
					<span class="tabular-nums text-xs text-muted w-9 text-right">{fmtTime(currentTime)}</span>
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
					<span class="tabular-nums text-xs text-muted w-9">{fmtTime(duration)}</span>
				</div>
			</div>

			<div class="flex items-center justify-between gap-2 flex-wrap">
				<div class="flex items-center gap-1">
					<button type="button" class="ctrl" onclick={() => skip(-10)} aria-label="Reculer 10s">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
							stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
						<span class="text-[10px] font-semibold ml-0.5">10</span>
					</button>
					<button type="button" class="ctrl" onclick={() => skip(-5)} aria-label="Reculer 5s">
						<span class="text-[11px] font-semibold">−5s</span>
					</button>
					<button type="button" class="ctrl" onclick={() => skip(5)} aria-label="Avancer 5s">
						<span class="text-[11px] font-semibold">+5s</span>
					</button>
					<button type="button" class="ctrl" onclick={() => skip(10)} aria-label="Avancer 10s">
						<span class="text-[10px] font-semibold mr-0.5">10</span>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
							stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>
					</button>
				</div>

				<div class="flex items-center gap-1">
					<button
						type="button"
						class="ctrl"
						onclick={() => prevParagraph !== null && goToParagraph(prevParagraph)}
						disabled={prevParagraph === null}
						aria-label="Paragraphe précédent"
					>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"
							><path d="M6 5h2v14H6zM20 5v14L10 12z" /></svg>
					</button>
					<button
						type="button"
						class="ctrl"
						onclick={() => nextParagraph !== null && goToParagraph(nextParagraph)}
						disabled={nextParagraph === null}
						aria-label="Paragraphe suivant"
					>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"
							><path d="M16 5h2v14h-2zM4 5v14l10-7z" /></svg>
					</button>
				</div>
			</div>

			<div class="flex items-center justify-between gap-3 flex-wrap pt-1">
				<div class="flex items-center gap-1">
					{#each SPEEDS as s}
						<button
							type="button"
							class="speed-btn"
							class:active={Math.abs(rate - s) < 0.01}
							onclick={() => setRate(s)}
						>
							{s === 1 ? '1×' : `${s}×`}
						</button>
					{/each}
				</div>

				<div class="flex items-center gap-2">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="text-muted"
						><path d="M3 9v6h4l5 5V4L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
					<input
						type="range"
						min="0"
						max="1"
						step="0.05"
						value={volume}
						oninput={(e) => setVolume(parseFloat((e.currentTarget as HTMLInputElement).value))}
						class="vol w-20"
						aria-label="Volume"
					/>
				</div>
			</div>
		</div>

		{#if positionInChapter >= 0 && chapterParagraphs.length > 1}
			<p class="text-[11px] text-muted mt-3 italic">
				Paragraphe {positionInChapter + 1} sur {chapterParagraphs.length} dans «&nbsp;{chapterTitle}&nbsp;».
			</p>
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
		transition: filter 120ms, transform 60ms;
	}
	.play-btn:hover {
		filter: brightness(1.08);
	}
	.play-btn:active {
		transform: scale(0.96);
	}
	.ctrl {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 36px;
		height: 32px;
		padding: 0 6px;
		border-radius: 6px;
		color: var(--color-fg);
		transition: background-color 120ms;
	}
	.ctrl:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	.ctrl:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.speed-btn {
		min-width: 38px;
		padding: 3px 8px;
		font-size: 11px;
		font-weight: 600;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		color: var(--color-fg);
		transition: all 120ms;
	}
	.speed-btn:hover {
		background: color-mix(in srgb, var(--color-fg) 5%, transparent);
	}
	.speed-btn.active {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
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
	button.active {
		background: var(--color-accent);
		color: white;
	}
	button:not(.active):hover {
		background: color-mix(in srgb, var(--color-fg) 5%, transparent);
	}
</style>
