export const SUPPORTED_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-3-pro-image-preview",
  "imagen-3.0-generate-002",
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

export const MODEL_INFO: Record<
  SupportedModel,
  {
    name: string;
    description: string;
    maxResolution: "1k" | "2k" | "4k";
    supportsEdit: boolean;
    supportsMultiTurn: boolean;
  }
> = {
  "gemini-2.0-flash-exp": {
    name: "Gemini 2.0 Flash",
    description: "Fast image generation, 1K resolution only",
    maxResolution: "1k",
    supportsEdit: true,
    supportsMultiTurn: true,
  },
  "gemini-3-pro-image-preview": {
    name: "Gemini 3 Pro Image Preview",
    description: "Latest Gemini model with advanced image generation",
    maxResolution: "4k",
    supportsEdit: true,
    supportsMultiTurn: true,
  },
  "imagen-3.0-generate-002": {
    name: "Imagen 3",
    description: "High-quality image generation",
    maxResolution: "4k",
    supportsEdit: false,
    supportsMultiTurn: false,
  },
};

export const ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const RESOLUTIONS = ["1k", "2k", "4k"] as const;

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
