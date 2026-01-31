import { Command } from "commander";
import { execSync } from "child_process";
import { existsSync } from "fs";
import {
  loadConfig,
  getConfigPaths,
  initConfig,
  setConfigValue,
  getConfigValue,
  GLOBAL_CONFIG_PATH,
  PROJECT_CONFIG_PATH,
} from "../config";
import { logger } from "../utils";

export function createConfigCommand(): Command {
  const command = new Command("config")
    .alias("cfg")
    .description("Manage configuration")
    .addCommand(createShowCommand())
    .addCommand(createInitCommand())
    .addCommand(createSetCommand())
    .addCommand(createGetCommand())
    .addCommand(createPathCommand())
    .addCommand(createOpenCommand());

  return command;
}

function createShowCommand(): Command {
  return new Command("show")
    .description("Show effective configuration (merged from all sources)")
    .option("--json", "Output as JSON")
    .action((options: { json?: boolean }) => {
      const config = loadConfig();

      if (options.json) {
        logger.json(config);
      } else {
        logger.info("Effective configuration:\n");
        logger.info(JSON.stringify(config, null, 2));
      }
    });
}

function createInitCommand(): Command {
  return new Command("init")
    .description("Create a new configuration file")
    .option("-g, --global", "Create global config instead of project config")
    .action((options: { global?: boolean }) => {
      try {
        const path = initConfig(options.global);
        logger.success(`Created config file: ${path}`);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(3);
      }
    });
}

function createSetCommand(): Command {
  return new Command("set")
    .description("Set a configuration value")
    .argument("<key>", "Configuration key (e.g., model.default, output.directory)")
    .argument("<value>", "Value to set")
    .option("-g, --global", "Set in global config instead of project config")
    .action((key: string, value: string, options: { global?: boolean }) => {
      try {
        setConfigValue(key, value, options.global);
        logger.success(`Set ${key} = ${value}`);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(3);
      }
    });
}

function createGetCommand(): Command {
  return new Command("get")
    .description("Get a configuration value")
    .argument("<key>", "Configuration key (e.g., model.default)")
    .option("--json", "Output as JSON")
    .action((key: string, options: { json?: boolean }) => {
      const value = getConfigValue(key);

      if (value === undefined) {
        if (options.json) {
          logger.json({ key, value: null });
        } else {
          logger.info(`${key}: (not set)`);
        }
      } else {
        if (options.json) {
          logger.json({ key, value });
        } else {
          logger.info(`${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
        }
      }
    });
}

function createOpenCommand(): Command {
  return new Command("open")
    .description("Open configuration file in default editor")
    .option("-g, --global", "Open global config instead of project config")
    .action((options: { global?: boolean }) => {
      const paths = getConfigPaths();
      const configPath = options.global ? paths.global : (paths.project || paths.global);

      if (!existsSync(configPath)) {
        logger.error(`Config file does not exist: ${configPath}`);
        logger.info(`Run 'bnn config init${options.global ? " --global" : ""}' to create it.`);
        process.exit(3);
      }

      const editor = process.env.VISUAL || process.env.EDITOR || "open";
      try {
        execSync(`${editor} "${configPath}"`, { stdio: "inherit" });
      } catch {
        logger.error(`Failed to open editor. Set $EDITOR or $VISUAL environment variable.`);
        process.exit(1);
      }
    });
}

function createPathCommand(): Command {
  return new Command("path")
    .description("Show configuration file paths")
    .option("--json", "Output as JSON")
    .action((options: { json?: boolean }) => {
      const paths = getConfigPaths();

      if (options.json) {
        logger.json(paths);
      } else {
        logger.info(`Global config:  ${paths.global}`);
        logger.info(`Project config: ${paths.project || "(not found)"}`);
        if (paths.projectRoot) {
          logger.info(`Project root:   ${paths.projectRoot}`);
        }
      }
    });
}
