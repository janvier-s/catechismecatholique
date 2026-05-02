#!/usr/bin/env tsx
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SIZES = [32, 48, 64, 96, 128, 192];
const SRC = 'scripts/data-sources/logos';
const OUT = 'static/img/logo';

interface Variant {
	src: string;
	baseName: string;
}

const variants: Variant[] = [
	{ src: 'catechisme-logo.png', baseName: 'logo' },
	{ src: 'catechisme-logo-white.png', baseName: 'logo-dark' }
];

mkdirSync(OUT, { recursive: true });

async function run() {
	for (const v of variants) {
		for (const size of SIZES) {
			await sharp(join(SRC, v.src))
				.resize(size, size, {
					fit: 'contain',
					background: { r: 0, g: 0, b: 0, alpha: 0 }
				})
				.webp({ quality: 90 })
				.toFile(join(OUT, `${v.baseName}-${size}.webp`));
			await sharp(join(SRC, v.src))
				.resize(size, size, {
					fit: 'contain',
					background: { r: 0, g: 0, b: 0, alpha: 0 }
				})
				.png()
				.toFile(join(OUT, `${v.baseName}-${size}.png`));
		}
	}
	console.log(`Optimized logos written to ${OUT}/ (${variants.length * SIZES.length * 2} files).`);
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
