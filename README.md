# Catéchisme de l'Église Catholique

La première édition numérique française du Catéchisme de l'Église Catholique, librement lisible et consultable sur le web.

**[catechismecatholique.fr](https://catechismecatholique.fr)**

---

## Le projet

Le Catéchisme de l'Église catholique (1992, révisé 1997) est le texte doctrinal de référence de l'Église universelle. En français, les seules ressources en ligne disponibles sont le site vatican.va dans une interface vieillissante, des PDF peu pratiques à chercher, et des éditions anglaises. Ce site comble cette lacune.

Il reproduit fidèlement les 2 865 paragraphes de l'édition française officielle (1998), sans aucune modification éditoriale. La traduction biblique utilisée est le _Néo-Crampon Libre_ (© 2022 Fraternité de Tibériade, CC BY-SA 4.0).

## Fonctionnalités

- Lecture structurée des 2 865 paragraphes (parties, sections, chapitres, articles)
- Recherche par mot, numéro de paragraphe (§ 27) ou référence biblique (Jn 1, 14)
- Glossaire des termes théologiques, classés par thème
- Cinq thèmes d'affichage : clair, sépia, sombre, OLED, automatique
- Aucun compte requis. Aucune publicité.

---

## Stack technique

- **SvelteKit 2 + Svelte 5** (runes strictement, `compilerOptions.runes: true`)
- **TypeScript** strict
- **Tailwind CSS 3**
- **Cloudflare Pages + Workers**

## Développement

```bash
npm install
npm run dev
```

```bash
npm run build     # préparation des données + build Vite
npm run check     # svelte-check + tsc
npm run test      # vitest
npm run test:e2e  # playwright
npm run lint      # prettier + eslint
```

## Architecture

La préparation des données (`scripts/prepare-data.ts`) s'exécute au `prebuild` et génère les JSON dans `static/data/`. Le corpus est conçu pour accueillir plusieurs catéchismes (`corpus: 'ccc'`). Les pages de lecture passent par un Worker Cloudflare pour éviter les erreurs MIME liées aux chunks CDN périmés.

### Concordance (données archivées, non publiées)

Le script de préparation construit `data-archive/concordance/` à partir d'un arbre source biblique. Emplacement par défaut : `../DOCTRINA/sources/didache/`. Remplacer avec la variable d'environnement `DIDACHE_SOURCE_DIR=/chemin/absolu`. En l'absence du répertoire, un instantané commité sert de repli.

Ces données ne sont plus consommées par le site et le pipeline reste en place pour une réutilisation future, mais la sortie vit hors de `static/` : elle n'est donc jamais déployée. Les 3032 fichiers concernés pesaient 16% du plafond de 20000 fichiers par déploiement de Cloudflare Pages. Pour réexposer la concordance, il faudra reprendre l'écriture vers `static/data/` et remettre `concordance` dans le `PRESERVE` de `scripts/prepare-data.ts`.

---

## Droits

- Texte du Catéchisme © Libreria Editrice Vaticana, Cité du Vatican. Reproduit dans un cadre non commercial.
- Bible _Néo-Crampon Libre_ © 2022 Fraternité de Tibériade. Licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

---

_Laus Deo._
