import { describe, expect, test } from "bun:test";
import {
  validateAspectRatio,
  validateModel,
  validateResolution,
  validateThinkingLevel,
  SUPPORTED_MODELS,
} from "./models";

describe("model validation", () => {
  test("accepts nano banana 2 model", () => {
    expect(validateModel("gemini-3.1-flash-image-preview")).toBe(true);
  });

  test("keeps nano banana 2 in supported model list", () => {
    expect(SUPPORTED_MODELS).toContain("gemini-3.1-flash-image-preview");
  });

  test("rejects unknown model", () => {
    expect(validateModel("not-a-model")).toBe(false);
  });

  test("rejects removed legacy models", () => {
    expect(validateModel("gemini-2.0-flash-exp")).toBe(false);
    expect(validateModel("imagen-3.0-generate-002")).toBe(false);
  });
});

describe("aspect ratio validation", () => {
  test("accepts newly added extreme aspect ratios", () => {
    expect(validateAspectRatio("1:4")).toBe(true);
    expect(validateAspectRatio("4:1")).toBe(true);
    expect(validateAspectRatio("1:8")).toBe(true);
    expect(validateAspectRatio("8:1")).toBe(true);
  });

  test("rejects unsupported aspect ratios", () => {
    expect(validateAspectRatio("10:1")).toBe(false);
    expect(validateAspectRatio("1:10")).toBe(false);
  });
});

describe("resolution validation", () => {
  test("accepts new 512px resolution", () => {
    expect(validateResolution("512px")).toBe(true);
  });

  test("rejects unsupported resolutions", () => {
    expect(validateResolution("512")).toBe(false);
    expect(validateResolution("8k")).toBe(false);
  });
});

describe("thinking level validation", () => {
  test("accepts supported thinking levels", () => {
    expect(validateThinkingLevel("minimal")).toBe(true);
    expect(validateThinkingLevel("high")).toBe(true);
    expect(validateThinkingLevel("dynamic")).toBe(true);
  });

  test("rejects unsupported thinking levels", () => {
    expect(validateThinkingLevel("low")).toBe(false);
    expect(validateThinkingLevel("off")).toBe(false);
  });
});
