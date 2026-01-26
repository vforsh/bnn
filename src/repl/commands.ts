export interface ReplCommand {
  name: string;
  aliases: string[];
  description: string;
  usage?: string;
  handler: (args: string[], context: ReplContext) => Promise<boolean> | boolean;
}

export interface ReplContext {
  sessionId: string;
  outputDir: string;
  getLastOutput: () => string | null;
  undoStack: string[];
  pushUndo: (imageData: string) => void;
  popUndo: () => string | null;
}

export const REPL_COMMANDS: ReplCommand[] = [
  {
    name: "help",
    aliases: ["h", "?"],
    description: "Show available commands",
    handler: () => {
      console.log("\nCommands:");
      for (const cmd of REPL_COMMANDS) {
        const aliases =
          cmd.aliases.length > 0 ? ` (${cmd.aliases.join(", ")})` : "";
        const usage = cmd.usage ? ` ${cmd.usage}` : "";
        console.log(`  /${cmd.name}${aliases}${usage}`);
        console.log(`      ${cmd.description}`);
      }
      console.log("\nType a prompt to continue editing the image.\n");
      return false;
    },
  },
  {
    name: "save",
    aliases: ["s"],
    description: "Save current image with a custom name",
    usage: "<filename>",
    handler: async (args, context) => {
      if (args.length === 0) {
        console.log("Usage: /save <filename>");
        return false;
      }

      const filename = args.join(" ");
      const lastOutput = context.getLastOutput();

      if (!lastOutput) {
        console.log("No image to save");
        return false;
      }

      // The last output is already saved, but we could copy it
      console.log(`Current image already saved at: ${lastOutput}`);
      console.log(`To rename, use: cp "${lastOutput}" "${filename}"`);
      return false;
    },
  },
  {
    name: "undo",
    aliases: ["u"],
    description: "Revert to previous image (not implemented yet)",
    handler: async (args, context) => {
      const previous = context.popUndo();
      if (!previous) {
        console.log("Nothing to undo");
        return false;
      }

      console.log("Undo is not fully implemented yet");
      return false;
    },
  },
  {
    name: "history",
    aliases: ["hist"],
    description: "Show edit history for this session",
    handler: async (args, context) => {
      console.log(`Session: ${context.sessionId}`);
      console.log("Use 'bnn session show <id>' for full history");
      return false;
    },
  },
  {
    name: "quit",
    aliases: ["q", "exit"],
    description: "Exit interactive mode (session is preserved)",
    handler: (args, context) => {
      console.log(`\nSession ${context.sessionId} saved.`);
      console.log(
        `Resume with: bnn edit --session ${context.sessionId} "<prompt>"\n`
      );
      return true; // Signal to exit
    },
  },
];

export function parseReplInput(
  input: string
): { isCommand: boolean; command?: string; args?: string[]; prompt?: string } {
  const trimmed = input.trim();

  if (trimmed.startsWith("/")) {
    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts[0]?.toLowerCase() ?? "";
    const args = parts.slice(1);
    return { isCommand: true, command, args };
  }

  return { isCommand: false, prompt: trimmed };
}

export function findCommand(input: string): ReplCommand | null {
  const lower = input.toLowerCase();

  for (const cmd of REPL_COMMANDS) {
    if (cmd.name === lower || cmd.aliases.includes(lower)) {
      return cmd;
    }
  }

  return null;
}
