# API expansion · design

Date: 2026-09-02
Status: approved, ready for implementation planning

## Problem

The site holds the richest study apparatus of any catechism edition online: a
cross-reference graph, a thematic vocabulary, a footnote/source apparatus, a
Bible verse index in both directions, a liturgical calendar mapping, and
mappings onto the Compendium, the Enchiridion Symbolorum, and the
Compendium de la doctrine sociale. Thirteen study-panel tabs consume it.

The public API exposes almost none of it. Two routes exist:

- `GET /api/cec/[number]` · text, cross_refs, bible_refs, citations,
  magisterial_refs, breadcrumb, prev/next
- `GET /api/search?q=` · MiniSearch over CCC, Compendium, CDSE

Worse, neither route sends a CORS header, so the documented public API cannot
be called from a browser on any other origin. Every client-side consumer is
blocked at the first request.

## Audience and scope

**Primary audience: app and site developers.** People building a parish app, a
study tool, a bot. They want small cacheable JSON endpoints, stable field
names, CORS, and predictable errors.

**Secondary, at near-zero extra cost: LLM and agent tooling.** What an agent
needs (an OpenAPI document, plain text alongside HTML, batch fetch, stable
fields) is what a good developer API needs anyway. One artifact serves both.
An MCP server and semantic search are explicitly **out of scope** · both are
separate projects, and an MCP server should wrap these HTTP routes rather than
reimplement them.

**Corpus scope: CCC deep first.** Make the CCC endpoints genuinely rich. Other
corpora appear only where they point back at CCC (Compendium, Denzinger,
CDSE blocks). A generic per-corpus reader for the other ~20 works is
out of scope for this iteration.

## Approach

Thin SvelteKit `+server.ts` routes over the existing `$lib/data/loaders`
functions, exactly as `/api/cec/[number]` works today. No data duplication, no
second source of truth.

Rejected: precomputing responses into `static/` at build time. `static/` is at
~15600 files against Cloudflare Pages' 20000 cap, and `?include=` combinations
are exponential, so it would defeat the response design.

Held in reserve: promoting an individual endpoint to a build-time artifact if
it measures slow. Not done pre-emptively.

## Versioning

Routes stay unversioned. The project commits in writing to **additive-only**
changes to documented fields; a future breaking change would land as
`/api/v2`. Introducing `/api/v1` now would orphan the existing public URLs for
no gain. Section "Testing" makes the additive-only promise enforceable rather
than aspirational.

## Route inventory

### Extended, additive

| Route | Change |
| --- | --- |
| `GET /api/cec/{n}` | gains `?include=` |
| `GET /api/search?q=` | gains `corpus=`, `limit`, `offset`, CORS |

Existing URLs keep working byte-for-byte when no new parameter is passed.

### New · paragraph access

| Route | Returns |
| --- | --- |
| `GET /api/cec?numbers=1,2,3` or `?range=1-25` | batch fetch, capped at 50 items, same per-item shape as the single route, honours `include` |

### New · entry points

| Route | Returns |
| --- | --- |
| `GET /api/bible/{book}/{chapter}/{verse}` | CCC paragraphs citing that verse; `verse` optional for a whole chapter |
| `GET /api/liturgie/{YYYY-MM-DD}` · `GET /api/liturgie/today` | the day's celebration, season, liturgical colour, and the CEC clusters proposed for meditation |
| `GET /api/themes` · `GET /api/themes/{slug}` | the thematic vocabulary with counts; the paragraphs for one tag |
| `GET /api/structure?depth=` | the table-of-contents tree from `structure-toc.json` |
| `GET /api/glossary` · `GET /api/glossary/{slug}` | the 947 entries grouped by cluster; a single entry |

### New · machine-readable

| Route | Returns |
| --- | --- |
| `GET /api/openapi.json` | OpenAPI 3.1 document covering every route above |

### Explicitly not built

A bulk cross-reference network endpoint (`/api/graph`). The reverse edges are
already served per-paragraph via `include=cited_by`, and assembling the forward
edges in bulk would require reading all 2865 paragraph files at runtime · not
viable under the chosen approach, and would force a build-time artifact for a
use case nobody has requested. Instead, the `/api` page gains a short "données
brutes" note pointing at `/data/cec/cited-by.json`, which is already a public
static file. If a real requirement appears, build it then.

