# CCC audio (V1)

Generates per-paragraph + per-chapter en-bref MP3s for the SvelteKit reader.

## Install deps

```bash
brew install hunspell ffmpeg
brew install hunspell-fr  # if needed; verify with `hunspell -D | grep fr`
pip install -r scripts/requirements.txt
```

## Build the manifest

```bash
python scripts/build-ccc-manifest.py \
  --chapters-full static/data/cec/chapters-full \
  --paragraphs static/data/cec/paragraphs \
  --out ~/Library/Mobile\ Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/JSON/CCC/ccc_audio.manifest.json \
  --audit ~/Library/Mobile\ Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/JSON/CCC/ccc_audio.citation_audit.csv \
  --leakage ~/Library/Mobile\ Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/JSON/CCC/ccc_audio.leakage_report.txt \
  --lint
```

Iterate on the leakage report until it shows `0 entries — clean`. Review the audit CSV (focus on `tier_used ∈ {2, 3}` rows). The script prints the En bref clusters at the end — eyeball them.

## Render V1 audio

```bash
python scripts/render-ccc-audio.py \
  --target v1 \
  --manifest ~/Library/Mobile\ Documents/com~apple~CloudDocs/for-the-kingdom/DOCTRINA/JSON/CCC/ccc_audio.manifest.json \
  --out-dir static/audio/cec \
  --seed 42
```

Smoke-test the Prologue first:

```bash
python scripts/render-ccc-audio.py … --end-paragraph 25
```

## Run tests

```bash
cd scripts && python -m pytest tests/ -v
```
