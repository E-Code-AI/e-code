import fs from "fs";
import path from "path";
import { promisify } from "util";

const readFileAsync = promisify(fs.readFile);

export type SupportedMimeType =
  | "application/pdf"
  | "text/plain";

export interface TextExtractionOptions {
  /**
   * Optional hint for the file's MIME type.
   * If not provided, the extractor will attempt to infer from the file extension.
   */
  mimeTypeHint?: SupportedMimeType | string;
  /**
   * Optional character encoding for text-based formats.
   * Defaults to "utf-8" for plain text.
   */
  encoding?: BufferEncoding;
}

export interface ExtractedTextResult {
  text: string;
  /**
   * MIME type that was actually used for extraction.
   */
  mimeType: string;
  /**
   * Optional metadata that extractors may provide.
   */
  metadata?: Record<string, unknown>;
}

export class UnsupportedMimeTypeError extends Error {
  public readonly mimeType: string;

  constructor(mimeType: string) {
    super(`Unsupported MIME type for text extraction: undefined`);
    this.name = "UnsupportedMimeTypeError";
    this.mimeType = mimeType;
  }
}

export class TextExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "TextExtractionError";
  }
}

/**
 * Infer a MIME type from a file path using its extension.
 * This is intentionally minimal and can be extended as needed.
 */
export function inferMimeTypeFromPath(filePath: string): SupportedMimeType | string {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

/**
 * Extract text from a plain text buffer.
 */
export async function extractTextFromPlainText(
  buffer: Buffer,
  options?: TextExtractionOptions
): Promise<ExtractedTextResult> {
  const encoding: BufferEncoding = options?.encoding ?? "utf-8";
  try {
    const text = buffer.toString(encoding);
    return {
      text,
      mimeType: "text/plain",
    };
  } catch (error) {
    throw new TextExtractionError("Failed to extract text from plain text buffer", error);
  }
}

/**
 * Placeholder PDF text extraction.
 *
 * This implementation is intentionally minimal and designed with a clear
 * extension point for integrating a more robust PDF parsing library
 * (e.g., pdf-parse, pdfjs-dist) in the future.
 *
 * For now, it returns a simple message indicating that PDF extraction
 * is not yet fully implemented.
 */
export async function extractTextFromPdf(
  _buffer: Buffer,
  _options?: TextExtractionOptions
): Promise<ExtractedTextResult> {
  // Extension point:
  // Replace this implementation with a real PDF parser.
  // Example (pseudo-code):
  //
  // import pdf from "pdf-parse";
  // const data = await pdf(buffer);
  // return { text: data.text, mimeType: "application/pdf", metadata: { info: data.info } };
  //
  // For now, we return a placeholder to keep behavior explicit and predictable.
  return {
    text: "",
    mimeType: "application/pdf",
    metadata: {
      note:
        "PDF text extraction is not yet implemented. " +
        "Integrate a PDF parsing library and update extractTextFromPdf accordingly.",
    },
  };
}

/**
 * Extract text from a file buffer, using the provided or inferred MIME type.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  options?: TextExtractionOptions
): Promise<ExtractedTextResult> {
  const mimeType = (options?.mimeTypeHint as SupportedMimeType | string | undefined) ?? "application/octet-stream";

  if (mimeType === "text/plain") {
    return extractTextFromPlainText(buffer, options);
  }

  if (mimeType === "application/pdf") {
    return extractTextFromPdf(buffer, options);
  }

  throw new UnsupportedMimeTypeError(mimeType);
}

/**
 * Extract text from a file on disk.
 *
 * @param filePath Absolute or relative path to the file.
 * @param options Optional extraction options, including MIME type hint.
 */
export async function extractTextFromFile(
  filePath: string,
  options?: TextExtractionOptions
): Promise<ExtractedTextResult> {
  let buffer: Buffer;
  try {
    buffer = await readFileAsync(filePath);
  } catch (error) {
    throw new TextExtractionError(`Failed to read file for text extraction: undefined`, error);
  }

  const inferredMimeType = inferMimeTypeFromPath(filePath);
  const mimeTypeHint = options?.mimeTypeHint ?? inferredMimeType;

  return extractTextFromBuffer(buffer, { ...options, mimeTypeHint });
}

/**
 * Convenience function to check if a MIME type is supported by this module.
 */
export function isMimeTypeSupported(mimeType: string): boolean {
  return mimeType === "text/plain" || mimeType === "application/pdf";
}