import { Command } from "commander";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname, resolve, basename } from "path";
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
import { SessionManager } from "../session";
import { logger, formatGenerateResult, promptToSlug } from "../utils";
import { startRepl } from "../repl";
import { mergeGlobalOptions } from "./global-options";

export interface EditCommandOptions {
  image?: string;
  session?: string;
  model?: string;
  resolution?: string;
  aspectRatio?: string;
  thinking?: string;
  refImage?: string[];
  output?: string;
  search?: boolean;
  noText?: boolean;
  interactive?: boolean;
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

export function createEditCommand(): Command {
  const command = new Command("edit")
    .description("Edit an existing image or continue an editing session")
    .argument("<prompt>", "Text prompt describing the edit")
    .option("-i, --image <path>", "Input image to edit (required for new session)")
    .option("-s, --session <id>", "Continue existing session")
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
    .option("--interactive", "Enter interactive REPL mode after edit")
    .option("--json", "Output result as JSON")
    .option("--plain", "Output stable plain text")
    .action(
      async (
        prompt: string,
        options: EditCommandOptions,
        commandInstance: Command,
      ) => {
        await runEdit(prompt, mergeGlobalOptions(commandInstance, options));
      }
    );

  return command;
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

async function runEdit(
  prompt: string,
  options: EditCommandOptions
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

  // Initialize session manager
  const sessionDir =
    config.session?.directory ||
    join(process.env.HOME || "~", ".local", "share", "bnn", "sessions");
  const sessionManager = new SessionManager(
    sessionDir,
    config.session?.max_history || 50
  );

  // Validate we have either an image or a session
  if (!options.image && !options.session) {
    formatGenerateResult(
      {
        success: false,
        error: "Either --image or --session is required",
      },
      options
    );
    process.exit(2);
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

  // Validate input image if provided
  if (options.image && !existsSync(options.image)) {
    formatGenerateResult(
      {
        success: false,
        error: `Input image not found: ${options.image}`,
      },
      options
    );
    process.exit(6);
  }

  // Get or create session
  let session = options.session ? sessionManager.get(options.session) : null;
  let inputImage: string;
  let inputImageIsBase64 = false;

  if (options.session && !session) {
    formatGenerateResult(
      {
        success: false,
        error: `Session not found: ${options.session}`,
      },
      options
    );
    process.exit(5);
  }

  if (session) {
    // Continue existing session
    const lastImageData = sessionManager.getLastImageData(session.id);
    if (!lastImageData) {
      formatGenerateResult(
        {
          success: false,
          error: "Session has no image data to continue from",
        },
        options
      );
      process.exit(1);
    }
    inputImage = lastImageData;
    inputImageIsBase64 = true;
  } else {
    // New session
    inputImage = options.image!;
    session = sessionManager.create(model, inputImage);
  }

  // Determine output path
  const outputDir = config.output?.directory || process.cwd();
  const baseFilename = options.image
    ? basename(options.image, ".png").replace(/\.[^/.]+$/, "")
    : "edit";
  const sluggedPrompt = promptToSlug(prompt, 30);
  const outputFilename =
    options.output || `${baseFilename}-${sluggedPrompt}.png`;
  const outputPath = options.output
    ? resolve(options.output)
    : join(outputDir, outputFilename);

  // Ensure output directory exists
  const outputDirPath = dirname(outputPath);
  if (!existsSync(outputDirPath)) {
    mkdirSync(outputDirPath, { recursive: true });
  }

  // Show spinner
  const spinner =
    options.quiet || options.json || options.plain ? null : ora("Editing image...").start();

  try {
    const client = new BnnClient(
      apiKey,
      options.endpoint || config.api?.endpoint,
    );

    logger.debug(`Model: ${model}`);
    logger.debug(`Thinking: ${thinking || "model-default"}`);
    logger.debug(`Session: ${session.id}`);
    logger.debug(`Output: ${outputPath}`);

    const result = await client.edit({
      model,
      prompt,
      inputImage,
      inputImageIsBase64,
      resolution: resolution as "512px" | "1k" | "2k" | "4k",
      aspectRatio: aspectRatio as typeof aspectRatio extends string ? AspectRatio : undefined,
      thinkingLevel: thinking as ThinkingLevel | undefined,
      refImages: options.refImage,
      search: options.search,
    });

    // Save image
    const buffer = Buffer.from(result.imageData, "base64");
    writeFileSync(outputPath, buffer);

    // Update session
    sessionManager.addEntry(session.id, prompt, outputPath, result.imageData);

    spinner?.stop();

    formatGenerateResult(
      {
        success: true,
        output: outputPath,
        session_id: session.id,
        model,
        text: options.noText ? undefined : result.text,
        width: result.width,
        height: result.height,
        sources: result.sources,
      },
      options
    );

    // Enter interactive mode if requested
    if (options.interactive && !options.json && !options.plain) {
      logger.info(`\nSession started: ${session.id}`);
      logger.info(
        `Resume with: bnn edit --session ${session.id} "<prompt>"\n`
      );

      await startRepl({
        sessionId: session.id,
        sessionManager,
        client,
        config,
        model,
        resolution,
        aspectRatio,
        thinking,
        outputDir,
        search: options.search,
      });
    } else if (!options.quiet && !options.json && !options.plain) {
      logger.info(`Session: ${session.id}`);
      logger.info(
        `Resume with: bnn edit --session ${session.id} "<prompt>"`
      );
    }
  } catch (error) {
    spinner?.stop();

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    formatGenerateResult(
      {
        success: false,
        error: message,
        session_id: session.id,
      },
      options
    );
    process.exit(4);
  }
}
