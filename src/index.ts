#!/usr/bin/env bun
import { CommanderError } from "commander";
import { buildProgram } from "./cli/program";

function shouldUseJson(argv: string[]): boolean {
  return argv.includes("--json");
}

function formatError(error: unknown): { message: string; exitCode: number } {
  if (error instanceof CommanderError) {
    if (error.code === "commander.helpDisplayed") {
      return {
        message: "",
        exitCode: 0,
      };
    }
    return {
      message: error.message,
      exitCode: error.exitCode ?? 2,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      exitCode: 1,
    };
  }

  return {
    message: "Unknown error",
    exitCode: 1,
  };
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = buildProgram();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    const formatted = formatError(error);
    if (formatted.exitCode === 0) {
      return;
    }

    if (shouldUseJson(argv)) {
      console.log(
        JSON.stringify({
          error: {
            message: formatted.message,
            exitCode: formatted.exitCode,
          },
        })
      );
    } else {
      console.error(`error: ${formatted.message}`);
    }

    process.exit(formatted.exitCode);
  }
}

if (import.meta.main) {
  await main(process.argv);
}
