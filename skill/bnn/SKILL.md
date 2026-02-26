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

## Common errors

- Exit `1`: runtime failure or doctor found failed checks
- Exit `2`: invalid flags/usage/validation
- Exit `3`: config operation failure
- Exit `4`: API/auth/runtime request failure
- Exit `5`: session not found
- Exit `6`: missing input/reference image
