# CCC audio — design

Generate a delightful three-voice audio rendering of the Catéchisme de l'Église catholique in French. Two deployment targets share one source-of-truth manifest:

- **V1** — per-paragraph MP3s consumed inline by the SvelteKit reader at `static/audio/cec/`. Includes every paragraph (italic "en bref" paragraphs render identically to regular paragraphs) plus one extra combined `ccc_eb_{chapter_slug}.mp3` per chapter for the study-panel "En bref" tab. Gitignored, generated locally.
- **V2** — full audiobook in iCloud at `~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/AUDIO/CCC/`. Includes headings (chapter / article / heading2) with paragraph-range announces, paragraphs, and En brefs, plus an ordered playlist.

## Phasing

This spec is full-design for both targets, but implementation lands in two phases:

- **Phase 1 (this implementation cycle): V1 only.** Build the manifest, render V1 MP3s into `static/audio/cec/`, emit the audio index. Run all lints and audits. Ship in-reader playback.
- **Phase 2 (separate cycle): V2.** Render the audiobook (heading announces, range announces, en-bref grouping, playlist) into iCloud. Phase 2 will revisit edge cases the user has flagged around grouping AND will decide on a non-flat iCloud directory structure — iCloud has previously deleted contents of large flat directories without warning. Bucketing by hundred-block (e.g. `CCC/00xx/`) or by part/section is preferable; final layout is a Phase 2 decision.

Audio generation runs locally — no Cloudflare-side rendering. V1 assets sit in `static/audio/cec/` (gitignored) for the SvelteKit dev server and Cloudflare Pages deploy to serve as static files.

## Pipeline shape

```
chapters-full/*.json  ─┐
                       ├─►  build-ccc-manifest.py  ──►  ccc_audio.manifest.json
paragraphs/{n}.json   ─┘            │                  ccc_audio.citation_audit.csv
                                    │                  ccc_audio.leakage_report.txt
                                    │
                                    ├──► render-ccc-audio.py --target v2
                                    │       ↓ all entries
                                    │       → ~/.../iCloud/AUDIO/CCC/*.mp3 + playlist
                                    │
                                    └──► render-ccc-audio.py --target v1
                                            ↓ paragraphs + en brefs only
                                            → static/audio/cec/*.mp3 + index.json
```

Two stand-alone Python scripts under `scripts/`. Each accepts `--start-seq`, `--end-seq`, `--dry-run`, plus target-specific flags.

The deprecated `ccc_audio.json` and `ccc_audio_dual.json` are deleted; nothing in the new pipeline reads them.

## Voices

| Voice | Edge-TTS name | Opts | Role |
|---|---|---|---|
| Gérard | `fr-BE-GerardNeural` | `--volume=-10%` | Announces ("Paragraphe N.", "Chapitre X : …", "Paragraphes X à Y.", "Citation de …", "En bref.") |
| Rémy | `fr-FR-RemyMultilingualNeural` | `--rate=-10%` | Paragraph and en-bref body |
| Fabrice | `fr-CH-FabriceNeural` | `--volume=-10%`, `--rate=-10%` | Cited text |

**Pitch + rate variation on Gérard's V1 "Paragraphe N." announce only** (NOT on V2 heading announces — those play once per chapter and should not drift):

- Pitch: random Hz in `[-8, +8]`; `|pitch_n − pitch_{n-1}| ≤ 4`
- Rate: random percent in `[-5, +5]`; `|rate_n − rate_{n-1}| ≤ 2`
- `--seed` flag for deterministic output

These stack with the base VOICE_OPTS at render time (e.g. `--volume=-10% --pitch=+3Hz --rate=-2%`).

## Manifest schema

```json
{
  "version": 1,
  "generated_at": "ISO-8601",
  "source": "static/data/cec/chapters-full",
  "voices": { "gerard": "fr-BE-GerardNeural", "remy": "fr-FR-RemyMultilingualNeural", "fabrice": "fr-CH-FabriceNeural" },
  "voice_opts": {
    "gerard":  { "volume": "-10%" },
    "remy":    { "rate":   "-10%" },
    "fabrice": { "volume": "-10%", "rate": "-10%" }
  },
  "entries": [ /* see below */ ]
}
```

### Entry shapes

