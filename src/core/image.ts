import { readFileSync, existsSync } from "fs";
import { extname } from "path";

const SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

export function validateImagePath(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Image file not found: ${path}`);
  }

  const ext = extname(path).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported image format: ${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`
    );
  }
}

export function loadImageAsBase64(path: string): string {
  validateImagePath(path);
  const buffer = readFileSync(path);
  return buffer.toString("base64");
}

export function getMimeType(
  path: string
): "image/png" | "image/jpeg" | "image/webp" | "image/gif" {
  const ext = extname(path).toLowerCase();

  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/png";
  }
}

export function getImageDimensions(
  base64Data: string
): { width: number; height: number } | null {
  try {
    const buffer = Buffer.from(base64Data, "base64");

    // Check PNG
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    // Check JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;

        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }

        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }

    return null;
  } catch {
    return null;
  }
}