## The `include` mechanism

Available on `GET /api/cec/{n}` and the batch route.

**Blocks:** `cited_by` · `themes` · `sources` · `liturgy` · `compendium` ·
`en_bref` · `bible` · `cdse` · `denzinger` · `ai` · `all`

`all` expands to every block **except** `ai`, so nine blocks.

A `trent` block was listed in an earlier draft and has been **removed**: there
is no CCC-to-Trent index in the data. `TabTrentNotes.svelte` uses
`loadNclBook`, so it is a Bible-notes tab shown while reading Trent, not a
mapping from CCC paragraphs. `static/data/trent/` holds only `chapters`,
`sections`, `paragraph-context`, and `structure.json`. Building such a mapping
would be a data project, not an API task.

**Parsing.** Comma-separated, order-insensitive, deduplicated. An unknown name
is a `400` with code `unknown_include`, naming the offending value and listing
the valid ones. Silently ignoring a typo ships broken clients.

**Assembly.** One function per block under `src/lib/server/api/blocks/`, each
with the signature `(n: number, fetch: Fetch) => Promise<unknown>`, registered
in a single map. Requested blocks resolve through `Promise.all`, so a wide
`include` costs one round of parallel subrequests rather than a serial chain.
Adding a block later is one file plus one map entry.

**Placement.** Blocks land as top-level sibling keys, never nested under an
`includes` wrapper. A field is either present or absent, and a client adding a
block later does not restructure its parsing.

```json
{
  "number": 2559,
  "text": "…",
  "cross_refs": [2098],
  "themes": [{ "name": "Prière", "slug": "priere", "glossary_url": "/glossaire/priere" }],
  "sources": [{ "category": "…", "doc_name": "…" }]
}
```

**Failure isolation.** A block whose loader throws does not fail the response.
It returns as `null`, and its name is appended to a top-level `partial` array.
A study app requesting eight blocks must not lose the paragraph text because
one liturgy shard 404'd.

**Cost control.** An explicitly enumerated `include` is capped at 8 blocks per
request. `all` is exempt from that cap · it is a single deliberate token that
expands to the nine non-`ai` blocks, and rejecting it would make the shorthand
useless. On the batch route, `numbers.length × resolved block count` is capped
at 100 block-fetches; over that, a `400` with code `too_many_blocks` explaining
how to split the request. So `?range=1-50&include=all` is rejected (500
fetches), while `?range=1-10&include=all` is served.

**AI content.** The `ai` block serves the generated explanations from
`static/data/cec/ai/`. It is excluded from `all`, never present by default, and
its payload carries `"generated": true` alongside a provenance note naming it
as commentary rather than magisterial text. This exists so that consuming tools
cannot re-cite generated prose as if it were the Catechism.

## Slugs in responses

**Rule: a slug ships only if it is dereferenceable** · via an API route or a
public site URL. Theme, glossary, and chapter slugs qualify. Internal
identifiers do not.

A slug earns its place by doing one of three jobs: it is the stable key that
survives a display-name copy edit; it is the argument to the follow-up request;
it is the deep link back to the site.

**Theme slugs and glossary slugs are one namespace.** `TabThemes.svelte` links
each theme to `/glossaire/{slug}`. `/api/themes/{slug}` and
`/api/glossary/{slug}` are therefore two views of one identifier. The docs must
state this, and the `themes` block carries the glossary URL rather than leaving
clients to infer it.

## Contract

### CORS

