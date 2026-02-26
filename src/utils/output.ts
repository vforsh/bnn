import { logger } from "./logger";
import type { SearchSource } from "../core";

export interface GenerateResult {
  success: boolean;
  output?: string;
  session_id?: string;
  model?: string;
  text?: string;
  error?: string;
  width?: number;
  height?: number;
  sources?: SearchSource[];
}

export interface SessionInfo {
  id: string;
  created_at: string;
  updated_at: string;
  model: string;
  history_count: number;
  last_prompt?: string;
}

export function formatGenerateResult(
  result: GenerateResult,
  options: { json?: boolean; plain?: boolean; verbose?: boolean; quiet?: boolean }
): void {
  if (options.json) {
    logger.json(result);
    return;
  }

  if (!result.success) {
    logger.error(result.error || "Unknown error");
    return;
  }

  if (options.plain) {
    if (result.output) logger.raw(result.output);
    if (result.session_id) logger.raw(`session_id=${result.session_id}`);
    if (result.model) logger.raw(`model=${result.model}`);
    return;
  }

  if (options.quiet) {
    if (result.output) {
      logger.raw(result.output);
    }
    return;
  }

  const dimensions =
    result.width && result.height ? ` (${result.width}x${result.height})` : "";
  logger.success(`Generated: ${result.output}${dimensions}`);

  if (result.text) {
    logger.info(`Response: ${result.text}`);
  }

  if (result.sources && result.sources.length > 0) {
    logger.info("Sources:");
    for (const source of result.sources) {
      logger.info(`  - ${source.title}: ${source.uri}`);
    }
  }

  if (options.verbose) {
    if (result.model) {
      logger.info(`Model: ${result.model}`);
    }
    if (result.session_id) {
      logger.info(`Session: ${result.session_id}`);
    }
  }
}

export function formatSessionList(
  sessions: SessionInfo[],
  options: { json?: boolean; plain?: boolean }
): void {
  if (options.json) {
    logger.json(sessions);
    return;
  }

  if (options.plain) {
    for (const session of sessions) {
      logger.raw(session.id);
    }
    return;
  }

  if (sessions.length === 0) {
    logger.info("No sessions found");
    return;
  }

  for (const session of sessions) {
    const date = new Date(session.updated_at).toLocaleString();
    const prompt = session.last_prompt
      ? ` - "${session.last_prompt.slice(0, 40)}${session.last_prompt.length > 40 ? "..." : ""}"`
      : "";
    logger.info(`${session.id}  ${date}  [${session.history_count} edits]${prompt}`);
  }
}

export function formatSessionDetail(
  session: SessionInfo & { history?: Array<{ prompt: string; output: string }> },
  options: { json?: boolean; plain?: boolean }
): void {
  if (options.json) {
    logger.json(session);
    return;
  }

  if (options.plain) {
    logger.raw(session.id);
    return;
  }

  logger.info(`Session: ${session.id}`);
  logger.info(`Created: ${new Date(session.created_at).toLocaleString()}`);
  logger.info(`Updated: ${new Date(session.updated_at).toLocaleString()}`);
  logger.info(`Model: ${session.model}`);
  logger.info(`History: ${session.history_count} edits`);

  if (session.history && session.history.length > 0) {
    logger.info("\nEdit history:");
    for (let i = 0; i < session.history.length; i++) {
      const entry = session.history[i]!;
      logger.info(`  ${i + 1}. "${entry.prompt}" -> ${entry.output}`);
    }
  }
}
