import type { CalendrierYearKey } from './types';

/**
 * Mirrors readingsKey() in scripts/prepare/calendrier.ts - keep in sync.
 * The key readings are stored under: bare slug for a fixed feast (no cycle
 * variation), or "{yearKey}:{slug}" for a annee-scoped Sunday/feast.
 */
export function readingsKey(slug: string, yearKey?: CalendrierYearKey | 'I' | 'II'): string {
	return yearKey ? `${yearKey}:${slug}` : slug;
}

/**
 * Mirrors readingsFilename() in scripts/prepare/calendrier.ts - keep in sync.
 * Maps a readingsKey() value to the filesystem/URL-safe filename it was
 * written under.
 */
export function readingsFilename(key: string): string {
	return key.replace(':', '--');
}
