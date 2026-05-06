# Spec : README, page À propos, Footer

**Date :** 2026-05-06  
**Portée :** README.md (GitHub), route `/a-propos`, composant `Footer.svelte`

---

## 1. README.md

**Audience :** visiteurs GitHub — mix technique et non-technique. La présentation du projet prime sur les détails de setup.

**Structure :**

```
[Badge deploy] [Badge license]

# Catéchisme de l'Église Catholique
## Édition numérique française

[2–3 phrases de présentation du projet]

## Fonctionnalités
[liste courte avec emoji]

## Stack
[tableau concis]

## Développement local
[commandes essentielles]

## Source & droits
[attribution Libreria Editrice Vaticana + note CC0 du code]
```

**Ton :** français, sobre, littéraire. Pas de jargon marketing.

---

## 2. Page `/a-propos`

**Route :** `src/routes/a-propos/+page.svelte` (+ `+page.ts` pour prerender)  
**Composant layout :** `ProseLayout.svelte` — nouveau composant `src/lib/components/ui/ProseLayout.svelte`, adapté du DR (Svelte 5 runes, même design system). Pas de TOC latéral pour cette page (navigation simple). Pas de bionic reading (inutile ici).

**Sections et contenu :**

### Le Catéchisme et la lacune numérique

Paragraphe sur ce qui existe déjà :

- **vatican.va** : référence officielle, mais interface vieillissante, difficile à lire et à naviguer
- **catholiccrossreference.online** : excellente approche (lecture + concordance biblique), mais en anglais seulement
- **PDFs et ePubs** : texte intégral disponible, mais cloisonnés, impossibles à rechercher ou croiser
  → Le monde francophone manquait d'une édition web moderne, libre et lisible.

### Cette édition

- Texte intégral des 2 865 paragraphes de l'édition française officielle (1998)
- Aucune modification éditoriale — ni ajout, ni omission, ni reformulation
- **Copyright du Catéchisme :** © Libreria Editrice Vaticana, Cité du Vatican. Reproduit dans un cadre non commercial, à des fins d'accès libre.
- **Traduction biblique :** _Néo-Crampon Libre_ © 2022 Fraternité de Tibériade — modernisation de la traduction catholique française de Crampon. Mise à disposition sous licence Creative Commons Attribution — Partage dans les mêmes conditions 4.0 (CC BY-SA 4.0).
- Deux blocs visuels de droits (style DR) : un pour le Catéchisme (LEV), un pour la Bible (Fraternité de Tibériade + lien CC BY-SA)

### Ce que le site permet

Liste sobre (5–6 items) :

- Lire les 2 865 paragraphes en navigation structurée (parties, sections, chapitres)
- Rechercher par mot, paragraphe (§27) ou référence biblique (Jn 1, 14)
- Croiser chaque verset de la Bible avec les paragraphes du Catéchisme qui le citent
- Explorer le glossaire des termes théologiques
- Cinq modes d'affichage (clair, sépia, sombre, OLED, automatique)

### Une idée simple

Ton personnel mais décentré — pas "voici ce que j'ai fait" mais "voici pourquoi cela existait et pourquoi c'est offert". Pas de nom propre de l'auteur. Même structure narrative que le DR : projet commencé modestement, qui a grandi naturellement. Centré sur la finalité : rendre gloire à Dieu et servir l'Église et tous ses fidèles.

### Litanie + Laus Deo + CTA

```
Saint Thomas d'Aquin, priez pour nous.
Saint Pie X, priez pour nous.
[+ un ou deux autres à confirmer par l'utilisateur]

Laus Deo.

[CTA : Lire le Catéchisme →]
```

**Métadonnées :**

- `<title>` : "À propos · Catéchisme de l'Église Catholique"
- `description` : "Comment et pourquoi ce site a été construit : la première édition française du Catéchisme librement lisible et consultable sur le web."
- `canonical` : https://catechismecatholique.fr/a-propos
- Prerender : `export const prerender = true`

---

## 3. Footer

**Composant :** `src/lib/components/ui/Footer.svelte`  
**Intégration :** ajouté dans `src/routes/+layout.svelte`, après le bloc `<div class="flex">`.

**Structure :**

```
[règle horizontale légère]

Catéchisme · Bible · Glossaire · À propos

✠  MMXXVI · Pour la plus grande gloire de Dieu · A.M.D.G.

© Libreria Editrice Vaticana — texte du Catéchisme
```

**Style :** typographie UI, centré, couleurs `--color-subtle` / `--color-muted`. Sobre — le footer ne concurrence pas le contenu. Pas de colonnes multiples (trop institutionnel pour ce projet).

---

## 4. ProseLayout.svelte

Adapté du DR mais simplifié :

- **Svelte 5 runes** (pas de `export let`, `$:`, `onMount`/`onDestroy` du DR)
- **Pas de bionic reading** (feature DR, pas CCC)
- **Pas de multi-page nav latérale** (la page À propos est une seule page)
- **TOC latéral optionnel** via `$props()` (désactivé par défaut)
- **Schema.org** : Article + BreadcrumbList (JSON-LD injecté via `{@html}`)
- Design tokens identiques : `--font-heading`, `--font-ui`, `--color-accent`, etc.

---

## Fichiers à créer / modifier

| Fichier                                    | Action               |
| ------------------------------------------ | -------------------- |
| `README.md`                                | Réécriture complète  |
| `src/lib/components/ui/ProseLayout.svelte` | Création             |
| `src/lib/components/ui/Footer.svelte`      | Création             |
| `src/routes/a-propos/+page.svelte`         | Création             |
| `src/routes/a-propos/+page.ts`             | Création (prerender) |
| `src/routes/+layout.svelte`                | Ajout `<Footer />`   |

---

## Points ouverts

- **Saints patrons** : Thomas d'Aquin et Pie X sont proposés — l'utilisateur confirme ou modifie
- **Lien canonical** : `https://catechismecatholique.fr` à confirmer comme domaine production
- **Contact** : lien dans le footer → placeholder `/contact` pour l'instant (page non construite)
