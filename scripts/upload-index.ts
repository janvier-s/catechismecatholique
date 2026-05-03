// @ts-nocheck — build script run with tsx
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const FILE = join(ROOT, 'static/data/search/search-index.json');
const KEY = 'search-index';

function main() {
	const size = statSync(FILE).size;
	console.log(`Uploading ${KEY} (${(size / 1024).toFixed(1)} KB)…`);
	execSync(`npx wrangler kv key put --remote --binding=SEARCH_INDEX "${KEY}" --path="${FILE}"`, {
		stdio: 'inherit'
	});
	console.log(`✓ ${KEY} uploaded`);
}

main();
