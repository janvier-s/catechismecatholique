#!/usr/bin/env tsx
// Scrapes the IBP / CREDO "Enseignements par des prêtres" YouTube playlist
// page and writes the result to static/data/bon-pasteur/playlist.json.
//
// We scrape the public playlist page instead of using the RSS feed because
// RSS is hard-capped at 15 entries; the playlist currently has 77.
//
// Usage:  npm run fetch-ibp-playlist
//
// View counts are kept as the YouTube-formatted string ("24K", "1,2M") since
// the playlist page doesn't expose raw numbers. If YouTube changes the page
// structure, the regex below may need updating.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAYLIST_ID = 'PLtTimnu1-xEzh-mNr6k2OwfqrwtMTK3Lo';
const PLAYLIST_URL = `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`;

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'static', 'data', 'bon-pasteur', 'playlist.json');

type Video = {
	id: string;
	title: string;
	thumbnail: string;
	duration: string;
	views: string;
};

const res = await fetch(PLAYLIST_URL, {
	headers: {
		'User-Agent':
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
		'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
	}
});
if (!res.ok) {
	console.error(`Fetch failed: ${res.status} ${res.statusText}`);
	process.exit(1);
}
const html = await res.text();

const m = html.match(/var ytInitialData = (\{.+?\});<\/script>/s);
if (!m) {
	console.error('Could not find ytInitialData in playlist HTML.');
	process.exit(1);
}
const data = JSON.parse(m[1]!);

const playlistTitle: string = data.metadata?.playlistMetadataRenderer?.title ?? 'YouTube playlist';

const items =
	data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
		?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
		?.playlistVideoListRenderer?.contents ?? [];

type RawItem = {
	playlistVideoRenderer?: {
		videoId: string;
		title?: { runs?: { text: string }[] };
		lengthText?: { simpleText?: string };
		videoInfo?: { runs?: { text: string }[] };
	};
};

const videos: Video[] = (items as RawItem[])
	.filter((it) => it.playlistVideoRenderer?.videoId)
	.map((it) => {
		const v = it.playlistVideoRenderer!;
		return {
			id: v.videoId,
			title: v.title?.runs?.[0]?.text?.trim() ?? '',
			thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
			duration: v.lengthText?.simpleText ?? '',
			views: v.videoInfo?.runs?.[0]?.text?.trim() ?? ''
		};
	});

const out = {
	playlistId: PLAYLIST_ID,
	playlistTitle,
	fetchedAt: new Date().toISOString(),
	videos
};

writeFileSync(OUT, JSON.stringify(out, null, '\t') + '\n', 'utf8');
console.log(`Wrote ${videos.length} videos to ${OUT}`);
