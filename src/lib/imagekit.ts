/**
 * Central ImageKit Service and Utility Functions
 * Handles uploading files to ImageKit, generating optimized CDN URLs, and asset deletion.
 */

export const IMAGEKIT_ENDPOINT =
  process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/gnzjd77mb";

export interface ImageKitUploadResponse {
  success: boolean;
  url: string;
  fileId?: string;
  name?: string;
  size?: number;
  filePath?: string;
  error?: string;
}

/**
 * Upload any File or Blob to ImageKit via the secure server-side upload API route.
 *
 * @param file - File or Blob to upload
 * @param folder - Target directory in ImageKit (e.g., "/website/slides", "/id-cards")
 * @param fileName - Optional custom name for the uploaded file
 */
export async function uploadFileToImageKit(
  file: File | Blob,
  folder: string = "/uploads",
  fileName?: string
): Promise<ImageKitUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const resolvedName = fileName || (file as File).name || `upload_${Date.now()}`;
  formData.append("fileName", resolvedName);

  const response = await fetch("/api/imagekit/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to upload image to ImageKit");
  }

  return data;
}

/**
 * Delete a file from ImageKit by fileId or URL.
 *
 * @param urlOrFileId - The ImageKit fileId or public image URL
 */
export async function deleteFileFromImageKit(urlOrFileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/imagekit/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        urlOrFileId.startsWith("http") ? { url: urlOrFileId } : { fileId: urlOrFileId }
      ),
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error("deleteFileFromImageKit error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Format an ImageKit URL with real-time transformations (resizing, WebP conversion, quality optimization).
 */
export function getImageKitUrl(
  src: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    blur?: number;
    format?: "auto" | "webp" | "avif" | "jpg" | "png";
  }
): string {
  if (!src) return "";

  // If already an ImageKit URL, apply transformation query parameters
  if (src.includes("ik.imagekit.io")) {
    const transforms: string[] = [];
    if (options?.width) transforms.push(`w-${options.width}`);
    if (options?.height) transforms.push(`h-${options.height}`);
    if (options?.quality) transforms.push(`q-${options.quality}`);
    if (options?.blur) transforms.push(`bl-${options.blur}`);
    if (options?.format) transforms.push(`f-${options.format}`);

    if (transforms.length === 0) return src;

    const trString = `tr=${transforms.join(",")}`;
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}${trString}`;
  }

  return src;
}
