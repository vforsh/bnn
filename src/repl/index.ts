import * as readline from "readline";
import { writeFileSync } from "fs";
import { join, basename } from "path";
import ora from "ora";
import { BnnClient } from "../core";
import { SessionManager } from "../session";
import type { Config } from "../config";
import { parseReplInput, findCommand, type ReplContext } from "./commands";
import { promptToSlug } from "../utils";

export interface ReplOptions {
  sessionId: string;
  sessionManager: SessionManager;
  client: BnnClient;
  config: Config;
  model: string;
  resolution?: string;
  aspectRatio?: string;
  outputDir: string;
  search?: boolean;
}

export async function startRepl(options: ReplOptions): Promise<void> {
  const {
    sessionId,
    sessionManager,
    client,
    config,
    model,
    resolution,
    aspectRatio,
    outputDir,
    search,
  } = options;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let lastOutput: string | null = null;
  const undoStack: string[] = [];
  let editCount = 0;

  // Get initial state from session
  const session = sessionManager.get(sessionId);
  if (session && session.history.length > 0) {
    lastOutput = session.history[session.history.length - 1]!.output;
    editCount = session.history.length;
  }

  const context: ReplContext = {
    sessionId,
    outputDir,
    getLastOutput: () => lastOutput,
    undoStack,
    pushUndo: (data) => undoStack.push(data),
    popUndo: () => undoStack.pop() || null,
  };

  const prompt = (): Promise<string> => {
    return new Promise((resolve) => {
      rl.question("bnn> ", (answer) => {
        resolve(answer);
      });
    });
  };

  console.log('Type a prompt to edit, or /help for commands.\n');

  while (true) {
    const input = await prompt();

    if (!input.trim()) {
      continue;
    }

    const parsed = parseReplInput(input);

    if (parsed.isCommand) {
      const cmd = findCommand(parsed.command!);

      if (!cmd) {
        console.log(`Unknown command: /${parsed.command}`);
        console.log("Type /help for available commands.");
        continue;
      }

      const shouldExit = await cmd.handler(parsed.args || [], context);
      if (shouldExit) {
        rl.close();
        return;
      }

      continue;
    }

    // It's a prompt - do an edit
    const editPrompt = parsed.prompt!;

    // Get current image data
    const imageData = sessionManager.getLastImageData(sessionId);
    if (!imageData) {
      console.log("Error: No image data in session to edit");
      continue;
    }

    const spinner = ora("Editing image...").start();

    try {
      const result = await client.edit({
        model: model as any,
        prompt: editPrompt,
        inputImage: imageData,
        inputImageIsBase64: true,
        resolution: resolution as any,
        aspectRatio: aspectRatio as any,
        search,
      });

      // Save the image
      editCount++;
      const slugged = promptToSlug(editPrompt, 30);
      const outputFilename = `edit-${editCount}-${slugged}.png`;
      const outputPath = join(outputDir, outputFilename);

      const buffer = Buffer.from(result.imageData, "base64");
      writeFileSync(outputPath, buffer);

      // Update session
      sessionManager.addEntry(sessionId, editPrompt, outputPath, result.imageData);
      lastOutput = outputPath;

      spinner.stop();

      const dimensions =
        result.width && result.height
          ? ` (${result.width}x${result.height})`
          : "";
      console.log(`Output: ${outputPath}${dimensions}`);

      if (result.text) {
        console.log(`Response: ${result.text}`);
      }

      if (result.sources && result.sources.length > 0) {
        console.log("Sources:");
        for (const source of result.sources) {
          console.log(`  - ${source.title}: ${source.uri}`);
        }
      }

      console.log();
    } catch (error) {
      spinner.stop();
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.log(`Error: ${message}\n`);
    }
  }
}

export * from "./commands";
