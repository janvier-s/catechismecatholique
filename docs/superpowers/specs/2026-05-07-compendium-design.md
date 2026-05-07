# Spec : Compendium du Catéchisme de l'Église catholique

**Date :** 2026-05-07
**Portée :** nouveau corpus parallèle au CEC — lecteur, structure, index inverse, intégration dans le 3×3 dot menu et (phase 2) onglet du study panel.

---

## 1. Architecture

Le Compendium est un nouveau corpus, **frère du CEC**, qui partage la même registre architectural mais d'une profondeur moindre (la source est plus plate). Il s'inscrit dans le multi-corpus prévu dans `CLAUDE.md` (« multi-corpus from day 1 »).

**Hiérarchie officielle** (dérivée automatiquement du fichier EPUB) :

- 4 **Parties** : *La profession de la foi · La célébration du mystère chrétien · La vie dans le Christ · La prière chrétienne*
- 2 à 10 **Sections** par partie (et **sous-sections** dans certains cas) avec une plage contiguë de questions
- 598 **Questions** numérotées (Q&R + `ccc_refs` + `verses`)
- Une **Annexe** facultative (Prières communes, Formules de la doctrine catholique, Abréviations bibliques) — à confirmer avant l'implémentation.

**Routes :**

- `/compendium` — page d'atterrissage : 4 cartes de partie (composant `NavCard` existant) + carte Annexe optionnelle. Brève introduction tirée de l'EPUB en tête.
- `/compendium/[part]` — lecteur : une seule page par partie. Affiche le `flow` de la partie (titres de sections, sous-sections, épigraphes, questions). Environ 125–180 questions par partie — poids comparable à un long chapitre du CEC.
- `/compendium/q/[n]` — redirection serveur (`+page.ts`) qui consulte `q-ranges.json` et redirige vers `/compendium/<part>#q-<n>`. Pas de `+page.svelte`.

**Routes différées :**

- `/compendium/sommaire` — à réévaluer après la phase 1 ; la barre latérale + la page d'atterrissage devraient suffire.
- `/compendium/panorama` — hors périmètre.

**Câblage inter-corpus :**

- **Compendium → CEC** : chaque entrée de `ccc_refs` sur une question est rendue comme un lien cliquable vers `/ccc/<n>`.
- **CEC → Compendium** *(phase 2)* : un onglet `compendium-questions` dans le study panel, alimenté par un index inversé `ccc_paragraph_number → [compendium_q_numbers]` calculé à la préparation des données et publié dans `static/data/compendium/cited-by.json`. L'index est construit dès la phase 1 ; seul le rendu de l'onglet est différé.

---

## 2. Forme des données

Fichiers générés dans `static/data/compendium/` à la fin de `prepare-data` :

### `structure.json`
Arbre de la table des matières, sans le texte des réponses. Utilisé par la page d'atterrissage, la barre latérale, et la résolution des redirections.

```ts
{
  parts: [{
    slug: string;
    number: 1 | 2 | 3 | 4;
    title: string;
    sections: [{ title; subsections?; q_range: [from, to] }];
  }];
  appendix?: { ... };  // si activée
}
// ~15–25 KB
```

### `parts/<part-slug>.json`
Bundle de lecture pour une partie. Le `flow` est une liste plate ordonnée : le lecteur la parcourt une seule fois.

```ts
{
  slug, number, title,
  flow: Array<
    | { kind: 'heading'; level: 2 | 3; title: string; id: string }
    | { kind: 'epigraph'; text: string; attribution?: string }
    | { kind: 'question'; data: CompendiumQuestion }
  >
}
// ~70–100 KB par partie
```

Forme par question :

```ts
interface CompendiumQuestion {
  corpus: 'compendium';
  number: number;
  question: string;       // texte brut
  answer_html: string;     // habillage HTML léger du champ `paragraph` JSON
  ccc_refs: number[];     // affichés en marge (chips « Renvois CEC »)
  bible_refs: BibleRef[]; // parsés depuis `verses`, même forme que pour le CEC
}
```

### `cited-by.json`
Index inversé pour l'onglet study panel de la phase 2.

```ts
Record<ccc_paragraph_number, compendium_q_numbers[]>
// ~30 KB
```

### `q-ranges.json`
Tableau minimal pour la redirection `/compendium/q/[n]`.

```ts
[{ part: 'profession-foi', from: 1, to: 217 }, ...]
// ~200 octets
```

**Note sur le rendu des réponses** : le champ `paragraph` du JSON est en prose brute, sans marqueurs de citation inline (contrairement au CEC). Les réponses du Compendium n'auront donc pas de marqueurs interactifs inline. À la place, `ccc_refs` et `bible_refs` apparaissent dans une **aside en marge** adjacente à chaque question, exactement comme le CEC en mode `crossRefsLayout: 'side'`. Cela honore fidèlement la source : le Compendium *cite* des paragraphes du CEC en bloc, sans les ancrer à des phrases précises.

**Recherche** : la phase 1 alimente l'index global (`scripts/prepare/search-index.ts`) avec les questions du Compendium pour qu'elles apparaissent dans la barre de recherche et sur `/recherche`, marquées d'un badge « Compendium ».

