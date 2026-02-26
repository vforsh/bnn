import { describe, expect, test } from "bun:test";
import { generateOutputFilename, promptToSlug } from "./slug";

describe("output naming", () => {
  test("slugifies prompt for prompt naming", () => {
    expect(promptToSlug("Hello, World!"))
      .toBe("hello-world");
    expect(generateOutputFilename("Hello, World!", "prompt"))
      .toBe("hello-world.png");
  });

  test("uses padded sequence number", () => {
    expect(generateOutputFilename("ignored", "sequential", 12)).toBe("output-012.png");
  });

  test("timestamp naming keeps png extension", () => {
    const filename = generateOutputFilename("ignored", "timestamp");
    expect(filename.endsWith(".png")).toBe(true);
  });
});
