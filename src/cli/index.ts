import { Command } from "commander";
import { createGenerateCommand } from "./generate";
import { createEditCommand } from "./edit";
import { createSessionCommand } from "./session";
import { createConfigCommand } from "./config";
import { logger } from "../utils";
import { version } from "../../package.json";

export function createCli(): Command {
  const program = new Command();

  program
    .name("bnn")
    .description("CLI for generating and editing images with Gemini API")
    .version(version)
    .option("--api-key <key>", "Google API key (overrides config/env)")
    .option("-v, --verbose", "Verbose output")
    .option("--debug", "Debug output (includes API responses)")
    .option("--config <path>", "Use specific config file")
    .option("-q, --quiet", "Suppress non-essential output")
    .hook("preAction", (thisCommand) => {
      const opts = thisCommand.opts();

      if (opts.debug) {
        logger.setLevel("debug");
      } else if (opts.verbose) {
        logger.setLevel("info");
      }

      if (opts.quiet) {
        logger.setQuiet(true);
      }
    });

  // Add subcommands
  program.addCommand(createGenerateCommand());
  program.addCommand(createEditCommand());
  program.addCommand(createSessionCommand());
  program.addCommand(createConfigCommand());

  return program;
}

export * from "./generate";
export * from "./edit";
export * from "./session";
export * from "./config";
