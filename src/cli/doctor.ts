import { Command } from "commander";
import { accessSync, constants, existsSync } from "fs";
import { dirname } from "path";
import { getConfigPaths, loadConfig } from "../config";
import { logger } from "../utils";
import { mergeGlobalOptions } from "./global-options";

export type DoctorStatus = "ok" | "warn" | "fail";

export interface DoctorCheck {
  id: string;
  status: DoctorStatus;
  message: string;
  hint?: string;
}

interface DoctorOptions {
  json?: boolean;
  plain?: boolean;
  config?: string;
  endpoint?: string;
  timeout?: number;
}

function toLabel(status: DoctorStatus): "OK" | "WARN" | "FAIL" {
  switch (status) {
    case "ok":
      return "OK";
    case "warn":
      return "WARN";
    case "fail":
      return "FAIL";
  }
}

function canReadWritePath(path: string): boolean {
  try {
    accessSync(path, constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function checkEndpointReachable(endpoint: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "HEAD",
      signal: controller.signal,
    });

    if (response.status === 405) {
      return true;
    }

    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function outputResults(
  checks: DoctorCheck[],
  options: { json?: boolean; plain?: boolean },
): void {
  const overall: DoctorStatus = checks.some((check) => check.status === "fail")
    ? "fail"
    : checks.some((check) => check.status === "warn")
      ? "warn"
      : "ok";

  if (options.json) {
    logger.json({ status: overall, checks });
    return;
  }

  if (options.plain) {
    for (const check of checks) {
      logger.raw(`${toLabel(check.status)}\t${check.id}\t${check.message}`);
    }
    logger.raw(`STATUS\t${overall}`);
    return;
  }

  for (const check of checks) {
    const hint = check.hint ? ` (${check.hint})` : "";
    logger.info(`${toLabel(check.status)} ${check.id}: ${check.message}${hint}`);
  }
  logger.info(`Overall: ${toLabel(overall)}`);
}

export function createDoctorCommand(): Command {
  return new Command("doctor")
    .alias("check")
    .description("Run read-only diagnostics to verify CLI readiness")
    .option("--json", "Output as JSON")
    .option("--plain", "Output as stable plain text")
    .action(async (options: DoctorOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);
      const checks: DoctorCheck[] = [];

      checks.push({
        id: "runtime.bun",
        status: process.versions.bun ? "ok" : "fail",
        message: process.versions.bun
          ? `bun ${process.versions.bun}`
          : "Bun runtime not detected",
        hint: process.versions.bun ? undefined : "Run with Bun",
      });

      let config;
      try {
        config = loadConfig(merged.config);
        checks.push({
          id: "config.parse",
          status: "ok",
          message: "Configuration resolved and parsed",
        });
      } catch (error) {
        checks.push({
          id: "config.parse",
          status: "fail",
          message: error instanceof Error ? error.message : "Config parse failed",
          hint: "Fix config TOML syntax",
        });
      }

      const apiKey = process.env.BNN_API_KEY || config?.api?.key;
      checks.push({
        id: "auth.apiKey",
        status: apiKey ? "ok" : "fail",
        message: apiKey ? "API key available" : "API key missing",
        hint: apiKey ? undefined : "Set BNN_API_KEY or configure api.key via stdin",
      });

      const endpoint = merged.endpoint || config?.api?.endpoint;
      if (endpoint) {
        const reachable = await checkEndpointReachable(endpoint, merged.timeout || 4000);
        checks.push({
          id: "network.endpoint",
          status: reachable ? "ok" : "fail",
          message: reachable
            ? `Endpoint reachable: ${endpoint}`
            : `Endpoint unreachable: ${endpoint}`,
          hint: reachable ? undefined : "Check network and endpoint settings",
        });
      } else {
        checks.push({
          id: "network.endpoint",
          status: "ok",
          message: "Using SDK default Google endpoint",
        });
      }

      const paths = getConfigPaths();
      const configParent = dirname(paths.global);
      checks.push({
        id: "fs.configDir",
        status: existsSync(configParent) && canReadWritePath(configParent) ? "ok" : "warn",
        message: existsSync(configParent)
          ? `Config dir access: ${configParent}`
          : `Config dir does not exist yet: ${configParent}`,
        hint: existsSync(configParent) ? undefined : "Run 'bnn cfg init --global' to create it",
      });

      const outputDir = config?.output?.directory || process.cwd();
      const outputBase = existsSync(outputDir) ? outputDir : dirname(outputDir);
      checks.push({
        id: "fs.outputDir",
        status: canReadWritePath(outputBase) ? "ok" : "fail",
        message: `Output path writable: ${outputBase}`,
        hint: canReadWritePath(outputBase) ? undefined : "Fix directory permissions",
      });

      const overallExit = checks.some((check) => check.status === "fail") ? 1 : 0;
      outputResults(checks, merged);
      process.exit(overallExit);
    });
}
