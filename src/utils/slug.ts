import slugify from "slugify";

export function promptToSlug(prompt: string, maxLength: number = 50): string {
  // Take first part of prompt
  const truncated = prompt.slice(0, maxLength);

  // Convert to slug
  const slug = slugify(truncated, {
    lower: true,
    strict: true,
    trim: true,
  });

  // Ensure we have something
  if (!slug) {
    return "output";
  }

  return slug;
}

export function generateOutputFilename(
  prompt: string,
  naming: "prompt" | "timestamp" | "sequential",
  sequenceNumber?: number
): string {
  switch (naming) {
    case "prompt":
      return `${promptToSlug(prompt)}.png`;

    case "timestamp": {
      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, 19);
      return `${timestamp}.png`;
    }

    case "sequential": {
      const num = (sequenceNumber ?? 1).toString().padStart(3, "0");
      return `output-${num}.png`;
    }

    default:
      return `${promptToSlug(prompt)}.png`;
  }
}
