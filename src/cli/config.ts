import { Command } from "commander";
import { execSync } from "child_process";
import { existsSync } from "fs";
import {
  loadConfig,
  getConfigPaths,
  initConfig,
  setConfigValues,
  getConfigValue,
  unsetConfigValues,
  writeConfigObject,
  exportConfig,
} from "../config";
import { logger } from "../utils";
import { mergeGlobalOptions } from "./global-options";

interface ConfigCommandOptions {
  global?: boolean;
  json?: boolean;
  plain?: boolean;
}

function isSecretKey(key: string): boolean {
  return /(^|\.)(key|token|secret|password)$/i.test(key);
}

function parseCliValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = Number(value);
    if (Number.isFinite(num)) {
      return num;
    }
  }

  return value;
}

async function readStdinText(): Promise<string> {
  const input = await Bun.stdin.text();
  return input.replace(/\s+$/, "");
}

function printConfig(config: unknown, options: { json?: boolean; plain?: boolean }): void {
  if (options.json) {
    logger.json(config);
    return;
  }

  if (options.plain) {
    logger.raw(JSON.stringify(config));
    return;
  }

  logger.info(JSON.stringify(config, null, 2));
}

export function createConfigCommand(): Command {
  const command = new Command("config")
    .alias("cfg")
    .description("Manage configuration")
    .addCommand(createListCommand())
    .addCommand(createShowCommand())
    .addCommand(createInitCommand())
    .addCommand(createSetCommand())
    .addCommand(createGetCommand())
    .addCommand(createUnsetCommand())
    .addCommand(createImportCommand())
    .addCommand(createExportCommand())
    .addCommand(createPathCommand())
    .addCommand(createOpenCommand());

  return command;
}

function createListCommand(): Command {
  return new Command("list")
    .alias("ls")
    .description("List effective configuration (merged from all sources)")
    .option("--json", "Output as JSON")
    .option("--plain", "Output as stable single-line JSON")
    .action((options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      const config = loadConfig();
      printConfig(config, merged);
    });
}

function createShowCommand(): Command {
  return new Command("show")
    .description("Alias for 'config list'")
    .option("--json", "Output as JSON")
    .option("--plain", "Output as stable single-line JSON")
    .action((options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      const config = loadConfig();
      printConfig(config, merged);
    });
}

function createInitCommand(): Command {
  return new Command("init")
    .description("Create a new configuration file")
    .option("-g, --global", "Create global config instead of project config")
    .option("--json", "Output as JSON")
    .option("--plain", "Output only created path")
    .action((options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      try {
        const path = initConfig(merged.global);
        if (merged.json) {
          logger.json({ success: true, path });
          return;
        }
        if (merged.plain) {
          logger.raw(path);
          return;
        }
        logger.success(`Created config file: ${path}`);
      } catch (error) {
        if (merged.json) {
          logger.json({ success: false, error: error instanceof Error ? error.message : String(error) });
        } else if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(3);
      }
    });
}

function createSetCommand(): Command {
  return new Command("set")
    .description("Set one config key/value or multiple key=value pairs")
    .argument("<entries...>", "Either <key> <value> or key=value pairs")
    .option("-g, --global", "Set in global config instead of project config")
    .option("--json", "Output as JSON")
    .option("--plain", "Output updated keys")
    .action(async (entries: string[], options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      try {
        const updates: Record<string, unknown> = {};

        // Legacy form: bnn cfg set key value
        if (
          entries.length === 2 &&
          !entries[0]!.includes("=") &&
          !entries[1]!.includes("=")
        ) {
          const key = entries[0]!;
          const value = entries[1]!;

          if (value === "-") {
            const stdinValue = await readStdinText();
            if (!stdinValue) {
              throw new Error("No stdin input received for '-' value");
            }
            updates[key] = stdinValue;
          } else {
            if (isSecretKey(key)) {
              throw new Error(`Refusing secret value for '${key}' via argv. Pipe it via stdin: bnn cfg set ${key} -`);
            }
            updates[key] = parseCliValue(value);
          }
        } else {
          for (const entry of entries) {
            const eq = entry.indexOf("=");
            if (eq <= 0) {
              throw new Error(`Invalid entry '${entry}'. Use key=value or <key> <value>.`);
            }
            const key = entry.slice(0, eq);
            const value = entry.slice(eq + 1);

            if (isSecretKey(key)) {
              if (value !== "-") {
                throw new Error(`Refusing secret value for '${key}' via argv. Use: bnn cfg set ${key} -`);
              }
              const stdinValue = await readStdinText();
              if (!stdinValue) {
                throw new Error("No stdin input received for '-' value");
              }
              updates[key] = stdinValue;
              continue;
            }

            if (value === "-") {
              const stdinValue = await readStdinText();
              if (!stdinValue) {
                throw new Error("No stdin input received for '-' value");
              }
              updates[key] = stdinValue;
            } else {
              updates[key] = parseCliValue(value);
            }
          }
        }

        setConfigValues(updates, merged.global);

        const keys = Object.keys(updates);
        if (merged.json) {
          logger.json({ success: true, keys });
          return;
        }
        if (merged.plain) {
          for (const key of keys) {
            logger.raw(key);
          }
          return;
        }
        logger.success(`Updated ${keys.length} key(s)`);
      } catch (error) {
        if (merged.json) {
          logger.json({ success: false, error: error instanceof Error ? error.message : String(error) });
        } else if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(3);
      }
    });
}

