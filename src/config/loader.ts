import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { parse, stringify } from "smol-toml";
import { ConfigSchema, type Config } from "./schema";
import {
  DEFAULT_CONFIG,
  GLOBAL_CONFIG_PATH,
  PROJECT_CONFIG_PATH,
  ENV_API_KEY,
  ENV_MODEL,
  ENV_OUTPUT_DIR,
  ENV_RESOLUTION,
  ENV_ASPECT_RATIO,
  ENV_PROXY,
  ENV_RELAY_TOKEN,
} from "./defaults";

function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const result = { ...target };

  for (const source of sources) {
    if (!source) continue;

    for (const key of Object.keys(source) as (keyof T)[]) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === "object" &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === "object" &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, any>,
          sourceValue as Record<string, any>
        ) as T[keyof T];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[keyof T];
      }
    }
  }

  return result;
}

function loadTomlFile(path: string): Config | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8");
    const parsed = parse(content);
    return ConfigSchema.parse(parsed);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse config file ${path}: ${error.message}`);
    }
    throw error;
  }
}

function loadEnvConfig(): Partial<Config> {
  const config: Partial<Config> = {};

  if (process.env[ENV_API_KEY] || process.env[ENV_PROXY] || process.env[ENV_RELAY_TOKEN]) {
    config.api = {};
    if (process.env[ENV_API_KEY]) {
      config.api.key = process.env[ENV_API_KEY];
    }
    if (process.env[ENV_PROXY]) {
      config.api.proxy = process.env[ENV_PROXY];
    }
    if (process.env[ENV_RELAY_TOKEN]) {
      config.api.relay_token = process.env[ENV_RELAY_TOKEN];
    }
  }

  if (process.env[ENV_MODEL]) {
    const model = process.env[ENV_MODEL];
    if (
      model === "gemini-2.0-flash-exp" ||
      model === "gemini-3-pro-image-preview" ||
      model === "imagen-3.0-generate-002"
    ) {
      config.model = { default: model };
    }
  }

  if (
    process.env[ENV_OUTPUT_DIR] ||
    process.env[ENV_RESOLUTION] ||
    process.env[ENV_ASPECT_RATIO]
  ) {
    config.output = {};
    if (process.env[ENV_OUTPUT_DIR]) {
      config.output.directory = process.env[ENV_OUTPUT_DIR];
    }
    if (process.env[ENV_RESOLUTION]) {
      const res = process.env[ENV_RESOLUTION];
      if (res === "1k" || res === "2k" || res === "4k") {
        config.output.resolution = res;
      }
    }
    if (process.env[ENV_ASPECT_RATIO]) {
      config.output.aspect_ratio = process.env[ENV_ASPECT_RATIO] as any;
    }
  }

  return config;
}

export function findProjectRoot(): string | null {
  let dir = process.cwd();

  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, PROJECT_CONFIG_PATH))) {
      return dir;
    }
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }

  return null;
}

export function loadConfig(customConfigPath?: string): Config {
  const configs: Partial<Config>[] = [DEFAULT_CONFIG];

  // Load global config
  const globalConfig = loadTomlFile(GLOBAL_CONFIG_PATH);
  if (globalConfig) {
    configs.push(globalConfig);
  }

  // Load project config
  const projectRoot = findProjectRoot();
  if (projectRoot) {
    const projectConfigPath = join(projectRoot, PROJECT_CONFIG_PATH);
    const projectConfig = loadTomlFile(projectConfigPath);
    if (projectConfig) {
      configs.push(projectConfig);
    }
  }

  // Load custom config if specified
  if (customConfigPath) {
    const customConfig = loadTomlFile(resolve(customConfigPath));
    if (customConfig) {
      configs.push(customConfig);
    }
  }

  // Load environment variables
  const envConfig = loadEnvConfig();
  configs.push(envConfig);

  return deepMerge({} as Config, ...configs);
}

export function getConfigPaths(): {
  global: string;
  project: string | null;
  projectRoot: string | null;
} {
  const projectRoot = findProjectRoot();
  return {
    global: GLOBAL_CONFIG_PATH,
    project: projectRoot ? join(projectRoot, PROJECT_CONFIG_PATH) : null,
    projectRoot,
  };
}

export function initConfig(global: boolean = false): string {
  const path = global
    ? GLOBAL_CONFIG_PATH
    : join(process.cwd(), PROJECT_CONFIG_PATH);

  if (existsSync(path)) {
    throw new Error(`Config file already exists at ${path}`);
  }

  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const defaultContent = `# BNN Configuration
# See: https://github.com/vforsh/bnn

[api]
# key = "your-api-key-here"  # or use BNN_API_KEY env var
# proxy = "https://gemini.rwhl.se"  # API relay (default), set to "" to disable

[model]
default = "gemini-2.0-flash-exp"  # or "imagen-3.0-generate-002"

[output]
# directory = "./generated"
resolution = "1k"
aspect_ratio = "1:1"
naming = "prompt"

[session]
max_history = 50

[logging]
level = "info"
`;

  writeFileSync(path, defaultContent, "utf-8");
  return path;
}

export function setConfigValue(
  key: string,
  value: string,
  global: boolean = false
): void {
  const path = global
    ? GLOBAL_CONFIG_PATH
    : join(process.cwd(), PROJECT_CONFIG_PATH);

  let config: Record<string, any> = {};

  if (existsSync(path)) {
    const content = readFileSync(path, "utf-8");
    config = parse(content);
  } else {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Parse key like "output.directory" into nested object
  const parts = key.split(".");
  let current: Record<string, unknown> = config;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1]!;
  current[lastPart] = value;

  writeFileSync(path, stringify(config), "utf-8");
}

export function getConfigValue(key: string): unknown {
  const config = loadConfig();

  const parts = key.split(".");
  let current: any = config;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
