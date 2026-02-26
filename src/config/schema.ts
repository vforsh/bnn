import { z } from "zod";

export const SupportedModelSchema = z.enum([
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
]);
export const ThinkingLevelSchema = z.enum(["minimal", "high", "dynamic"]);

export const ApiConfigSchema = z.object({
  key: z.string().optional(),
  endpoint: z.string().optional(),
});

export const ModelConfigSchema = z.object({
  default: SupportedModelSchema.default("gemini-3.1-flash-image-preview"),
  thinking: ThinkingLevelSchema.optional(),
});

export const ResolutionSchema = z.enum(["512px", "1k", "2k", "4k"]).default("1k");

export const AspectRatioSchema = z
  .enum([
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
  ])
  .default("1:1");

export const NamingSchema = z
  .enum(["prompt", "timestamp", "sequential"])
  .default("prompt");

export const OutputConfigSchema = z.object({
  directory: z.string().optional(),
  resolution: ResolutionSchema.optional(),
  aspect_ratio: AspectRatioSchema.optional(),
  naming: NamingSchema.optional(),
});

export const SessionConfigSchema = z.object({
  directory: z.string().optional(),
  max_history: z.number().int().positive().default(50),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

export const ConfigSchema = z.object({
  api: ApiConfigSchema.optional(),
  model: ModelConfigSchema.optional(),
  output: OutputConfigSchema.optional(),
  session: SessionConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ApiConfig = z.infer<typeof ApiConfigSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type OutputConfig = z.infer<typeof OutputConfigSchema>;
export type SessionConfig = z.infer<typeof SessionConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type SupportedModelName = z.infer<typeof SupportedModelSchema>;
export type ThinkingLevelName = z.infer<typeof ThinkingLevelSchema>;
export type Resolution = z.infer<typeof ResolutionSchema>;
export type AspectRatio = z.infer<typeof AspectRatioSchema>;
export type Naming = z.infer<typeof NamingSchema>;
