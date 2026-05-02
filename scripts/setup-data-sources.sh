#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/data-sources"
mkdir -p ncl logos
# thematic_cross-refs is itself a symlink to a directory; do not create it as a real dir
rm -rf thematic_cross-refs
ln -sf ../../../DOCTRINA/JSON/CCC/ccc_paras_processed.json ccc_paras_processed.json
ln -sf ../../../DOCTRINA/JSON/CCC/ccc_bible_index_clean.json ccc_bible_index_clean.json
ln -sf ../../../DOCTRINA/JSON/CCC/ccc_cross_refs_bidirectional.json ccc_cross_refs_bidirectional.json
ln -sf ../../../DOCTRINA/sources/CCC/CCC_1998_FULL/sigles.xhtml sigles.xhtml
ln -sf ../../../DOCTRINA/sources/CCC/CCC_1998_FULL/toc.ncx toc.ncx
ln -sf ../../../DOCTRINA/sources/CCC/thematic_cross-refs thematic_cross-refs
ln -sf ../../../SCRIPTURA/sources/NCL/francl_usfx/francl_usfx.xml ncl/francl_usfx.xml
ln -sf ../../../Website/CCC/catechisme-logo.png logos/catechisme-logo.png
ln -sf ../../../Website/CCC/catechisme-logo-white.png logos/catechisme-logo-white.png
echo "Symlinks ready."
