# bnn

CLI for generating and editing images with the Gemini API.

## Installation

```bash
bun install
bun link
```

## Usage

### Generate an image

```bash
bnn generate "a cat astronaut on mars"
bnn generate "portrait of a woman" --aspect-ratio 3:4 --resolution 2k
bnn generate "logo in this style" --ref-image ./style.png -o logo.png
```

### Edit an image

```bash
bnn edit "remove the background" --image photo.jpg
bnn edit "make it more vibrant" --session abc123
bnn edit "change hair color to red" -i portrait.png --interactive
```

### Interactive mode

When using `--interactive`, you enter a REPL where you can iteratively refine your edits:

```
bnn> make the subject larger
Output: photo-make-the-subject-larger.png

bnn> add a sunset background
Output: photo-add-a-sunset-background.png

bnn> /help
bnn> /quit
```

### Session management

```bash
bnn session list
bnn session show abc123
bnn session delete abc123
bnn session clear
```

### Configuration

```bash
bnn config init           # Create project config
bnn config init --global  # Create global config
bnn config show           # Show effective config
bnn config set model.default gemini-2.0-flash-exp
bnn config get model.default
bnn config path           # Show config file paths
```

## Configuration

Configuration is loaded from (in order of precedence):

1. Command-line flags
2. Environment variables (`BNN_API_KEY`, `BNN_MODEL`, etc.)
3. Project config (`.config/bnn.toml`)
4. Global config (`~/.config/bnn/config.toml`)
5. Built-in defaults

### Example config

```toml
[api]
key = "your-api-key-here"

[model]
default = "gemini-2.0-flash-exp"

[output]
directory = "./generated"
resolution = "1k"
aspect_ratio = "1:1"
naming = "prompt"

[session]
max_history = 50

[logging]
level = "info"
```

## Models

- `gemini-2.0-flash-exp` - Fast image generation, 1K resolution only
- `imagen-3.0-generate-002` - High-quality Imagen 3 model

## License

MIT
