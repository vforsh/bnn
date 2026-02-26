# bnn

CLI for generating and editing images with Google Gemini models.

Default model: `gemini-3.1-flash-image-preview` (Nano Banana 2).

## Run Without Install

```bash
bunx @vforsh/bnn --help
bunx @vforsh/bnn gen "a cat astronaut on mars"
```

## Auth

`bnn` does not accept secrets via CLI flags.
Set API key via env or config (stdin for secrets):

```bash
# env
export BNN_API_KEY="..."

# config (recommended for local machine)
printf '%s' "$GOOGLE_API_KEY" | bunx @vforsh/bnn cfg set api.key -
```

## Quick start

```bash
bunx @vforsh/bnn gen "a cat astronaut on mars"
bunx @vforsh/bnn edit "remove the background" --image photo.jpg
bunx @vforsh/bnn edit "make it more vibrant" --session <session-id>
bunx @vforsh/bnn gen "complex scene composition" --thinking high
```

All command snippets below use `bnn`. Without local install, replace `bnn` with `bunx @vforsh/bnn`.

## Dev install

```bash
bun install
bun link
```

## Commands

```bash
bnn generate|gen|run|do <prompt>
bnn edit <prompt>
bnn session list|show|delete|clear
bnn config|cfg <subcommand>
bnn doctor|check
bnn skill
```

## Config command

```bash
bnn cfg list|ls [--json|--plain]
bnn cfg path
bnn cfg init [--global]

# set one key
bnn cfg set model.default gemini-3.1-flash-image-preview

# set many keys
bnn cfg set api.endpoint=https://generativelanguage.googleapis.com output.resolution=1k output.aspect_ratio=1:1

# configure thinking level
bnn cfg set model.thinking high

# set secret from stdin only
printf '%s' "$GOOGLE_API_KEY" | bnn cfg set api.key -

# multi-key read/update
bnn cfg get model.default output.resolution
bnn cfg unset output.directory output.aspect_ratio

# machine round-trip
bnn cfg export --json > /tmp/bnn-config.json
cat /tmp/bnn-config.json | bnn cfg import --json
```

## Doctor

Read-only readiness checks (runtime/config/auth/network/filesystem):

```bash
bnn doctor
bnn doctor --json
bnn doctor --plain
```

Exit codes:
- `0`: ready
- `1`: one or more checks failed
- `2`: invalid usage

## Skill URL

```bash
bnn skill
```

Prints:
`https://github.com/vforsh/bnn/tree/main/skill/bnn`

## Global flags

`--json`, `--plain`, `-q`, `-v`, `--timeout`, `--retries`, `--endpoint`, `--region`, `--config`

## Models

- `gemini-3.1-flash-image-preview` (default, Nano Banana 2)
- `gemini-3-pro-image-preview`
- Official model selection guide: https://ai.google.dev/gemini-api/docs/image-generation#model-selection
- Official pricing: https://ai.google.dev/gemini-api/docs/pricing

Supported resolutions: `512px`, `1k`, `2k`, `4k`.
Supported thinking levels: `minimal`, `high`, `dynamic` (`dynamic` = let model decide).

## Config precedence

1. Environment variables (`BNN_*`)
2. Project config (`.config/bnn.toml`)
3. Global config (`$XDG_CONFIG_HOME/bnn/config.toml`, fallback `~/.config/bnn/config.toml`)
4. Built-in defaults
