#!/usr/bin/env bash
# Symlink static/data → ~/Library/Caches/lecatechisme/data so generated
# JSON survives iCloud Drive's "Optimize Mac Storage" eviction.
#
# Background: this project lives under ~/Library/Mobile Documents/com~apple~CloudDocs/...
# which is iCloud Drive territory. macOS aggressively evicts files in iCloud
# when storage gets tight, regardless of "Optimize Mac Storage" toggle state
# (the toggle's location varies wildly between macOS versions and isn't always
# the only mechanism). ~/Library/Caches/ is excluded from iCloud sync by
# design, so anything stored there stays on disk.
#
# Run once. After this, `npm run dev` and `npm run build` both write through
# the symlink and never lose files mid-session.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$HOME/Library/Caches/lecatechisme/data"
LINK="$ROOT/static/data"

mkdir -p "$TARGET"

if [ -L "$LINK" ]; then
	current="$(readlink "$LINK")"
	if [ "$current" = "$TARGET" ]; then
		echo "✓ static/data already symlinked to $TARGET"
		exit 0
	fi
	echo "Replacing existing symlink ($current → $TARGET)"
	rm "$LINK"
elif [ -d "$LINK" ]; then
	echo "static/data is a real directory; moving its contents to $TARGET"
	cp -R "$LINK"/. "$TARGET"/ 2>/dev/null || true
	rm -rf "$LINK"
fi

ln -s "$TARGET" "$LINK"
echo "✓ Symlinked $LINK → $TARGET"
echo
echo "Regenerating data through the symlink..."
cd "$ROOT"
npx tsx scripts/prepare-data.ts
echo
echo "✓ Done. iCloud will no longer evict static/data files."
