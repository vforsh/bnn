import { nanoid } from "nanoid";
import { SessionStorage } from "./storage";
import type { Session, SessionEntry, SessionSummary } from "./types";

export class SessionManager {
  private storage: SessionStorage;
  private maxHistory: number;

  constructor(directory: string, maxHistory: number = 50) {
    this.storage = new SessionStorage(directory);
    this.maxHistory = maxHistory;
  }

  create(model: string, inputImage?: string): Session {
    const now = new Date().toISOString();
    const session: Session = {
      id: nanoid(10),
      created_at: now,
      updated_at: now,
      model,
      input_image: inputImage,
      history: [],
    };

    this.storage.save(session);
    this.storage.prune(this.maxHistory);

    return session;
  }

  get(id: string): Session | null {
    return this.storage.get(id);
  }

  addEntry(
    sessionId: string,
    prompt: string,
    output: string,
    imageData?: string
  ): Session | null {
    const session = this.storage.get(sessionId);
    if (!session) {
      return null;
    }

    const entry: SessionEntry = {
      prompt,
      output,
      timestamp: new Date().toISOString(),
      image_data: imageData,
    };

    session.history.push(entry);
    session.updated_at = entry.timestamp;

    this.storage.save(session);
    return session;
  }

  getLastImageData(sessionId: string): string | null {
    const session = this.storage.get(sessionId);
    if (!session || session.history.length === 0) {
      return null;
    }

    // Return the last entry's image data, or the input image if no entries
    const lastEntry = session.history[session.history.length - 1]!;
    return lastEntry.image_data || session.input_image || null;
  }

  list(): SessionSummary[] {
    return this.storage.list();
  }

  delete(id: string): boolean {
    return this.storage.delete(id);
  }

  clear(): number {
    return this.storage.clear();
  }
}