**Paragraph (regular):**
```json
{
  "seq": 3,
  "kind": "paragraph",
  "number": 1,
  "file_number": "0001",
  "location": {
    "part_slug": "prologue",
    "part_title": "Prologue",
    "section_slug": null,
    "chapter_slug": null,
    "chapter_title": null,
    "article_number": null,
    "heading2_title": null
  },
  "segments": [
    { "voice": "gerard", "text": "Paragraphe 1.",        "targets": ["v1"] },
    { "voice": "remy",   "text": "Dieu, infiniment …",   "targets": ["v1", "v2"] },
    { "voice": "gerard", "text": "Citation de Sainte Augustin :", "targets": ["v1", "v2"] },
    { "voice": "fabrice","text": "…",                    "targets": ["v1", "v2"] }
  ]
}
```

V1 renders all segments. V2 drops `targets=["v1"]` segments — body and citation only.

**En bref paragraphs are plain paragraphs.** They're CCC paragraphs (§44, §45, …) whose source `text_html` is wholly wrapped in `<i class="typo_italic">`. Detection rule: outer `<span>` strip → starts with `<i class="typo_italic">` AND ends with `</i>`. Initial exclusion list: `{22}` (meta-paragraph explaining what en brefs are). Manifest builder prints the detected cluster list to stdout as part of `--lint` output — eyeball it for false positives before generating audio.

Italic-wrapped paragraphs render identically to other paragraphs (same `"Paragraphe N."` V1 announce, same body voice). The italic flag is stored only as `is_en_bref: true` in `audio-index.json` for the reader UI to use (styling, grouping into the En bref tab).

**En bref combined entry (V1 only, one per chapter that has en bref paragraphs):**
```json
{
  "seq": 250,
  "kind": "en_bref_combined",
  "chapter_slug": "1-homme-est-capable-de-dieu",
  "file_number": "eb_1-homme-est-capable-de-dieu",
  "paragraph_range": [44, 49],
  "location": { … },
  "segments": [
    { "voice": "gerard", "text": "En bref.",              "targets": ["v1"] },
    { "voice": "remy",   "text": "Le désir de Dieu…",     "targets": ["v1"] },
    { "voice": "remy",   "text": "Quand l'homme écoute…", "targets": ["v1"] },
    …
  ]
}
```

This is an additional asset that backs the study panel's "En bref" tab — one combined file per chapter, no per-paragraph "Paragraphe N." announces, just a single Gérard "En bref." opener then Rémy reading each italic paragraph back-to-back. Gap between bodies is 350 ms. Not produced for V2 (V2 handles "En bref" differently — see V2 deferred notes below).

**V2 "En bref" header (Phase 2, deferred):** Treated as a header-level entry, analogous to chapter/article/heading2. Inserted in V2 flow before each chapter's first italic-wrapped paragraph. Segments: `[gerard "En bref."]` + optional `[gerard "Paragraphes X à Y."]`. Final wording and whether to include the range decided in Phase 2.

**Heading (V2 only, levels: chapter / article / heading2):**
```json
{
  "seq": 1, "kind": "heading", "level": "chapter",
  "file_number": "h0001",
  "paragraph_range": [27, 49],
  "location": { … },
  "segments": [
    { "voice": "gerard", "text": "Chapitre 1 : L'homme est « capable » de Dieu.", "targets": ["v2"] },
    { "voice": "gerard", "text": "Paragraphes 27 à 49.",                            "targets": ["v2"] }
  ]
}
```

Level phrasing:
- `chapter` → `Chapitre N : {title}.`
- `article` → `Article N : {title}.`
- `heading2` → `{title}.` (the leading Roman numeral, e.g. `I. Le désir…`, becomes `Un. Le désir…` via Roman→French ordinal)

Part and section level headings are NOT emitted as V2 audio entries — listeners get oriented by the chapter announce that opens each new structural block.

The "Paragraphes X à Y." segment uses the same number-spell-out rule as "Paragraphe N.", applied **independently to each of X and Y** (a number with tens-digit 7, 8, or 9 is spelled out in French words; otherwise digits). So `Paragraphes 68 à 73.` becomes `Paragraphes 68 à soixante-treize.` — mixed forms are accepted.

## Text cleaning pipeline (manifest builder)

Applied identically to body text and citation text. Order matters.

