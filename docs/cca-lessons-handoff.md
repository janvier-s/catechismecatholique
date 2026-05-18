# Handoff prompt · Cours de catéchisme pour adultes (IBP)

Paste the block below into Claude Code after `/clear` to resume drafting lessons 17 through 28.

---

## Context

Project: SvelteKit app at `/Users/Janvier/Documents/catechismecatholique`. The route `/bon-pasteur/catechisme-adultes-laguerie/[lecon]` reads JSON from `static/data/bon-pasteur/catechisme-adultes-laguerie/lessons/`. Reader, types, and loaders are already wired up.

This is the **Institut du Bon Pasteur**'s `Cours de catéchisme pour adultes` (abbé Philippe Laguérie / Séminaire Saint-Vincent de Courtalin), 28 lessons total after merging the 5 parts of "La Justice" into a single lesson 26.

**Lessons 1-16 are already drafted and validated** (route renders, JSONs parse). Use them as the model for shape, depth, tone.

## Sources

Primary inputs per lesson `N`:

- **Transcript** (oral, primary): `/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/sources/post-tradi/Cours de catéchisme pour adultes/Catéchisme (N32) - <Title>.txt`
  - Use the file naming `(132)` = lesson 1, `(232)` = lesson 2, … `(3232)` = lesson 32.
- **PDF handout** (structured outline, secondary): extracted text at `/tmp/cca-extract/CourskttN.txt` (run once if `/tmp/cca-extract` is empty: `cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/sources/post-tradi/Cours" && mkdir -p /tmp/cca-extract && for f in Courskt*.pdf; do pdftotext -layout "$f" "/tmp/cca-extract/$(echo $f | sed 's/\.pdf$/.txt/')"; done`). Lessons 1-2 are scanned and need OCR (`ocrmypdf -l fra --force-ocr`).

Lesson 26 (La Justice) **merges** transcripts (2632, 2732, 2832, 2932, 3032) and PDFs (Courskt26-1 through Courskt30-26-5) into one substantial lesson with internal H2 sections for each of the 5 parts.

## Mapping: lesson number → slug → transcript title

```
08  08-l-incarnation                  L'Incarnation                       (832)    [DONE]
09  09-l-eglise-1re-partie             L'Église (Partie 12)                (932)    [DONE]
10  10-l-eglise-2e-partie              L'Église (Partie 22)                (1032)   [DONE]
11  11-les-fins-dernieres              Les Fins Dernières                  (1132)   [DONE]
12  12-la-grace                        La Grâce                            (1232)   [DONE]
13  13-la-priere                       La Prière                           (1332)   [DONE]
14  14-les-sacrements                  Les Sacrements                      (1432)   [DONE]
15  15-le-bapteme                      Le Baptême                          (1532)   [DONE]
16  16-la-confirmation                 La Confirmation                     (1632)   [DONE]
17  17-la-penitence                    La Pénitence                        (1732)
18  18-l-eucharistie                   L'Eucharistie                       (1832)
19  19-le-sacrifice-de-la-messe        Le Sacrifice de la Messe            (1932)
20  20-l-ordre-et-l-extreme-onction    Ordre et Extrême Onction            (2032)
21  21-le-mariage                      Le Mariage                          (2132)
22  22-la-morale                       La Morale                           (2232)
23  23-la-foi-et-l-esperance           Foi et Espérance                    (2332)
24  24-la-charite                      La Charité                          (2432)
25  25-la-prudence                     La Prudence                         (2532)
26  26-la-justice                      La Justice [merge of 2632..3032]
27  27-la-temperance                   La Tempérance                       (3132)
28  28-la-force                        La Force                            (3232)
```

## JSON shape (mandatory)

Write each lesson to `static/data/bon-pasteur/catechisme-adultes-laguerie/lessons/<slug>.json`. Use tab indent. Shape:

```json
{
  "slug": "08-l-incarnation",
  "n": 8,
  "title": "L'Incarnation",
  "pdf": "Courskt8.pdf",
  "blocks": [ … ]
}
```

`blocks` is an ordered array of these kinds (defined in `src/lib/data/types.ts` as `CcaBlock`):