---

## 3. UX du lecteur

Le lecteur se cale sur la mise en page native de la source EPUB (`<div class="izq">` question à gauche, `<div class="der">` renvois à droite) — c'est précisément le registre `crossRefsLayout: 'side'` déjà existant.

**`/compendium`** — atterrissage : 4 cartes `NavCard` pour les parties, carte optionnelle pour l'Annexe, court texte d'introduction.

**`/compendium/[part]`** — parcourt le `flow` du bundle de partie et rend :

- **`heading`** → `<h2>` / `<h3>` avec ID d'ancre, compatible scrollSpy.
- **`epigraph`** → `CitationBlock` existant (citation italique attribuée — ex. citation de saint Augustin avant *L'homme est capable de Dieu*).
- **`question`** → composant `ReadableUnit.svelte` (voir §4) :
  - Colonne gauche : numéro cliquable (ouvre le study panel en phase 2).
  - Colonne centrale : question (registre italique gras, indenté comme le `.preg` de l'EPUB) suivie de la réponse en prose.
  - Marge droite : aside « Renvois CEC » + « Versets » (chips), respectant `$prefs.crossRefsLayout`.
  - ID d'ancre `q-N` pour les liens profonds.

**Mobile / mode inline** : les renvois passent sous la réponse, comme déjà pour le CEC.

**Sticky chapter-jump** en tête de chaque page de partie (menu déroulant des sections), parallèle au CEC.

**Navigation latérale (Sidebar)** : sur les routes `/compendium/[part]`, la sidebar montre l'arbre sections/sous-sections/questions de la partie courante, avec mise en valeur de la position active. Composant `Sidebar.svelte` réutilisé (voir §4).

**Phase 2 — onglet study panel** : nouveau `TabCompendium.svelte` enregistré dans `studyPanel.ts` comme type d'onglet `'compendium'`. Lit `cited-by.json[paragraphNumber]` → liste de Q. Chaque Q rendue comme une carte avec le texte de la question + extrait de la réponse ; clic → `/compendium/<part>#q-N`. Modelé sur `TabCitedBy.svelte` existant.

---

## 4. Carte de refactorisation

**Principe** : étendre les modules et composants existants ; ne créer de nouveaux fichiers que là où la surface est genuinement nouvelle.

### Généralisations (refactor)

- **`ParagraphView.svelte`** — déjà 80 % de ce qu'il faut. Refactorisé pour accepter une prop discriminée `unit` :
  ```ts
  type ReadableUnit =
    | { kind: 'ccc-paragraph'; data: Paragraph }
    | { kind: 'compendium-question'; data: CompendiumQuestion };
  ```
  Branche en interne sur `kind`. Le CEC garde le chemin `ParagraphRenderer` actuel ; le Compendium rend la question en italique gras + la réponse en prose, et alimente la même aside en marge (étiquettes « Renvois CEC » / « Versets » en mode compendium). Renommé `ReadableUnit.svelte` pour refléter le rôle élargi.

- **`Sidebar.svelte`** (434 lignes) — plus gros gain. Couplée aux loaders CEC actuellement. Refactor : extraire la récupération de données dans un adaptateur sensible au corpus (`sidebarSource(corpus, slug)`), garder le reste purement présentationnel. Le Compendium lui passe un arbre 2 niveaux (sections + sous-sections + questions). Économise ~400 lignes de duplication.

- **`CitationBlock.svelte`** — déjà adapté pour les courts blocs en prose attribuée. Réutilisé tel quel pour les épigraphes EPUB.

- **`NavCard.svelte`** — déjà générique, réutilisé pour les cartes de la page d'atterrissage `/compendium`.

- **Registre des breadcrumbs** — extraire le bloc `.breadcrumb-row` + `.breadcrumb-rail` + kicker de `CCCReader.svelte` dans un petit `BreadcrumbRail.svelte` partagé. Le lecteur Compendium et le CEC le réutilisent (zéro changement de comportement, juste de la déduplication).

- **`loaders.ts`** — étendre le module existant : `loadCompendiumStructure`, `loadCompendiumPart`, `loadCompendiumCitedBy`. Même motif de cache que pour le CEC.

- **`types.ts`** — étendre `Corpus` à `'ccc' | 'compendium'` ; ajouter `CompendiumQuestion`, `CompendiumPart`, `CompendiumStructure`, `CompendiumFlowNode`. `BibleRef` réutilisé tel quel.

- **`prepare-data.ts`** — appelle un nouveau `scripts/prepare/compendium.ts` qui réutilise les utilitaires existants : `slug.ts`, `sentence-case.ts`, le parseur de versets de `bible-index.ts`, et **alimente** le constructeur d'index de recherche `search-index.ts` au lieu d'en bâtir un parallèle.

- **Param matcher** — renommer `params/cccref.ts` → `params/numref.ts` (la regex est agnostique du corpus) et le réutiliser pour `/compendium/q/[n]`. Pragmatique.

- **Renvois inter-corpus** — les chips `ccc_refs` réutilisent les classes `cross-ref-link` de l'aside `ParagraphView` existante. Les renvois bibliques réutilisent le même `openPanel({ kind: 'verse', ... })` que les bible refs inline du CEC.

- **Préférences de lecture** — aucun changement. Le lecteur Compendium respecte `$prefs.crossRefsLayout` automatiquement, par héritage de la chrome `ReadableUnit`.

### Nouveaux fichiers (surface réellement nouvelle)

- `scripts/prepare/compendium.ts` — EPUB + JSON → `static/data/compendium/*`
- `src/routes/compendium/+page.svelte` (+page.ts) — atterrissage
- `src/routes/compendium/[part]/+page.svelte` (+page.ts) — lecteur de partie
- `src/routes/compendium/q/[n]/+page.ts` — redirection (sans `.svelte`)
- `src/lib/components/panels/TabCompendium.svelte` *(phase 2)* — modelé sur `TabCitedBy`. Si la duplication s'avère propre, `TabCitedBy` est candidat à être paramétré.
- `'compendium'` ajouté à l'union `PanelTab` dans `stores/studyPanel.ts` *(phase 2)*

### Câblage du menu

- **`DesktopMenu.svelte`** — ajouter une entrée « Compendium » dans le tableau `links`.
- **`MobileMenu.svelte`** — ajouter le lien correspondant dans le groupe « Catéchisme ».

---

## 5. Pipeline de préparation des données

`scripts/prepare/compendium.ts` produit toutes les sorties à partir de deux entrées :

1. **JSON source** : `compendium_ccc.json` (598 questions avec `ccc_refs` et `verses`).
2. **EPUB** : `Compendium.epub` (déposé dans `scripts/data-sources/compendium/` comme les autres sources).

**Étapes :**

1. Décompresser l'EPUB (lecture seule). Parser `OEBPS/toc.ncx` → liste ordonnée de `navPoint` (profondeur + libellé + ancre `Text/XXX.htm#pYY`).
2. Parcourir `Text/000.htm` … `Text/004.htm` dans l'ordre. Pour chaque ancre `id="pN"`, émettre un événement `section-start` avec le libellé du `navPoint` correspondant. Pour chaque `<p class="preg">N. …</p>`, émettre un événement `question` avec le numéro Q.
3. Plier ces événements en une structure parties → sections → sous-sections → questions, en utilisant la profondeur des `navPoint` pour choisir le niveau hiérarchique.
4. Joindre les données du JSON (texte de la question, réponse, `ccc_refs`, `verses`) à chaque question.
5. Détecter et préserver les épigraphes (blockquotes en début de section dans l'EPUB).
6. Émettre les fichiers `structure.json`, `parts/<slug>.json`, `cited-by.json` (index inversé construit par parcours unique des `ccc_refs`), `q-ranges.json`.
7. Pousser les questions dans `search-index.ts` avec le marqueur `corpus: 'compendium'`.

**Validations :**

- Le nombre total de questions agrégées sur les parties = 598.
- Tous les `ccc_refs` cités existent dans le corpus CEC (réutilise le validateur de cross-refs existant).
- Tous les `verses` parsent correctement (réutilise le parseur biblique).

---

## 6. Périmètre & phases

**Phase 1 — corpus en lecture seule + entrée de menu :**

1. Pipeline `prepare/compendium.ts` produisant les 4 fichiers JSON.
2. Refactors : `ParagraphView` → `ReadableUnit`, `Sidebar` → adaptateur de corpus, `BreadcrumbRail` extrait, `params/cccref` → `params/numref`.
3. Routes : `/compendium`, `/compendium/[part]`, `/compendium/q/[n]`.
4. Loaders + types étendus.
5. Entrée dans `DesktopMenu` et `MobileMenu`.
6. Recherche globale alimentée.
7. Tests : unitaires sur le pipeline (validation des nombres + parsing) ; e2e sur la lecture d'une partie + clic d'un renvoi CEC + redirection Q→part.

**Phase 2 — onglet study panel :**

1. `TabCompendium.svelte` (potentiellement après paramétrisation de `TabCitedBy`).
2. `'compendium'` ajouté à `PanelTab`.
3. Icône d'onglet dans `PanelShell.svelte`.
4. Câblage : clic sur le numéro d'un paragraphe CEC ayant des Q Compendium → onglet visible + comptage.

**Hors périmètre :**

- `/compendium/sommaire`, `/compendium/panorama` (réévaluer après la phase 1).
- Annexe (Prières communes, etc.) — décision d'inclusion à confirmer avant la phase 1.
- Index inversé Compendium↔Bible (pas demandé pour l'instant).

---

## 7. Décisions à confirmer avant l'implémentation

1. **Annexe EPUB** : inclure ou exclure les sections Prières communes / Formules de la doctrine catholique / Abréviations bibliques ? (Recommandation : inclure — c'est du contenu existant et utile.)
2. **Renommage `ParagraphView` → `ReadableUnit`** : OK ou garder le nom existant et seulement changer la prop ? (Recommandation : renommer — clarifie.)
3. **Renommage `params/cccref.ts` → `params/numref.ts`** : OK ou laisser deux matchers identiques ? (Recommandation : renommer.)
