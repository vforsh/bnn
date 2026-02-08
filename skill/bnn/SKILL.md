---
name: bnn
description: Generate and edit images using the bnn CLI (Google Gemini API). Use when the user asks to generate images, edit photos, or work with Gemini image models.
allowed-tools: Bash(bnn *)
---

# bnn — Gemini Image Generation CLI

Generate and edit images via Google Gemini API.

## Commands

### generate (alias: gen)

```bash
bnn generate <prompt> [options]
bnn gen "a cat astronaut on mars"
```

Options:
- `-m, --model <model>` — model to use
- `-r, --resolution <res>` — 1k (default), 2k, 4k
- `-a, --aspect-ratio <ratio>` — 1:1 (default), 3:4, 16:9, etc.
- `--ref, --img, --ref-image <path>` — reference image(s), repeatable
- `-o, --out, --output <path>` — output file path
- `--search` — enable Google Search grounding (`gemini-3-pro-image-preview` only)
- `--no-text` — suppress text response
- `--json` — JSON output

### edit

```bash
bnn edit <prompt> --image <path>       # new session
bnn edit <prompt> --session <id>       # continue session
bnn edit <prompt> -i photo.jpg --interactive  # enter REPL
```

Same options as generate, plus:
- `-i, --image <path>` — input image (required for new session)
- `-s, --session <id>` — continue existing session
- `--interactive` — enter REPL after edit

REPL commands: `/help`, `/history`, `/save`, `/undo`, `/quit`

### session

```bash
bnn session list [-l <n>] [--json]
bnn session show <id> [--json]
bnn session delete <id>
bnn session clear
```

### config (alias: cfg)

```bash
bnn config show [--json]
bnn config init [-g]
bnn config set <key> <value> [-g]
bnn config get <key>
bnn config path
bnn config open [-g]
```

Keys: `api.key`, `api.proxy`, `api.relay_token`, `model.default`, `output.directory`, `output.resolution`, `output.aspect_ratio`, `output.naming`, `session.directory`, `session.max_history`, `logging.level`

## Global Options

```
--api-key <key>    API key override
-v, --verbose      Verbose output
--debug            Debug output (includes API responses)
-q, --quiet        Suppress non-essential output
--config <path>    Custom config file
```

## Models

| Model | Max Res | Edit | Multi-turn | Search |
|-------|---------|------|------------|--------|
| `gemini-2.0-flash-exp` | 1k | yes | yes | no |
| `gemini-3-pro-image-preview` | 4k | yes | yes | yes |
| `imagen-3.0-generate-002` | 4k | no | no | no |

## Aspect Ratios

`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`

## Config

Global: `~/.config/bnn/config.toml`
Project: `.config/bnn.toml`

Precedence: CLI flags > env vars > project config > global config > defaults.

```toml
[api]
key = ""
proxy = "https://gemini.rwhl.se"   # default relay
relay_token = ""

[model]
default = "gemini-2.0-flash-exp"

[output]
directory = ""          # defaults to cwd
resolution = "1k"
aspect_ratio = "1:1"
naming = "prompt"       # prompt | timestamp | sequential
```

Env vars: `BNN_API_KEY`, `BNN_PROXY`, `BNN_RELAY_TOKEN`, `BNN_MODEL`, `BNN_OUTPUT_DIR`, `BNN_RESOLUTION`, `BNN_ASPECT_RATIO`

## Output Modes

- **Default**: `Generated: /path/to/file.png (1024x1024)` + session resume hint
- **Quiet** (`-q`): file path only
- **JSON** (`--json`): `{ success, output, model, text, width, height, session_id, sources }`

## Prompting Guide

Write narrative descriptions, not keyword lists. A descriptive paragraph produces better results than disconnected tags.

### Photorealistic

Specify camera angle, lens type, lighting setup, mood. Include textures, expressions, environment.

```
"Close-up portrait of an elderly fisherman, weathered skin, 85mm lens,
golden hour backlighting, shallow depth of field, ocean bokeh background"
```

### Stylized / Illustration