- `{ "kind": "heading", "level": 2|3, "title": "...", "anchor": "kebab-case-stable-id" }` — H2 and H3 build the sidebar.
- `{ "kind": "paragraph", "html": "<p>...</p>" }` — can contain `<p>`, `<ul>`, `<ol>`, `<strong>`, `<em>`, `<sup>`, `<table>`. Wrap text in `<p>`.
- `{ "kind": "definition", "term": "Mot", "html": "<p>Glose...</p>" }` — rendered as a labeled side-block.
- `{ "kind": "quote", "html": "<p>Citation...</p>", "attribution": "Source ref" }` — Scripture, Pères, etc.

The reader auto-builds the sidebar from H2/H3 anchors. Always start a lesson with `## Introduction` and group major doctrinal sections under H2 with H3 subsections where the material has natural subdivisions.

## Synthesis rules

- **Faithful condensation, ~60% of source.** Keep doctrinal substance, distinctions, scripture refs, Latin terms, key examples. Drop oral filler, digressions, and tangents.
- Target ~3000–4500 words per lesson (more for lesson 26 which merges 5).
- **No em dashes ever** (project house rule). Use `·`, comma, parens, or rewrite.
- **No `§` markers** in user-facing copy. "paragraphe N" or the bare number.
- **No French thousands separators**: `2865` not `2 865`.
- Latin theological terms in `<em>`, e.g. `<em>ipsum esse subsistens</em>`, `<em>ex nihilo</em>`.
- Scripture refs as inline: `(Jn 1, 1)`, `(Rm 5, 12)`. Italic when stylistic.
- Use `quote` blocks for direct citations of Scripture, Magisterium, or saints when the abbé reads them.
- Use `definition` blocks for the abbé's pedagogical definitions (he defines a lot of terms explicitly).

## Conventions verified in lessons 1-7

- Title casing for doctrinal terms (Trinité, Eucharistie, Péché Originel), lowercase for general nouns.
- H2 sections like "Introduction", "X en général", "Conclusion" frame the lesson.
- The abbé's specific anecdotes are kept (Pandore, le serpent de Genèse, le cartable du gamin pour les passions). They give the voice.
- Cross-references to other lessons by topic, not by number ("comme dans la leçon précédente" if the abbé does it).

## Workflow per lesson

1. Read transcript + extracted PDF text in parallel.
2. Outline H2/H3 structure mirroring the abbé's plan and the PDF handout.
3. Draft the JSON with substantive paragraphs.
4. Validate: `python3 -c "import json; json.load(open('static/data/bon-pasteur/catechisme-adultes-laguerie/lessons/<slug>.json'))"`.
5. Spot-check render: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/bon-pasteur/catechisme-adultes-laguerie/<slug>` (start dev server with `npm run dev` if not running).

## Reference: existing lessons

Read these for style/depth calibration before starting lesson 17:

- `static/data/bon-pasteur/catechisme-adultes-laguerie/lessons/07-le-peche-originel.json` (narrative + doctrine, lots of definition blocks)
- `static/data/bon-pasteur/catechisme-adultes-laguerie/lessons/08-l-incarnation.json` (mystery-heavy, hérésies + conséquences)
- `static/data/bon-pasteur/catechisme-adultes-laguerie/lessons/14-les-sacrements.json` (reference-style with tableaux, good model for sacrement lessons 17-21)
- `static/data/bon-pasteur/catechisme-adultes-laguerie/lessons/16-la-confirmation.json` (signe sensible + caractère + effets + ministre, exact structure for 17-21)

## What to do

Begin with lesson 17 (La Pénitence). Work one lesson per turn batch. After each, briefly confirm validation passed before moving to the next.

If conversation context gets long after ~5 lessons, pause, summarize progress, and ask whether to clear and continue with this same prompt.

## Progress notes (sessions so far)

- **Session 1** drafted lessons 1-7 (one-shot from PDFs only, no transcripts available yet).
- **Session 2** drafted lessons 8-11. Average ~2500-4000 words, validated route 200, JSON parses. Lesson 11 (Fins Dernières) is the longest so far due to six major sections (mort, jugement particulier, purgatoire, enfer, ciel, jugement général).
- **Session 3** drafted lessons 12-16. Lesson 12 (La Grâce) — user added the missing transcript before drafting. Lesson 16 (La Confirmation) doubles as the lesson on the 7 dons du Saint-Esprit (tableau vertus/dons with examples from saints).
- Word counts trend 2100-2600 per lesson. All routes return 200. Reader handles 60-80 blocks per lesson without UX problems.
