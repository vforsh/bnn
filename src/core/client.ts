import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadImageAsBase64, getMimeType, getImageDimensions } from "./image";
import type { SupportedModel, AspectRatio, Resolution } from "./models";
import { MODEL_INFO } from "./models";

export interface GenerateOptions {
  model: SupportedModel;
  prompt: string;
  resolution?: Resolution;
  aspectRatio?: AspectRatio;
  refImages?: string[];
}

export interface EditOptions extends GenerateOptions {
  inputImage: string; // path or base64
  inputImageIsBase64?: boolean;
}

export interface GenerateResult {
  imageData: string; // base64
  text?: string;
  width?: number;
  height?: number;
}

export class BnnClient {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const { model, prompt, resolution, aspectRatio, refImages } = options;

    const modelInfo = MODEL_INFO[model];
    if (!modelInfo) {
      throw new Error(`Unsupported model: ${model}`);
    }

    // Validate resolution
    if (resolution && resolution !== "1k") {
      if (modelInfo.maxResolution === "1k") {
        throw new Error(`Model ${model} only supports 1K resolution`);
      }
    }

    // Build content parts
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    // Add reference images first
    if (refImages && refImages.length > 0) {
      for (const refPath of refImages) {
        const imageData = loadImageAsBase64(refPath);
        const mimeType = getMimeType(refPath);
        parts.push({
          inlineData: {
            mimeType,
            data: imageData,
          },
        });
      }
    }

    // Add text prompt
    parts.push({ text: prompt });

    // Get the generative model
    const genModel = this.client.getGenerativeModel({
      model,
      generationConfig: {
        // @ts-expect-error - responseModalities is valid for image models
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const response = await genModel.generateContent({
      contents: [{ role: "user", parts }],
    });

    return this.extractResult(response);
  }

  async edit(options: EditOptions): Promise<GenerateResult> {
    const {
      model,
      prompt,
      inputImage,
      inputImageIsBase64,
      resolution,
      aspectRatio,
      refImages,
    } = options;

    const modelInfo = MODEL_INFO[model];
    if (!modelInfo) {
      throw new Error(`Unsupported model: ${model}`);
    }

    if (!modelInfo.supportsEdit) {
      throw new Error(`Model ${model} does not support image editing`);
    }

    // Build content parts
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    // Add input image
    const imageData = inputImageIsBase64
      ? inputImage
      : loadImageAsBase64(inputImage);
    const mimeType = inputImageIsBase64 ? "image/png" : getMimeType(inputImage);

    parts.push({
      inlineData: {
        mimeType,
        data: imageData,
      },
    });

    // Add reference images
    if (refImages && refImages.length > 0) {
      for (const refPath of refImages) {
        const refData = loadImageAsBase64(refPath);
        const refMime = getMimeType(refPath);
        parts.push({
          inlineData: {
            mimeType: refMime,
            data: refData,
          },
        });
      }
    }

    // Add text prompt
    parts.push({ text: prompt });

    // Get the generative model
    const genModel = this.client.getGenerativeModel({
      model,
      generationConfig: {
        // @ts-expect-error - responseModalities is valid for image models
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const response = await genModel.generateContent({
      contents: [{ role: "user", parts }],
    });

    return this.extractResult(response);
  }

  private extractResult(response: {
    response: { candidates?: Array<{ content?: { parts?: unknown[] } }> };
  }): GenerateResult {
    const candidates = response.response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No response generated");
    }

    const firstCandidate = candidates[0];
    if (!firstCandidate) {
      throw new Error("No candidate in response");
    }

    const content = firstCandidate.content;
    if (!content || !content.parts) {
      throw new Error("No content in response");
    }

    let imageData: string | null = null;
    let text: string | undefined;

    for (const part of content.parts) {
      const p = part as {
        inlineData?: { data: string };
        text?: string;
      };
      if (p.inlineData?.data) {
        imageData = p.inlineData.data;
      } else if (p.text) {
        text = p.text;
      }
    }

    if (!imageData) {
      throw new Error("No image generated in response");
    }

    const dimensions = getImageDimensions(imageData);

    return {
      imageData,
      text,
      width: dimensions?.width,
      height: dimensions?.height,
    };
  }
}