State art style explicitly. Specify line style, shading, color palette.

```
"Kawaii-style cat astronaut, cel-shading, bold outlines, pastel color palette,
transparent background"
```

### Text in Images

Gemini handles text well — infographics, menus, marketing assets. Specify exact text, font style, layout. Use `gemini-3-pro-image-preview` for text-heavy work.

```
"Minimalist coffee shop menu board, chalk lettering on dark background,
heading 'DAILY BREWS', three items with prices, hand-drawn flourishes"
```

### Product Photography

Describe lighting rig, surface, angle, focus, material finish.

```
"Matte black headphones on white marble surface, three-point softbox lighting,
45-degree overhead angle, sharp focus on ear cup texture, subtle reflection"
```

### Editing

Be specific about what to change. Multi-turn sessions preserve context — iterate incrementally.

```
bnn edit "remove the background and replace with solid white" -i photo.jpg
bnn edit "make the lighting warmer, add slight lens flare" -s <id>
```

### Search Grounding

Use `--search` with `gemini-3-pro-image-preview` to ground image generation in real-time web search results. Useful for current events, real-world data, or factual imagery.

```
bnn gen "current weather forecast in San Francisco as a chart" --search -m gemini-3-pro-image-preview
bnn gen "today's top news headlines as an infographic" --search -m gemini-3-pro-image-preview
```

When search grounding is used, source URLs are displayed alongside the generated image.

### Tips

- Narrative > keywords. Full sentences beat comma-separated tags.
- Be specific about style, lighting, composition, mood.
- Reference images help maintain consistency — up to 14 refs supported.
- Use `--search` with `gemini-3-pro-image-preview` for prompts referencing current/real-world info.
- Use `gemini-3-pro-image-preview` for highest quality / text accuracy / 4k.
- Use `gemini-2.0-flash-exp` for fast iteration at 1k.
- Multi-turn edits: make small incremental changes per turn.
- Negative phrasing works: "no text", "without people", "empty background".

## Icon generation

Use `bnn gen` with `--aspect-ratio 1:1` for app/game icons.

Default prompt rules (apply unless the user explicitly overrides):
- **Square**: always `--aspect-ratio 1:1`.
- **No rounded corners**: prompt must include "sharp square corners, no rounded corners".
- **Full bleed**: the icon artwork must fill the entire canvas edge-to-edge with no padding, margins, borders, or empty space.
- **No text**: do not include any text, letters, numbers, or typography on the icon unless the user explicitly requests it.

Example:

```bash
bnn gen "a fierce dragon breathing fire, vibrant colors, sharp square corners, no rounded corners, artwork fills entire canvas edge to edge, no text, no letters" --aspect-ratio 1:1
```

When the user asks for an icon, always append these constraints to their prompt (unless they say otherwise):
1. "sharp square corners, no rounded corners"
2. "artwork fills entire canvas edge to edge, no padding, no margins"
3. "no text, no letters, no typography"

### File naming and versioning

Never overwrite existing images. Before generating, check the output directory for existing files with the same base name. Use incrementing version suffixes: `_v1`, `_v2`, `_v3`, etc. When generating multiple variants in one session, append a short content hint after the version: `icon_v3_chase.png`, `icon_v4_dragon.png`.

**Naming pattern**: `{base}_{version}_{hint}.{ext}`

| Part | Rule | Example |
|---|---|---|
| `{base}` | Asset type or user-specified name | `icon`, `app_icon` |
| `{version}` | `v{N}` — next available integer | `v1`, `v2`, `v3` |
| `{hint}` | Short content descriptor (1–2 words, underscore-separated) | `dragon`, `fire_breath` |

**Procedure**:
1. List existing files in the output directory matching the base name pattern.
2. Find the highest existing version number `N`.
3. Name the new file with `v{N+1}` (or `v1` if none exist).
4. Append a content hint describing the image subject.

Example: output dir contains `icon_v1.png`, `icon_v2_forest.png` → next file: `icon_v3_castle.png`.

### Style-matching with references

