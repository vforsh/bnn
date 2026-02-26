export const SUPPORTED_MODELS = [
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];
export const THINKING_LEVELS = ["minimal", "high", "dynamic"] as const;
export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

export const MODEL_INFO: Record<
  SupportedModel,
  {
    name: string;
    description: string;
    maxResolution: "512px" | "1k" | "2k" | "4k";
    supportsEdit: boolean;
    supportsMultiTurn: boolean;
    supportsSearch: boolean;
  }
> = {
  "gemini-3.1-flash-image-preview": {
    name: "Nano Banana 2",
    description: "Gemini 3.1 Flash Image Preview model (Nano Banana 2)",
    maxResolution: "4k",
    supportsEdit: true,
    supportsMultiTurn: true,
    supportsSearch: false,
  },
  "gemini-3-pro-image-preview": {
    name: "Gemini 3 Pro Image Preview",
    description: "Latest Gemini model with advanced image generation",
    maxResolution: "4k",
    supportsEdit: true,
    supportsMultiTurn: true,
    supportsSearch: true,
  },
};

export const ASPECT_RATIOS = [
  "1:1",
  "1:4",
  "1:8",
  "2:3",
  "3:2",
  "3:4",
  "4:1",
  "4:3",
  "4:5",
  "5:4",
  "8:1",
  "9:16",
  "16:9",
  "21:9",
] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const RESOLUTIONS = ["512px", "1k", "2k", "4k"] as const;

export type Resolution = (typeof RESOLUTIONS)[number];

export function validateModel(model: string): model is SupportedModel {
  return SUPPORTED_MODELS.includes(model as SupportedModel);
}

export function validateAspectRatio(ratio: string): ratio is AspectRatio {
  return ASPECT_RATIOS.includes(ratio as AspectRatio);
}

export function validateResolution(res: string): res is Resolution {
  return RESOLUTIONS.includes(res as Resolution);
}

export function validateThinkingLevel(level: string): level is ThinkingLevel {
  return THINKING_LEVELS.includes(level as ThinkingLevel);
}