1. Strip `<sup class="srcRef …">` (both docRef and bibleRef variants)
2. Strip remaining HTML, normalize whitespace and French punctuation spacing
3. `fix_saint_liaison` — `saint <vowel|h>` → `sainte` (so "saint Augustin" → "Sainte Augustin", "saint Hippolyte" → "Sainte Hippolyte"). Preserved from existing code.
4. Per-paragraph `TEXT_REPLACE` overrides — Latin phonetic transliterations and small fixes. Preserved from existing code.
5. `general_replacements` — Greek script substitutions (`kyrios` → `κύριος`, `ekklèsia` → `ἐκκλησία`, etc.) and broader Latin/French pronunciation fixes. Preserved from existing code.
6. `strip_annotations` — parenthesized doc-sigla references (DS, PG, PL, LG, GS, etc.), `(voir …)` blocks, bible-only parens
7. `expand_bible_refs` — `Mt 28:19` etc., preserved
8. `convert_roman_numerals` — `IIe siècle` → `deuxième siècle`, etc., preserved
9. `strip_ref_parens` (body only) and `strip_trailing_parens` (citation only) with the `KEEP_TRAILING_PAREN` exception set

### §1513 and §2854 — French, not Latin phonetic

Both have explicit `TEXT_REPLACE` entries. The Latin block in the source is replaced verbatim with the user-approved French:

**§1513** Latin block → `« Par cette onction sainte, que le Seigneur, en sa grande bonté vous réconforte par la grâce de l'Esprit Saint. Ainsi, vous ayant libéré de tous péchés, qu'Il vous sauve et vous relève. »`

**§2854** Latin block → `Délivre-nous de tout mal, Seigneur, et donne la paix à notre temps ; par ta miséricorde, libère-nous du péché, rassure-nous devant les épreuves en cette vie où nous espérons le bonheur que Tu promets et l'avènement de Jésus-Christ, notre Sauveur.`

(Both are already present in the current `transform-ccc-json.py` `TEXT_REPLACE` dict; carry them over unchanged.)

## Citation announce — three-tier author derivation

For each citation, derive the announce string. First match wins.

### Tier 1 — structured extraction from `magisterial_refs.raw`

**Matching MUST use the full `raw` string, not prefix or substring matching.** Ambiguous bare-work-title entries (`Poes. 9`, `Or. 2:71 *`, isolated `Catech. R. *`) must include the author or be removed from the override map. The §227 trap (`Poes. 9` → Grégoire, when the actual citation is St. Teresa of Ávila) only existed because of substring matching; tighten the matcher and re-key the overrides.

| `mref.type` | Match | Output (example) |
|---|---|---|
| `patristic` | `raw` starts with `saint(?:e)? <Name>` | `Citation de Sainte Augustin :` (after `fix_saint_liaison`) |
| `magisterial` | `raw` starts with a known papal name | `Citation du pape saint Jean-Paul 2 :` |
| `magisterial` | `raw` exact-matches an `AUTHOR_MAP` key | `Citation du Catéchisme Romain :` |
| `magisterial` | `raw` starts with doc sigla (DV, GS, LG, SC, …) → expand via sigla map | `Citation de la constitution dogmatique Dei Verbum :` |
| `conciliar` | `raw` starts with `concile de X` | `Citation du concile de Trente :` |
| `liturgical` | `raw` starts with known liturgy phrase | `Citation du Pontifical romain :` |
| `liturgical` | `raw` starts with `« … »` (prayer title) | `Citation liturgique :` |
| `ds` | always | `Citation du Denzinger :` |
| `canon_law` | always | `Citation du Code de droit canonique :` |

### Tier 2 — body scan (any type, when Tier 1 yields no human author)

Trigger when Tier 1's match for the citation's `mref` does not yield a saint/papal/conciliar name (i.e. Tier 1 either produced a generic by-type intro like `Citation liturgique :` or nothing). Look in the paragraph body for the pattern `saint(?:e)? [A-Z]\w+( de \w+)?` adjacent to a verb in `{ affirme, parle, écrit, dit, enseigne, raconte }` in the sentence immediately preceding the citation marker. Use the detected author. Examples: §32 → `Citation de saint Paul :`. §53 → `Citation de Sainte Irénée de Lyon :`. Works across all mref types — not just patristic — since e.g. a liturgical or magisterial citation can still have a saintly author named in the body.

### Tier 3 — type-generic fallback

| type | output |
|---|---|
| patristic | `Citation patristique :` |
| magisterial | `Citation magistérielle :` |
| conciliar | `Citation conciliaire :` |
| liturgical | `Citation liturgique :` |
| ds | `Citation du Denzinger :` |
| canon_law | `Citation du Code de droit canonique :` |
| (none) | `Citation :` |

### Sigla map (Tier 1 magisterial expansion) — initial entries