If the icon is for a project with an established visual style, pass reference images via `--ref` so the model matches the existing look and feel. All the same prompt rules above still apply.

```bash
bnn gen "app icon of a treasure chest in the same art style as reference images, sharp square corners, no rounded corners, artwork fills entire canvas edge to edge, no text, no letters" --ref ref1.png --ref ref2.png --aspect-ratio 1:1
```

## Banner / cover image generation

Use `bnn gen` for banners, covers, headers, and other non-square promotional images.

### Aspect ratio selection

bnn supports these aspect ratios: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`. Pick the one closest to the target dimensions.

**Decision table** (target → aspect ratio):

| Target aspect ratio | Closest bnn ratio |
|---|---|
| ultra-wide (e.g. 21:9, 2.35:1) | `21:9` |
| wide (e.g. 16:9, 1920×1080) | `16:9` |
| landscape (e.g. 3:2, 1200×800) | `3:2` |
| mild landscape (e.g. 4:3, 800×600) | `4:3` |
| square (1:1) | `1:1` |
| mild portrait (e.g. 4:5, 5:4→4:5) | `4:5` |
| portrait (e.g. 3:4, 600×800) | `3:4` |
| tall portrait (e.g. 2:3, 800×1200) | `2:3` |
| very tall (e.g. 9:16, 1080×1920) | `9:16` |

**Rule of thumb**: pick the ratio whose numeric value (width/height) is closest to the target's.

### Prompt rules

Default prompt rules (apply unless the user explicitly overrides):
- **No rounded corners**: prompt must include "no rounded corners".
- **Full bleed**: the artwork must fill the entire canvas edge-to-edge with no padding, margins, borders, or empty space.
- **No text**: do not include any text, letters, numbers, or typography unless the user explicitly requests it.

When the user asks for a banner/cover, always append these constraints to their prompt (unless they say otherwise):
1. "artwork fills entire canvas edge to edge, no padding, no margins, no borders"
2. "no rounded corners"
3. "no text, no letters, no typography"

### Examples

**Landscape banner (800×470)**. Target is ~16:9 → `--aspect-ratio 16:9`:

```bash
bnn gen "epic space battle scene with nebula and starships, cinematic lighting, artwork fills entire canvas edge to edge, no padding, no margins, no borders, no rounded corners, no text, no letters" --aspect-ratio 16:9
```

**Portrait story/reel cover (1080×1920)**. Target is 9:16 → `--aspect-ratio 9:16`:

```bash
bnn gen "tropical sunset over the ocean, vibrant gradient sky, artwork fills entire canvas edge to edge, no padding, no margins, no borders, no rounded corners, no text, no letters" --aspect-ratio 9:16
```

### File naming and versioning

Never overwrite existing images. Before generating, check the output directory for existing files with the same base name. Use incrementing version suffixes: `_v1`, `_v2`, `_v3`, etc. When generating multiple variants in one session, append a short content hint after the version: `banner_v3_chase.png`, `banner_v4_sunset.png`.

**Naming pattern**: `{base}_{version}_{hint}.{ext}`

| Part | Rule | Example |
|---|---|---|
| `{base}` | Asset type or user-specified name | `banner`, `cover` |
| `{version}` | `v{N}` — next available integer | `v1`, `v2`, `v3` |
| `{hint}` | Short content descriptor (1–2 words, underscore-separated) | `space_battle`, `sunset` |

**Procedure**:
1. List existing files in the output directory matching the base name pattern.
2. Find the highest existing version number `N`.
3. Name the new file with `v{N+1}` (or `v1` if none exist).
4. Append a content hint describing the image subject.

Example: output dir contains `banner_v1.png`, `banner_v2.png` → next file: `banner_v3_chase.png`.

### Style-matching with references

If the project has an established visual style, pass reference images via `--ref`:

```bash
bnn gen "game banner in the same art style as reference images, forest theme with magical creatures, artwork fills entire canvas edge to edge, no padding, no margins, no borders, no rounded corners, no text, no letters" --ref ref1.png --ref ref2.png --aspect-ratio 16:9
```
