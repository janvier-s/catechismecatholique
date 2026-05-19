#!/usr/bin/env node
// Upload CEC audio (mp3s + index.json) to the R2 bucket served at
// https://audio.catechismecatholique.fr. Uses the wrangler OAuth token
// from ~/Library/Preferences/.wrangler/config/default.toml unless
// R2_OAUTH_TOKEN is set explicitly.
//
// Usage:
//   node scripts/upload-audio-to-r2.mjs [--concurrency=20]
//   node scripts/upload-audio-to-r2.mjs --keys=cec/ccc_0058.mp3,cec/ccc_1333.mp3
//
// --keys filters to a specific set of R2 keys (comma-separated). Useful for
// hotfixes where only a handful of files changed.
//
// Re-runs are safe: PUT is idempotent and existing objects are overwritten
// with the new body.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'static/audio/cec');
const ACCOUNT_ID = '4e15abdaa44e161490cc2666d3b16bbb';
const BUCKET = 'catechismecatholique-audio';

function getToken() {
	if (process.env.R2_OAUTH_TOKEN) return process.env.R2_OAUTH_TOKEN;
	const cfg = path.join(os.homedir(), 'Library/Preferences/.wrangler/config/default.toml');
	const txt = fs.readFileSync(cfg, 'utf8');
	const m = txt.match(/oauth_token\s*=\s*"([^"]+)"/);
	if (!m) throw new Error(`oauth_token not found in ${cfg}`);
	return m[1];
}

const keysFilter = (() => {
	const arg = process.argv.find((a) => a.startsWith('--keys='));
	return arg ? new Set(arg.slice(7).split(',')) : null;
})();

function buildJobs() {
	const out = [];
	for (const name of fs.readdirSync(AUDIO_DIR)) {
		const full = path.join(AUDIO_DIR, name);
		const stat = fs.statSync(full);
		if (stat.isFile() && name.endsWith('.mp3')) {
			out.push({ local: full, key: `cec/${name}`, ctype: 'audio/mpeg' });
		} else if (stat.isFile() && name === 'index.json') {
			out.push({ local: full, key: 'cec/index.json', ctype: 'application/json' });
		}
	}
	const enBrefDir = path.join(AUDIO_DIR, 'en-bref');
	if (fs.existsSync(enBrefDir)) {
		for (const name of fs.readdirSync(enBrefDir)) {
			if (name.endsWith('.mp3')) {
				out.push({
					local: path.join(enBrefDir, name),
					key: `cec/en-bref/${name}`,
					ctype: 'audio/mpeg'
				});
			}
		}
	}
	return keysFilter ? out.filter((j) => keysFilter.has(j.key)) : out;
}

async function uploadOne(token, { local, key, ctype }) {
	const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${key}`;
	// Use a ReadableStream so large MP3s don't require full in-memory buffering
	// and so that Node's fetch receives a proper body it can stream.
	const body = fs.createReadStream(local);
	const size = fs.statSync(local).size;
	const res = await fetch(url, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': ctype,
			'Content-Length': String(size)
		},
		body,
		// @ts-expect-error — duplex required when body is a stream in Node 18+
		duplex: 'half'
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
	}
}

async function main() {
	const concurrency = parseInt(
		process.argv.find((a) => a.startsWith('--concurrency='))?.slice(14) || '20',
		10
	);
	const token = getToken();
	const jobs = buildJobs();
	console.log(`uploading ${jobs.length} objects to r2://${BUCKET}/  (concurrency=${concurrency})`);

	const queue = jobs.slice();
	let ok = 0;
	let fail = 0;
	const failures = [];
	const t0 = performance.now();

	const reporter = setInterval(() => {
		const dt = ((performance.now() - t0) / 1000).toFixed(1);
		process.stdout.write(`[${dt}s] ok=${ok} fail=${fail} pending=${queue.length}\n`);
	}, 5000);

	async function worker() {
		while (true) {
			const job = queue.shift();
			if (!job) return;
			try {
				await uploadOne(token, job);
				ok++;
			} catch (e) {
				fail++;
				failures.push(`${job.key}: ${e.message}`);
			}
		}
	}

	await Promise.all(Array.from({ length: concurrency }, worker));
	clearInterval(reporter);
	const dt = ((performance.now() - t0) / 1000).toFixed(1);
	console.log(`done in ${dt}s: ok=${ok} fail=${fail}`);
	if (failures.length) {
		console.error('failures:');
		for (const f of failures.slice(0, 20)) console.error(`  ${f}`);
		process.exit(1);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
