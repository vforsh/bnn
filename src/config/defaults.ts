import type { Config } from "./schema";
import { homedir } from "os";
import { join } from "path";

export const DEFAULT_CONFIG: Required<Config> = {
  api: {
    key: undefined,
  },
  model: {
    default: "gemini-2.0-flash-exp",
  },
  output: {
    directory: undefined,
    resolution: "1k",
    aspect_ratio: "1:1",
    naming: "prompt",
  },
  session: {
    directory: join(homedir(), ".local", "share", "bnn", "sessions"),
    max_history: 50,
  },
  logging: {
    level: "info",
  },
};

export const GLOBAL_CONFIG_PATH = join(
  homedir(),
  ".config",
  "bnn",
  "config.toml"
);
export const PROJECT_CONFIG_PATH = ".config/bnn.toml";

export const ENV_PREFIX = "BNN_";
export const ENV_API_KEY = "BNN_API_KEY";
export const ENV_MODEL = "BNN_MODEL";
export const ENV_OUTPUT_DIR = "BNN_OUTPUT_DIR";
export const ENV_RESOLUTION = "BNN_RESOLUTION";
export const ENV_ASPECT_RATIO = "BNN_ASPECT_RATIO";
