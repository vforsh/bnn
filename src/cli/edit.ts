import { Command } from "commander";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname, resolve, basename } from "path";
import ora from "ora";
import { loadConfig, type Config } from "../config";
import { BnnClient, validateModel, validateAspectRatio, validateResolution, type AspectRatio } from "../core";
import { SessionManager } from "../session";
import { logger, generateOutputFilename, formatGenerateResult, promptToSlug } from "../utils";
import { startRepl } from "../repl";

export interface EditCommandOptions {
  image?: string;
  session?: string;
  model?: string;
  resolution?: string;
  aspectRatio?: string;
  refImage?: string[];
  output?: string;
  noText?: boolean;
  interactive?: boolean;
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  apiKey?: string;
  config?: string;
}

export function createEditCommand(): Command {
  const command = new Command("edit")
    .description("Edit an existing image or continue an editing session")
    .argument("<prompt>", "Text prompt describing the edit")
    .option("-i, --image <path>", "Input image to edit (required for new session)")
    .option("-s, --session <id>", "Continue existing session")
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
    .option("--interactive", "Enter interactive REPL mode after edit")
    .option("--json", "Output result as JSON")
    .action(async (prompt: string, options: EditCommandOptions) => {
      await runEdit(prompt, options);
    });

  return command;
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

async function runEdit(
  prompt: string,
  options: EditCommandOptions
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
    options.quiet || options.json ? null : ora("Editing image...").start();

  try {
    const client = new BnnClient(apiKey);

    logger.debug(`Model: ${model}`);
    logger.debug(`Session: ${session.id}`);
    logger.debug(`Output: ${outputPath}`);

    const result = await client.edit({
      model,
      prompt,
      inputImage,
      inputImageIsBase64,
      resolution: resolution as "1k" | "2k" | "4k",
      aspectRatio: aspectRatio as typeof aspectRatio extends string ? AspectRatio : undefined,
      refImages: options.refImage,
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
      },
      options
    );

    // Enter interactive mode if requested
    if (options.interactive && !options.json) {
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
        outputDir,
      });
    } else if (!options.quiet && !options.json) {
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
