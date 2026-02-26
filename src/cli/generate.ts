import { Command } from "commander";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import ora from "ora";
import { loadConfig } from "../config";
import {
  BnnClient,
  validateModel,
  validateAspectRatio,
  validateResolution,
  type AspectRatio,
  SUPPORTED_MODELS,
  validateThinkingLevel,
  type ThinkingLevel,
} from "../core";
import { logger, generateOutputFilename, formatGenerateResult } from "../utils";
import { mergeGlobalOptions } from "./global-options";

export interface GenerateCommandOptions {
  model?: string;
  resolution?: string;
  aspectRatio?: string;
  thinking?: string;
  refImage?: string[];
  output?: string;
  search?: boolean;
  noText?: boolean;
  json?: boolean;
  plain?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  config?: string;
  timeout?: number;
  retries?: number;
  endpoint?: string;
  region?: string;
  ref?: string[];
  img?: string[];
  out?: string;
}

export function createGenerateCommand(): Command {
  const command = new Command("generate")
    .alias("gen")
    .alias("run")
    .alias("do")
    .description("Generate an image from a text prompt")
    .argument("<prompt>", "Text prompt describing the image to generate")
    .option("-m, --model <model>", "Model to use")
    .option("-r, --resolution <res>", "Resolution: 512px, 1k, 2k, or 4k")
    .option("-a, --aspect-ratio <ratio>", "Aspect ratio (e.g., 16:9, 3:4)")
    .option("-t, --thinking <level>", "Thinking level: minimal, high, or dynamic")
    .option(
      "--ref-image <path>",
      "Reference image (can be used multiple times)",
      collect,
      []
    )
    .option("-o, --output <path>", "Output file path")
    .option("--ref <path>", "", collect, [])
    .option("--img <path>", "", collect, [])
    .option("--out <path>", "")
    .option("--search", "Enable Google Search grounding when supported by model")
    .option("--no-text", "Suppress text response in output")
    .option("--json", "Output result as JSON")
    .option("--plain", "Output stable plain text")
    .action(
      async (
        prompt: string,
        options: GenerateCommandOptions,
        commandInstance: Command,
      ) => {
        await runGenerate(prompt, mergeGlobalOptions(commandInstance, options));
      }
    );

  return command;
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

async function runGenerate(
  prompt: string,
  options: GenerateCommandOptions
): Promise<void> {
  // Merge option aliases
  options.refImage = [...(options.refImage || []), ...(options.ref || []), ...(options.img || [])];
  options.output = options.output || options.out;

  const config = loadConfig(options.config);

  // Set up logger
  if (options.verbose) {
    logger.setLevel("debug");
  }
  if (options.quiet) {
    logger.setQuiet(true);
  }

  // Get API key
  const apiKey = process.env.BNN_API_KEY || config.api?.key;
  if (!apiKey) {
    formatGenerateResult(
      {
        success: false,
        error:
          "No API key provided. Set BNN_API_KEY env var or add api.key to config.",
      },
      options
    );
    process.exit(4);
  }

  // Validate and set model
  const model = options.model || config.model?.default || "gemini-3.1-flash-image-preview";
  if (!validateModel(model)) {
    formatGenerateResult(
      {
        success: false,
        error: `Invalid model: ${model}. Supported: ${SUPPORTED_MODELS.join(", ")}`,
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
        error: `Invalid resolution: ${resolution}. Supported: 512px, 1k, 2k, 4k`,
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

  // Validate thinking level
  const thinking = options.thinking || config.model?.thinking;
  if (thinking && !validateThinkingLevel(thinking)) {
    formatGenerateResult(
      {
        success: false,
        error: `Invalid thinking level: ${thinking}. Supported: minimal, high, dynamic`,
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
  const spinner = options.quiet || options.json || options.plain
    ? null
    : ora("Generating image...").start();

  try {
    const client = new BnnClient(
      apiKey,
      options.endpoint || config.api?.endpoint,
    );

    logger.debug(`Model: ${model}`);
    logger.debug(`Resolution: ${resolution}`);
    logger.debug(`Aspect ratio: ${aspectRatio || "default"}`);
    logger.debug(`Thinking: ${thinking || "model-default"}`);
    logger.debug(`Output: ${outputPath}`);

    const result = await client.generate({
      model,
      prompt,
      resolution: resolution as "512px" | "1k" | "2k" | "4k",
      aspectRatio: aspectRatio as typeof aspectRatio extends string ? AspectRatio : undefined,
      thinkingLevel: thinking as ThinkingLevel | undefined,
      refImages: options.refImage,
      search: options.search,
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
        sources: result.sources,
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
