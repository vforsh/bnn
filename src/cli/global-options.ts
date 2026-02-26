import type { Command } from "commander";

export interface GlobalCliOptions {
  json?: boolean;
  plain?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  debug?: boolean;
  timeout?: number;
  retries?: number;
  endpoint?: string;
  region?: string;
  config?: string;
}

export function mergeGlobalOptions<T extends object>(
  command: Command,
  localOptions: T,
): T & GlobalCliOptions {
  const globalOptions =
    typeof command.optsWithGlobals === "function"
      ? (command.optsWithGlobals() as GlobalCliOptions)
      : {};

  return {
    ...globalOptions,
    ...localOptions,
  };
}