| Sigla | Expansion |
|---|---|
| DV | constitution dogmatique Dei Verbum |
| LG | constitution dogmatique Lumen Gentium |
| GS | constitution pastorale Gaudium et Spes |
| SC | constitution Sacrosanctum Concilium |
| NA | déclaration Nostra Ætate |
| CD | décret Christus Dominus |
| AA | décret Apostolicam Actuositatem |
| AG | décret Ad Gentes |
| OT | décret Optatam Totius |
| PO | décret Presbyterorum Ordinis |
| CT | exhortation Catechesi tradendæ |
| FC | exhortation Familiaris Consortio |
| RH | encyclique Redemptor Hominis |
| SRS | encyclique Sollicitudo Rei Socialis |
| CA | encyclique Centesimus Annus |
| CIC | Code de droit canonique |
| CCEO | Code des canons des Églises orientales |

(Sigla list is the same one in `transform-ccc-json.py`'s `DOC_SIGLA_PATTERN`; expansion text TBD per entry.)

## Phonetic spelling for Latin/foreign words in announces

Gérard reads citation intros and heading announces. Latin proper names ("Dei Verbum", "Lumen Gentium", "Denzinger") will mispronounce. The manifest builder applies a phonetic substitution table to announce text BEFORE writing the manifest.

**Review needed** — proposed phonetics, user red-pens:

| Original | Proposed phonetic | User review |
|---|---|---|
| Dei Verbum | Déi Vèrboum | ✓ |
| Denzinger | Dènntzingueur | ✓ |
| Lumen Gentium | Loumène Gènntsioum | ✓ |
| Sacrosanctum Concilium | Sacrosannctoum Conntchilioum | ✓ |
| Gaudium et Spes | Gaoudioum ète Spès | ✓ |
| Nostra Ætate | Nostra Étaté | ✓ |
| Christus Dominus | Kristousse Dominousse | ✓ |
| Apostolicam Actuositatem | Apostolikame Actouositatème | ✓ |
| Ad Gentes | Ade Gènntèsse | ✓ |
| Optatam Totius | Optatame Totiousse | ✓ |
| Presbyterorum Ordinis | Présbytéroroum Ordinisse | ✓ |
| Catechesi tradendæ | Catékézi tradènndé | ✓ (already in body map) |
| Evangelii nuntiandi | Évannguélii nounncianndé | ✓ (already in body map) |
| Sacram unctionem infirmorum | Sacrame ounnktsionème innfirmoroum | ✓ |
| Humani Generis | Houmani Génnérisse | ✓ |
| Pontificale Romanum | Ponntifikalé Romanoum | ✓ |
| Donum Vitæ | Donoume Vité | ✓ |
| Centesimus Annus | Tchènntézimousse Annousse | ✓ |
| Redemptor Hominis | Rédèmptor Hominisse | ✓ |
| Sollicitudo Rei Socialis | Sollicitoudo Réi Sotsialisse | ✓ |
| Familiaris Consortio | Familiarisse Conssortio | ✓ |

These flow into a new `INTRO_LATIN_REPLACE` table in the manifest builder.

## Gaps & playlist (V2)

V2 paragraph MP3s each contain only intra-paragraph segments separated by 200 ms (today's gap). Between MP3s, gap is encoded in the playlist:

```json
{
  "parts": [
    {
      "part_title": "Première partie : La profession de la foi",
      "chapters": [
        {
          "chapter_title": "L'homme est « capable » de Dieu",
          "entries": [
            { "file": "0001_ccc_h0001.mp3", "kind": "heading", "duration_ms": 4200, "post_gap_ms": 600 },
            { "file": "0002_ccc_0027.mp3", "kind": "paragraph", "duration_ms": 31000, "post_gap_ms": 350 },
            { "file": "0003_ccc_0028.mp3", "kind": "paragraph", "duration_ms": 27000, "post_gap_ms": 350 },
            …
          ]
        }
      ]
    }
  ]
}
```

Post-gap rules:
- After heading: 600 ms
- Between paragraphs: 350 ms
- Between en-bref entries within a group: 350 ms
- After last en bref of a chapter → next chapter heading: 1000 ms

For Apple Books / Audible-style consumption, an optional `--concat` flag on the renderer produces one MP3 per chapter with these gaps baked in. Default is per-entry MP3s + JSON playlist.

## ID3 tags

Both targets, applied at render time via `mutagen`:

| Tag | Paragraph | En bref combined (V1) | Heading (V2) |
|---|---|---|---|
| TIT2 (title) | `CCC §N` | `CCC en bref — {chapter title}` | heading title verbatim |
| TALB (album) | chapter title | chapter title | chapter title |
| TPE1 (artist) | `Catéchisme de l'Église catholique` | same | same |
| TRCK (track) | seq zero-padded | seq zero-padded | seq zero-padded |
| TCON (genre) | `Speech` | `Speech` | `Speech` |
| COMM (comment) | first 80 chars of body | (empty) | (empty) |

## Output naming & layout

**V2 (audiobook, iCloud) — Phase 2, layout TBD:**
- Base dir: `~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/AUDIO/CCC/`
- **Subdivision required** — iCloud has previously deleted entire flat-directory contents. Phase 2 must split files across sub-buckets (likely hundred-block `00xx/`, `01xx/`, … sized to keep each dir under a couple hundred files). Final scheme decided in Phase 2.
- Filename pattern (within whichever bucket): `{seq:04}_ccc_{file_number}.mp3`
  - Paragraph: `0003_ccc_0001.mp3`
  - Heading: `0001_ccc_h0001.mp3`
  - En bref: `0060_ccc_0044.mp3` (same pattern as paragraph — they ARE numbered paragraphs)
- Playlist: `ccc_playlist.json` at the base dir, with bucket-aware file paths

**V1 (in-repo, in-reader) — flat dir:**
- `static/audio/cec/` (gitignored)
- Filename: `ccc_{file_number}.mp3` (no seq prefix — V1 doesn't sequence; stable URL = stable name)
  - Paragraph (incl. italic en-bref paragraphs): `ccc_0001.mp3`, `ccc_0044.mp3`
  - En bref combined: `ccc_eb_{chapter_slug}.mp3` (e.g. `ccc_eb_1-homme-est-capable-de-dieu.mp3`)
- Audio index: `static/audio/cec/index.json`:
  ```json
  {
    "paragraphs": {
      "1": { "file": "ccc_0001.mp3", "duration_ms": 24500, "has_citation": false, "is_en_bref": false },
      "44": { "file": "ccc_0044.mp3", "duration_ms": 8200, "has_citation": false, "is_en_bref": true },
      …
    },
    "en_bref_combined": {
      "1-homme-est-capable-de-dieu": { "file": "ccc_eb_1-homme-est-capable-de-dieu.mp3", "duration_ms": 45000, "paragraphs": [44, 45, 46, 47, 48, 49] },
      …
    }
  }
  ```
  SvelteKit reader reads this to build single-paragraph players, range playlists like `/cec/201-205`, and the study panel's "En bref" tab (which uses the combined file, not the individual italic paragraphs).

**Sidecars** at `~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/JSON/CCC/`:
- `ccc_audio.manifest.json` — the manifest
- `ccc_audio.citation_audit.csv` — one row per citation, for human review
- `ccc_audio.leakage_report.txt` — Latin/Greek leakage lint output

## Linting & audit (gates audio generation)

### French-spellcheck-based leakage detection

Replaces the stopword-dictionary approach. After manifest is built, scan every `segments[].text`:

1. Strip Greek-script characters (those are intentional `general_replacements` outputs).
2. Strip everything in the phonetic and TEXT_REPLACE substitution maps.
3. Strip the announce text vocabulary (`Citation`, `Paragraphe`, `Chapitre`, `Article`, `En bref`, etc.).
4. Run the remainder through `hunspell -d fr_FR` (or `pyhunspell`).
5. Collect unknown words, subtract a known-good allowlist (proper nouns: `Yahvé`, `Augustin`, `Aquin`, `Christ`, `Marie`, French neologisms hunspell doesn't ship, etc.).
6. Remaining unknown words are flagged in the report with their paragraph and entry context.

The report distinguishes:
- **Greek script remaining** (intentional, expected) — no action
- **Romanized Greek / Latin slipping through** (`kyrios`, `theologia`, `Dei Verbum` in unmapped contexts) — must fix

Non-empty unknown-word section blocks audio generation. The renderer refuses to run until the report is clean OR the user passes `--accept-leakage=<sha>` recording the hash of an audited report.

### Citation attribution audit

CSV at `ccc_audio.citation_audit.csv`:

```
paragraph,citation_index,mref_type,mref_idx,mref_raw,tier_used,derived_intro
27,0,magisterial,a,"GS 19, § 1",1,"Citation de la constitution pastorale Gaudium et Spes :"
30,0,patristic,a,"saint Augustin, confessiones 1:1, 1",1,"Citation de Sainte Augustin :"
32,0,patristic,a,"sermones 241:2 : PL 38:1134",2,"Citation de saint Paul :"
53,0,patristic,b,"adversus hæreses 3:20, 2",2,"Citation de Sainte Irénée de Lyon :"
227,0,patristic,a,"Poes. 9",3,"Citation patristique :"
…
```

`tier_used` of 2 (body scan) and 3 (generic fallback) deserve special attention. The renderer refuses to run unless `--accept-audit=<sha>` records the audited CSV's hash.

### Phonetic table review

Spec leaves the Dei Verbum / Denzinger / Lumen Gentium / etc. table TBD with proposed phonetics. User red-pens, values feed `INTRO_LATIN_REPLACE` in the manifest builder. No audio generation until the table is signed off (no specific gate; expected to be settled before any V2 audiobook render).

## Edge cases — resolved-by-construction or explicitly handled

| Case | Resolution |
|---|---|
| §2275 / §2775 typo in deprecated audio.json | Gone — manifest builder reads `chapters-full/` + `paragraphs/`, never the buggy intermediate. §2775 is §2775. |
| Empty body (§21, §118) | Body segment omitted when cleaned text is empty. Entry goes announce → citation. |
| Multi-citation paragraphs (§53, §156, etc.) | Citations rendered in source `citations[]` order. Each gets its own intro + body segment pair. |
| Citation ending with `)` | `strip_trailing_parens` with the `KEEP_TRAILING_PAREN` exception set (initially `{260, 469}`; may grow during audit review). |
| Citation referencing inline doc-ref idx | `match_citations` excludes mrefs whose idx appears in `text_html` as `data-idx`; remaining mrefs match citations[] in order. |
| AUTHOR_MAP false positives | Full-string matching only; ambiguous bare-work-title keys removed or re-keyed with author. §227 (`Poes. 9`) falls through to Tier 3 generic. |
| Roman-numeral heading2 ordinal | `convert_roman_numerals` produces French ordinal words. Existing rule, preserved. |
| Sequential pitch monotony on Gérard | Pitch + rate jitter on V1 "Paragraphe N." announces only. State persists across the render run. |

## Phase 1 smoke-test plan (V1 only)

1. `python scripts/build-ccc-manifest.py --lint`. Iterate until leakage report is clean.
2. Review `ccc_audio.citation_audit.csv` end-to-end. Pay close attention to `tier_used ∈ {2, 3}` rows. Spot-check a handful of Tier 1 rows too.
3. Phonetic table already approved (see table above); manifest builder applies `INTRO_LATIN_REPLACE`.
4. Render smoke subset — Prologue paragraphs only: `python scripts/render-ccc-audio.py --target v1 --end-paragraph 25`.
5. Listen end-to-end in the SvelteKit reader: voice consistency, pitch+rate jitter on Gérard's "Paragraphe N." announces, citation intros, body cleanliness. Also render and audit at least one chapter's `ccc_eb_*` combined file once the prologue smoke pass is clean (Prologue has no en brefs, so pick chapter 1 of section 1 for the en-bref smoke).
6. Approve audit + leakage hashes. Render the rest of V1 (split into paragraph-range batches if iCloud-style monitoring is desired locally).
7. Phase 2 (V2 audiobook) gets its own smoke-test plan when that spec lands.

## File deletions

- `~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/JSON/CCC/ccc_audio.json` (deprecated)
- `~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/JSON/CCC/ccc_audio_dual.json` (deprecated intermediate)
- `scripts/transform-ccc-json.py` (replaced by `build-ccc-manifest.py`)
- `scripts/generate-ccc-audio-dual.py` (replaced by `render-ccc-audio.py`)

## Out of scope (downstream)

- New SvelteKit route(s) for paragraph-range pages like `/cec/201-205` and the in-reader audio player UI that builds playlists from `static/audio/cec/index.json`. The audio pipeline only commits to producing the assets and the index — UI wiring is a separate change.
- V2 audiobook rendering, playlist generation, and the iCloud bucketing decision — see Phasing section.

## Open items requiring user input before V1 render

1. ~~Phonetic table~~ ✓ approved.
2. Sigla map expansions — confirm full doc titles for each sigla (`DV` → "constitution dogmatique Dei Verbum", etc.) — the spec lists initial guesses; user signs off before manifest build.
3. Citation attribution audit — review CSV after first manifest build, before V1 render.
4. Initial allowlist for French spellchecker — seed with proper nouns the spec already lists; expand during first leakage-report iteration.
