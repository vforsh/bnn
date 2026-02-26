import { Command, InvalidArgumentError } from "commander";
import { version } from "../../package.json";
import { logger } from "../utils";
import { createGenerateCommand } from "./generate";
import { createEditCommand } from "./edit";
import { createSessionCommand } from "./session";
import { createConfigCommand } from "./config";
import { createDoctorCommand } from "./doctor";
import { createSkillCommand } from "./skill";

function parseNonNegativeInt(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new InvalidArgumentError(`${flag} must be a non-negative integer`);
  }
  return parsed;
}

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("bnn")
    .description("CLI for generating and editing images with Gemini API")
    .version(version)
    .option("--json", "Output machine-readable JSON")
    .option("--plain", "Output stable plain text")
    .option("-q, --quiet", "Suppress non-essential output")
    .option("-v, --verbose", "Verbose output")
    .option("--debug", "Debug output (includes API responses)")
    .option("--timeout <ms>", "Request timeout in milliseconds", (value) => parseNonNegativeInt(value, "--timeout"), 30000)
    .option("--retries <n>", "Retry count for transient failures", (value) => parseNonNegativeInt(value, "--retries"), 0)
    .option("--endpoint <url>", "Override API endpoint")
    .option("--region <name>", "Execution region hint")
    .option("--config <path>", "Use specific config file")
    .hook("preAction", (command) => {
      const opts = command.optsWithGlobals() as {
        json?: boolean;
        plain?: boolean;
        debug?: boolean;
        verbose?: boolean;
        quiet?: boolean;
      };

      if (opts.json && opts.plain) {
        throw new InvalidArgumentError("Use either --json or --plain, not both");
      }

      if (opts.debug) {
        logger.setLevel("debug");
      } else if (opts.verbose) {
        logger.setLevel("info");
      }

      if (opts.quiet) {
        logger.setQuiet(true);
      }
    })
    .addCommand(createGenerateCommand())
    .addCommand(createEditCommand())
    .addCommand(createSessionCommand())
    .addCommand(createConfigCommand())
    .addCommand(createDoctorCommand())
    .addCommand(createSkillCommand())
    .showHelpAfterError()
    .exitOverride();

  return program;
}

export const createCli = buildProgram;