Set in `hooks.server.ts` for `/api/*`. Not in `_headers`, which is scoped to
static assets while these are Worker responses.

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Max-Age: 86400
```

Read-only public data, no credentials, no cookies · `*` is correct and carries
no risk. The same header is added to `/data/*` in `_headers`, so the raw JSON
files the docs point at are actually fetchable cross-origin.

### Errors

Today's `{ "error": "…" }` French message is kept and a machine-readable `code`
is added beside it, so clients branch on a token rather than string-matching
French prose.

```json
{
  "error": "Numéro de paragraphe invalide : le Catéchisme va de 1 à 2865.",
  "code": "paragraph_out_of_range"
}
```

Codes: `paragraph_out_of_range`, `unknown_include`, `too_many_blocks`,
`bad_date`, `unknown_slug`, `unknown_book`, `query_too_short`.

Additive · existing consumers reading only `error` are unaffected.

### Caching

Every route except one is static between deploys, so the existing
`max-age=3600, s-maxage=86400` carries over. `include` lives in the query
string, which is part of the cache key, so variants cache independently.

`/api/liturgie/today` is the exception: `max-age` is computed as the seconds
remaining until the next midnight Europe/Paris, capped at 3600. A longer value
would leave a consumer's "paragraph of the day" stale past the date rollover.

### Limits

No rate limiting. Edge caching absorbs repeat traffic, the `include` caps bound
the worst single request, and Cloudflare's WAF is available if the API is ever
actually abused.

## New data required

`/api/liturgie/{date}` needs a build-time index that does not exist today.

`static/data/calendrier/cec/{bucket}.json` is sharded **by paragraph**; each
shard carries complete occasion objects including their clusters, but there is
no map from a liturgical day to its occasion, so a date lookup would otherwise
require scanning all 29 shards.

`scripts/prepare-data.ts` gains an emitted
`static/data/calendrier/cec/by-occasion.json`. It is keyed
`` `${cycle ?? ''}:${slug}` ``, **not** by slug alone: the same Sunday appears in
cycles A, B and C with different clusters, and `buildCecLiturgyIndex` already
uses exactly this composite identity internally. A slug-only key would collide
and serve the wrong year's paragraphs.

`/api/liturgie/{date}` then resolves: date → `dates-index.json` → `{slug,
yearKey}` → `by-occasion.json` → clusters, falling back to the cycle-less key
for fixed feasts and date-proper days, which carry no `yearKey`.

The occasion derivation is extracted from `buildCecLiturgyIndex` into a shared
`toCecLiturgyOccasion` helper so the two builders cannot drift.

This is the only new data artifact in the design.

## Documentation and discoverability

The failure mode with 9 routes and 10 include blocks is drift between
`/api/openapi.json`, the `/api` page, and the implementations.

`src/lib/server/api/spec.ts` is the single source of truth, holding route
paths, parameters, error codes, and one example response per route. From it:

- `/api/openapi.json` serialises the OpenAPI 3.1 document
- the `/api` page renders its **route reference table**; the surrounding French
  prose stays hand-written, because generated prose reads like generated prose
- `llms.txt` gains a line pointing at `/api/openapi.json`

`spec.ts` is hand-maintained. Deriving OpenAPI schemas from route
implementations would require a heavyweight library and is not worth it here.
What the module buys is that exactly one hand-maintained place exists, and the
spec-coverage test below makes drift fail the build.

## Testing

Existing setup: vitest (`tests/unit/`, node environment,
`expect.requireAssertions: true`) and Playwright (`tests/e2e/`).

**The load-bearing test is the no-breaking-change guard.** `GET /api/cec/2559`
with no query string must return exactly today's key set · no additions, no
removals. Same for `GET /api/search?q=`. This is what converts the
additive-only versioning promise into something enforced.

Beyond that:

- **Unit** · `include` parsing (dedup, `unknown_include`, `too_many_blocks`);
  date parsing and the Europe/Paris midnight calculation; Bible book
  normalisation; the dereferenceable-slug rule.
- **Spec coverage** · every path in `spec.ts` resolves to a real route, and
  every `/api` route appears in `spec.ts`. Bidirectional, so drift in either
  direction fails `npm run test`.
- **Block isolation** · a block whose loader throws yields `null` plus a
  `partial` entry, and the paragraph text still comes back.
- **E2E** · one Playwright pass per entry point against a built app, asserting
  status, `content-type`, and the presence of the CORS header. The CORS
  assertion matters specifically because it is invisible to unit tests and is
  the thing that is silently broken today.

## Out of scope

- MCP server (should wrap these routes; separate project)
- Semantic or vector search (needs embeddings and a vector store)
- A generic per-corpus reader for the other ~20 works
- Write access of any kind
- Authentication, API keys, quotas
