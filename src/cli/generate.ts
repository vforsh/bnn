import { Command } from "commander";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import ora from "ora";
import { loadConfig, type Config } from "../config";
import { BnnClient, validateModel, validateAspectRatio, validateResolution, type AspectRatio } from "../core";
import { logger, generateOutputFilename, formatGenerateResult } from "../utils";

export interface GenerateCommandOptions {
  model?: string;
  resolution?: string;
  aspectRatio?: string;
  refImage?: string[];
  output?: string;
  noText?: boolean;
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  apiKey?: string;
  config?: string;
}

export function createGenerateCommand(): Command {
  const command = new Command("generate")
    .description("Generate an image from a text prompt")
    .argument("<prompt>", "Text prompt describing the image to generate")
    .option("-m, --model <model>", "Model to use")
    .option("-r, --resolution <res>", "Resolution: 1k, 2k, or 4k")
    .option("-a, --aspect-ratio <ratio>", "Aspect ratio (e.g., 16:9, 3:4)")
    .option(
      "--ref-image <path>",
      "Reference image (can be used multiple times)",
      collect,
      []
    )
    .option("-o, --output <path>", "Output file path")
    .option("--no-text", "Suppress text response in output")
    .option("--json", "Output result as JSON")
    .action(async (prompt: string, options: GenerateCommandOptions) => {
      await runGenerate(prompt, options);
    });

  return command;
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

async function runGenerate(
  prompt: string,
  options: GenerateCommandOptions
): Promise<void> {
  const config = loadConfig(options.config);

  // Set up logger
  if (options.verbose) {
    logger.setLevel("debug");
  }
  if (options.quiet) {
    logger.setQuiet(true);
  }

  // Get API key
  const apiKey = options.apiKey || config.api?.key;
  if (!apiKey) {
    formatGenerateResult(
      {
        success: false,
        error:
          "No API key provided. Set BNN_API_KEY env var, use --api-key flag, or add to config file.",
      },
      options
    );
    process.exit(4);
  }

  // Validate and set model
  const model = options.model || config.model?.default || "gemini-2.0-flash-exp";
  if (!validateModel(model)) {
    formatGenerateResult(
      {
        success: false,
        error: `Invalid model: ${model}. Supported: gemini-2.0-flash-exp, imagen-3.0-generate-002`,
      },
      options
    );
    process.exit(2);
  }

  // Validate resolution
  const resolution = options.resolution || config.output?.resolution || "1k";
  if (!validateResolution(resolution)) {
    formatGenerateResult(
      {
        success: false,
        error: `Invalid resolution: ${resolution}. Supported: 1k, 2k, 4k`,
      },
      options
    );
    process.exit(2);
  }

  // Validate aspect ratio
  const aspectRatio = options.aspectRatio || config.output?.aspect_ratio;
  if (aspectRatio && !validateAspectRatio(aspectRatio)) {
    formatGenerateResult(
      {
        success: false,
        error: `Invalid aspect ratio: ${aspectRatio}`,
      },
      options
    );
    process.exit(2);
  }

  // Validate reference images
  if (options.refImage && options.refImage.length > 0) {
    for (const ref of options.refImage) {
      if (!existsSync(ref)) {
        formatGenerateResult(
          {
            success: false,
            error: `Reference image not found: ${ref}`,
          },
          options
        );
        process.exit(6);
      }
    }
  }

  // Determine output path
  const outputDir = config.output?.directory || process.cwd();
  const naming = config.output?.naming || "prompt";
  const outputFilename =
    options.output || generateOutputFilename(prompt, naming);
  const outputPath = options.output
    ? resolve(options.output)
    : join(outputDir, outputFilename);

  // Ensure output directory exists
  const outputDirPath = dirname(outputPath);
  if (!existsSync(outputDirPath)) {
    mkdirSync(outputDirPath, { recursive: true });
  }

  // Show spinner
  const spinner = options.quiet || options.json
    ? null
    : ora("Generating image...").start();

  try {
    const client = new BnnClient(apiKey, config.api?.proxy, config.api?.relay_token);

    logger.debug(`Model: ${model}`);
    logger.debug(`Resolution: ${resolution}`);
    logger.debug(`Aspect ratio: ${aspectRatio || "default"}`);
    logger.debug(`Output: ${outputPath}`);

    const result = await client.generate({
      model,
      prompt,
      resolution: resolution as "1k" | "2k" | "4k",
      aspectRatio: aspectRatio as typeof aspectRatio extends string ? AspectRatio : undefined,
      refImages: options.refImage,
    });

    // Save image
    const buffer = Buffer.from(result.imageData, "base64");
    writeFileSync(outputPath, buffer);

    spinner?.stop();

    formatGenerateResult(
      {
        success: true,
        output: outputPath,
        model,
        text: options.noText ? undefined : result.text,
        width: result.width,
        height: result.height,
      },
      options
    );
  } catch (error) {
    spinner?.stop();

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    formatGenerateResult(
      {
        success: false,
        error: message,
      },
      options
    );
    process.exit(4);
  }
}
