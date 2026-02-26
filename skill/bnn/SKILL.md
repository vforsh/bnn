---
name: bnn
description: 'Use the bnn CLI to generate/edit images with Gemini models (Nano Banana 2 default), manage config, and run readiness checks. Triggers on: bnn, image generation, Gemini image editing, Nano Banana 2, config automation.'
---

# bnn

## Quick start

```bash
# install
bun install && bun link

# auth: secrets via env/config stdin only (no argv secrets)
printf '%s' "$GOOGLE_API_KEY" | bnn cfg set api.key -

# generate/edit
bnn gen "retro game character sprite"
bnn edit "remove the background" --image ./input.png
bnn gen "complex prompt" --thinking high
```

## Commands

- `bnn generate|gen|run|do <prompt>`: generate image
- `bnn edit <prompt>`: edit image (`--image` new session, `--session` continue)
- `bnn session list|show|delete|clear`: manage edit sessions
- `bnn config|cfg ...`: manage config
- `bnn doctor|check`: read-only readiness diagnostics
- `bnn skill`: print install URL for this skill

## Config

- `bnn cfg list|ls [--json|--plain]`
- `bnn cfg show [--json|--plain]`
- `bnn cfg init [--global]`
- `bnn cfg set <key> <value>`
- `bnn cfg set key=value key2=value2`
- `bnn cfg set model.thinking=minimal|high|dynamic`
- `printf '%s' "$SECRET" | bnn cfg set api.key -`
- `bnn cfg get <key...>`
- `bnn cfg unset <key...>`
- `bnn cfg export --json`
- `cat config.json | bnn cfg import --json`
- `bnn cfg path [--json|--plain]`
- `bnn cfg open [--global]`

## Global flags

`--json`, `--plain`, `-q`, `-v`, `--debug`, `--timeout`, `--retries`, `--endpoint`, `--region`, `--config`

## Icon generation

Use `bnn gen` with `--aspect-ratio 1:1` for app/game icons. Use `--resolution 1k` for fast iterations and `--resolution 2k` (or `4k`) for final exports.

Default prompt rules (apply unless user explicitly overrides):
- Square canvas: always `--aspect-ratio 1:1`.
- No rounded corners: include "sharp square corners, no rounded corners".
- Full bleed: artwork must fill entire canvas edge-to-edge with no padding/margins/borders.
- No text: do not include text/letters/numbers/typography unless explicitly requested.

Example:

```bash
bnn gen "a fierce dragon breathing fire, vibrant colors, sharp square corners, no rounded corners, artwork fills entire canvas edge to edge, no text, no letters" --aspect-ratio 1:1 --resolution 2k
```

When the user asks for an icon, append these constraints to the prompt (unless they say otherwise):
1. "sharp square corners, no rounded corners"
2. "artwork fills entire canvas edge to edge, no padding, no margins"
3. "no text, no letters, no typography"

### File naming and versioning

Never overwrite existing images. `bnn` default naming may collide for repeated prompts, so prefer explicit `-o/--output` with zero-padded versions: `_v01`, `_v02`, `_v03`.

Naming pattern: `{base}_{version}_{hint}.png`

Procedure:
1. List files in the target directory matching the base (`icon_v*.png`).
2. Find highest version `N`.
3. Use `v{N+1}` (zero-padded, or `v01` if none exist).
4. Add a short subject hint (`dragon`, `fire_breath`, `wizard`).

Example: existing `icon_v01.png`, `icon_v02_forest.png` -> next `icon_v03_castle.png`.

### Style-matching with references

If the project already has a visual style, pass reference images with `--ref-image` (repeatable) so output matches existing art direction.

```bash
bnn gen "app icon of a treasure chest in the same art style as references, sharp square corners, no rounded corners, artwork fills entire canvas edge to edge, no text, no letters" --ref-image ./ref1.png --ref-image ./ref2.png --aspect-ratio 1:1 --resolution 2k --output ./icon_v03_treasure.png
```

## Banner / cover image generation

Use `bnn gen` for banners, covers, headers, and other non-square promo images.

### Aspect ratio selection

`bnn` supports these aspect ratios: `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9`.

Pick the closest supported ratio to the final target, then crop/resize afterwards if exact dimensions differ.

Decision table (target -> `--aspect-ratio`):

| Target shape | Use |
|---|---|
| ultrawide (>= ~2.3:1) | `21:9` |
| wide landscape (~1.7-2.3:1, e.g. 16:9) | `16:9` |
| classic landscape (~1.4-1.7:1, e.g. 3:2) | `3:2` |
| moderate landscape (~1.2-1.4:1, e.g. 4:3, 5:4) | `4:3` or `5:4` |
| square (1:1) | `1:1` |
| moderate portrait (~0.7-0.9:1, e.g. 4:5, 3:4) | `4:5` or `3:4` |
| tall portrait (~0.5-0.7:1, e.g. 2:3) | `2:3` |
| very tall portrait (<= ~0.5:1, e.g. 9:16) | `9:16` |

Rule of thumb: landscape -> `16:9` or `3:2`; portrait -> `9:16` or `2:3`; square -> `1:1`.

### Prompt rules

Default prompt rules (apply unless user explicitly overrides):
- No rounded corners: include "no rounded corners".
- Full bleed: artwork fills entire canvas edge-to-edge with no padding/margins/borders.
- No text: no text/letters/numbers/typography unless explicitly requested.

When the user asks for a banner/cover, append these constraints (unless they say otherwise):
1. "artwork fills entire canvas edge to edge, no padding, no margins, no borders"
2. "no rounded corners"
3. "no text, no letters, no typography"

### Examples

Landscape banner (e.g. 800x470): target is wide landscape -> `16:9`.

```bash
bnn gen "epic space battle scene with nebula and starships, cinematic lighting, artwork fills entire canvas edge to edge, no padding, no margins, no borders, no rounded corners, no text, no letters" --aspect-ratio 16:9 --resolution 2k --output ./banner_v03_space_battle.png
```

Portrait cover (e.g. 1080x1920): target is tall portrait -> `9:16`.

```bash
bnn gen "tropical sunset over the ocean, vibrant gradient sky, artwork fills entire canvas edge to edge, no padding, no margins, no borders, no rounded corners, no text, no letters" --aspect-ratio 9:16 --resolution 2k --output ./cover_v02_sunset.png
```

### File naming and versioning

Never overwrite existing images. Use versioned filenames with `--output`:
- `banner_v01_launch.png`
- `banner_v02_space_battle.png`
- `cover_v03_summer_event.png`

Pattern: `{base}_{version}_{hint}.png` where `{version}` is `v{NN}`.

### Style-matching with references

If the project has existing promotional art, pass references to keep style consistent.

```bash
bnn gen "game banner in the same art style as references, forest theme with magical creatures, artwork fills entire canvas edge to edge, no padding, no margins, no borders, no rounded corners, no text, no letters" --ref-image ./ref1.png --ref-image ./ref2.png --aspect-ratio 16:9 --resolution 2k --output ./banner_v04_forest.png
```

## Common errors

- Exit `1`: runtime failure or doctor found failed checks
- Exit `2`: invalid flags/usage/validation
- Exit `3`: config operation failure
- Exit `4`: API/auth/runtime request failure
- Exit `5`: session not found
- Exit `6`: missing input/reference image
