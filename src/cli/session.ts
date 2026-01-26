import { Command } from "commander";
import { loadConfig } from "../config";
import { SessionManager } from "../session";
import { logger, formatSessionList, formatSessionDetail } from "../utils";
import { join } from "path";

export interface SessionCommandOptions {
  json?: boolean;
  limit?: number;
  verbose?: boolean;
  config?: string;
}

export function createSessionCommand(): Command {
  const command = new Command("session")
    .description("Manage editing sessions")
    .addCommand(createListCommand())
    .addCommand(createShowCommand())
    .addCommand(createDeleteCommand())
    .addCommand(createClearCommand());

  return command;
}

function createListCommand(): Command {
  return new Command("list")
    .description("List all sessions")
    .option("--json", "Output as JSON")
    .option("-l, --limit <n>", "Limit results", parseInt)
    .action(async (options: SessionCommandOptions) => {
      const config = loadConfig(options.config);
      const sessionDir =
        config.session?.directory ||
        join(process.env.HOME || "~", ".local", "share", "bnn", "sessions");
      const sessionManager = new SessionManager(sessionDir);

      let sessions = sessionManager.list();

      if (options.limit && options.limit > 0) {
        sessions = sessions.slice(0, options.limit);
      }

      formatSessionList(sessions, { json: options.json });
    });
}

function createShowCommand(): Command {
  return new Command("show")
    .description("Show session details")
    .argument("<id>", "Session ID")
    .option("--json", "Output as JSON")
    .action(async (id: string, options: SessionCommandOptions) => {
      const config = loadConfig(options.config);
      const sessionDir =
        config.session?.directory ||
        join(process.env.HOME || "~", ".local", "share", "bnn", "sessions");
      const sessionManager = new SessionManager(sessionDir);

      const session = sessionManager.get(id);

      if (!session) {
        if (options.json) {
          logger.json({ error: `Session not found: ${id}` });
        } else {
          logger.error(`Session not found: ${id}`);
        }
        process.exit(5);
      }

      formatSessionDetail(
        {
          id: session.id,
          created_at: session.created_at,
          updated_at: session.updated_at,
          model: session.model,
          history_count: session.history.length,
          last_prompt: session.history[session.history.length - 1]?.prompt,
          history: session.history.map((h) => ({
            prompt: h.prompt,
            output: h.output,
          })),
        },
        { json: options.json }
      );
    });
}

function createDeleteCommand(): Command {
  return new Command("delete")
    .description("Delete a session")
    .argument("<id>", "Session ID")
    .option("--json", "Output as JSON")
    .action(async (id: string, options: SessionCommandOptions) => {
      const config = loadConfig(options.config);
      const sessionDir =
        config.session?.directory ||
        join(process.env.HOME || "~", ".local", "share", "bnn", "sessions");
      const sessionManager = new SessionManager(sessionDir);

      const deleted = sessionManager.delete(id);

      if (options.json) {
        logger.json({ success: deleted, id });
      } else if (deleted) {
        logger.success(`Deleted session: ${id}`);
      } else {
        logger.error(`Session not found: ${id}`);
        process.exit(5);
      }
    });
}

function createClearCommand(): Command {
  return new Command("clear")
    .description("Delete all sessions")
    .option("--json", "Output as JSON")
    .action(async (options: SessionCommandOptions) => {
      const config = loadConfig(options.config);
      const sessionDir =
        config.session?.directory ||
        join(process.env.HOME || "~", ".local", "share", "bnn", "sessions");
      const sessionManager = new SessionManager(sessionDir);

      const count = sessionManager.clear();

      if (options.json) {
        logger.json({ success: true, deleted: count });
      } else {
        logger.success(`Deleted ${count} session(s)`);
      }
    });
}
