import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | File | null;
    const folder = (formData.get("folder") as string) || "/uploads";
    const rawFileName = (formData.get("fileName") as string) || (file as any)?.name || `upload_${Date.now()}`;
    // Clean fileName of special characters
    const fileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    if (!privateKey) {
      return NextResponse.json({ success: false, error: "ImageKit private key missing in environment variables" }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64File = buffer.toString("base64");

    const imagekitFormData = new FormData();
    imagekitFormData.append("file", base64File);
    imagekitFormData.append("fileName", fileName);
    imagekitFormData.append("useUniqueFileName", "true");
    imagekitFormData.append("folder", folder);
    imagekitFormData.append("responseFields", "fileId,url,name,size,filePath");

    const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: imagekitFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("ImageKit upload error response:", data);
      return NextResponse.json({ success: false, error: data.message || "Upload failed" }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      url: data.url,
      fileId: data.fileId,
      name: data.name,
      size: data.size,
      filePath: data.filePath,
    });
  } catch (error: any) {
    console.error("ImageKit upload API exception:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error during upload" }, { status: 500 });
  }
}
