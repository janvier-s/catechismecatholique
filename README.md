# Le Catéchisme

A French-language website for the Catéchisme de l'Église catholique.

## Stack

- SvelteKit 2 + Svelte 5 (runes-only)
- TypeScript, Tailwind CSS 3
- Cloudflare Pages

## Develop

```
npm run dev
```

## Build

```
npm run build
```

### Concordance source (optional)

The `prepare-data` step builds `static/data/ccc/concordance-verse-index.json`
from a Catholic biblical concordance source tree. The default location is
`../DOCTRINA/sources/didache/` (relative to the repo). Override with the
env var `DIDACHE_SOURCE_DIR=/absolute/path`. If the directory is missing,
the build emits an empty index and continues; the concordance UI layer
then has no data to show but does not fail.

## Reference

Design spec: `../douayrheimsbible/docs/superpowers/specs/2026-05-02-catechisme-fr-design.md`
