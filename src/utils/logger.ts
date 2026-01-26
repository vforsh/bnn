import chalk from "chalk";

export type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  private level: LogLevel = "info";
  private quiet: boolean = false;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.quiet && level !== "error") {
      return false;
    }
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(chalk.red("error:"), message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(chalk.yellow("warn:"), message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.log(message, ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.log(chalk.green(message), ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.log(chalk.gray("debug:"), message, ...args);
    }
  }

  // For quiet mode - always outputs unless in quiet mode
  output(message: string): void {
    if (!this.quiet) {
      console.log(message);
    } else {
      // In quiet mode, just output the bare minimum
      console.log(message);
    }
  }

  // For JSON output (always outputs)
  json(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
  }

  // For raw output that should always be shown
  raw(message: string): void {
    console.log(message);
  }
}

export const logger = new Logger();
