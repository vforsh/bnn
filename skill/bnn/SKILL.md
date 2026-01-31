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
