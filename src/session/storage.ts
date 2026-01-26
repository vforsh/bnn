import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import type { Session, SessionSummary } from "./types";

export class SessionStorage {
  private directory: string;

  constructor(directory: string) {
    this.directory = directory;
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!existsSync(this.directory)) {
      mkdirSync(this.directory, { recursive: true });
    }
  }

  private getSessionPath(id: string): string {
    return join(this.directory, `${id}.json`);
  }

  save(session: Session): void {
    const path = this.getSessionPath(session.id);
    writeFileSync(path, JSON.stringify(session, null, 2), "utf-8");
  }

  get(id: string): Session | null {
    const path = this.getSessionPath(id);
    if (!existsSync(path)) {
      return null;
    }

    try {
      const content = readFileSync(path, "utf-8");
      return JSON.parse(content) as Session;
    } catch {
      return null;
    }
  }

  delete(id: string): boolean {
    const path = this.getSessionPath(id);
    if (!existsSync(path)) {
      return false;
    }

    unlinkSync(path);
    return true;
  }

  list(): SessionSummary[] {
    this.ensureDirectory();

    const files = readdirSync(this.directory).filter((f) => f.endsWith(".json"));
    const sessions: SessionSummary[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(this.directory, file), "utf-8");
        const session = JSON.parse(content) as Session;
        sessions.push({
          id: session.id,
          created_at: session.created_at,
          updated_at: session.updated_at,
          model: session.model,
          history_count: session.history.length,
          last_prompt: session.history[session.history.length - 1]?.prompt,
        });
      } catch {
        // Skip invalid session files
      }
    }

    // Sort by updated_at descending
    sessions.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return sessions;
  }

  clear(): number {
    this.ensureDirectory();

    const files = readdirSync(this.directory).filter((f) => f.endsWith(".json"));
    let count = 0;

    for (const file of files) {
      try {
        unlinkSync(join(this.directory, file));
        count++;
      } catch {
        // Skip files that can't be deleted
      }
    }

    return count;
  }

  prune(maxHistory: number): number {
    const sessions = this.list();
    let pruned = 0;

    if (sessions.length > maxHistory) {
      const toDelete = sessions.slice(maxHistory);
      for (const session of toDelete) {
        if (this.delete(session.id)) {
          pruned++;
        }
      }
    }

    return pruned;
  }
}