function createGetCommand(): Command {
  return new Command("get")
    .description("Get one or more configuration values")
    .argument("<keys...>", "Configuration keys (e.g., model.default api.endpoint)")
    .option("--json", "Output as JSON")
    .option("--plain", "Output as key=value lines")
    .action((keys: string[], options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        result[key] = getConfigValue(key);
      }

      if (merged.json) {
        logger.json(result);
        return;
      }

      if (merged.plain) {
        for (const key of keys) {
          const value = result[key];
          logger.raw(`${key}=${value === undefined ? "" : JSON.stringify(value)}`);
        }
        return;
      }

      for (const key of keys) {
        const value = result[key];
        if (value === undefined) {
          logger.info(`${key}: (not set)`);
        } else {
          logger.info(`${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
        }
      }
    });
}

function createUnsetCommand(): Command {
  return new Command("unset")
    .description("Unset one or more configuration keys")
    .argument("<keys...>", "Configuration keys")
    .option("-g, --global", "Unset in global config instead of project config")
    .option("--json", "Output as JSON")
    .option("--plain", "Output removed key count")
    .action((keys: string[], options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      const removed = unsetConfigValues(keys, merged.global);
      if (merged.json) {
        logger.json({ success: true, removed, keys });
        return;
      }
      if (merged.plain) {
        logger.raw(String(removed));
        return;
      }
      logger.success(`Unset ${removed} key(s)`);
    });
}

function createImportCommand(): Command {
  return new Command("import")
    .description("Import configuration from stdin JSON payload")
    .option("--json", "Require JSON input mode")
    .option("-g, --global", "Import into global config instead of project config")
    .option("--plain", "Output resulting path")
    .action(async (options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      if (!merged.json) {
        logger.error("Use --json for config import, then pipe JSON via stdin.");
        process.exit(2);
      }

      try {
        const stdin = await readStdinText();
        if (!stdin) {
          throw new Error("No stdin JSON payload provided");
        }

        const payload = JSON.parse(stdin);
        const path = writeConfigObject(payload, merged.global);

        if (merged.plain) {
          logger.raw(path);
          return;
        }

        logger.json({ success: true, path });
      } catch (error) {
        logger.json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        process.exit(3);
      }
    });
}

function createExportCommand(): Command {
  return new Command("export")
    .description("Export effective configuration")
    .option("--json", "Output as JSON (recommended for machine use)")
    .option("--plain", "Output as stable single-line JSON")
    .action((options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      const config = exportConfig();
      printConfig(config, merged);
    });
}

function createOpenCommand(): Command {
  return new Command("open")
    .description("Open configuration file in default editor")
    .option("-g, --global", "Open global config instead of project config")
    .action((options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      const paths = getConfigPaths();
      const configPath = merged.global ? paths.global : (paths.project || paths.global);

      if (!existsSync(configPath)) {
        logger.error(`Config file does not exist: ${configPath}`);
        logger.info(`Run 'bnn config init${merged.global ? " --global" : ""}' to create it.`);
        process.exit(3);
      }

      const editor = process.env.VISUAL || process.env.EDITOR || "open";
      try {
        execSync(`${editor} "${configPath}"`, { stdio: "inherit" });
      } catch {
        logger.error("Failed to open editor. Set $EDITOR or $VISUAL environment variable.");
        process.exit(1);
      }
    });
}

function createPathCommand(): Command {
  return new Command("path")
    .description("Show configuration file paths")
    .option("--json", "Output as JSON")
    .option("--plain", "Output as key=value lines")
    .action((options: ConfigCommandOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      const paths = getConfigPaths();

      if (merged.json) {
        logger.json(paths);
      } else if (merged.plain) {
        logger.raw(`global=${paths.global}`);
        logger.raw(`project=${paths.project || ""}`);
        logger.raw(`projectRoot=${paths.projectRoot || ""}`);
      } else {
        logger.info(`Global config:  ${paths.global}`);
        logger.info(`Project config: ${paths.project || "(not found)"}`);
        if (paths.projectRoot) {
          logger.info(`Project root:   ${paths.projectRoot}`);
        }
      }
    });
}
