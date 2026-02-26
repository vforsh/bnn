import { Command } from "commander";
import { logger } from "../utils";
import { mergeGlobalOptions } from "./global-options";

const SKILL_URL = "https://github.com/vforsh/bnn/tree/main/skill/bnn";

interface SkillOptions {
  json?: boolean;
  plain?: boolean;
}

export function createSkillCommand(): Command {
  return new Command("skill")
    .description("Print skill install URL for npx skills add")
    .option("--json", "Output as JSON")
    .option("--plain", "Output URL only")
    .action((options: SkillOptions, command: Command) => {
      const merged = mergeGlobalOptions(command, options);

      if (merged.json) {
        logger.json({ name: "bnn", url: SKILL_URL });
        return;
      }

      logger.raw(SKILL_URL);
    });
}
