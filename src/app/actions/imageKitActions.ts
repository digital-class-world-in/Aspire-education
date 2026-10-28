"use server";

export async function uploadToImageKit(formData: FormData) {
  try {
    const file = formData.get("file") as File | Blob | null;
    const folder = (formData.get("folder") as string) || "/uploads";
    const rawFileName = (formData.get("fileName") as string) || (file as any)?.name || `upload_${Date.now()}`;
    const fileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");

    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64File = buffer.toString("base64");

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) throw new Error("ImageKit private key missing in environment variables");

    const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;

    const fd = new FormData();
    fd.append("file", base64File);
    fd.append("fileName", fileName);
    fd.append("folder", folder);
    fd.append("useUniqueFileName", "true");
    fd.append("responseFields", "fileId,url,name,size,filePath");

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: fd,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ImageKit server action upload error:", errorData);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      url: data.url as string,
      fileId: data.fileId as string,
      name: data.name as string,
    };
  } catch (error: any) {
    console.error("ImageKit server action error:", error);
    return { success: false, error: error.message || "Failed to upload to ImageKit" };
  }
}

export async function deleteFromImageKit(urlOrFileId: string) {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) throw new Error("ImageKit private key missing in environment variables");

    const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;

    let fileId = urlOrFileId;

    if (urlOrFileId.startsWith("http")) {
      const fileName = urlOrFileId.split("/").pop()?.split("?")[0];
      if (!fileName) return { success: true, message: "Invalid URL" };

      const query = `name="${fileName}"`;
      const searchRes = await fetch(
        `https://api.imagekit.io/v1/files?searchQuery=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: authHeader },
        }
      );

      if (!searchRes.ok) {
        const errorText = await searchRes.text();
        console.error("ImageKit search error:", errorText);
        throw new Error(`Failed to search file: ${searchRes.status} ${errorText}`);
      }

      const searchData = await searchRes.json();
      if (!searchData || searchData.length === 0) {
        return { success: true, message: "File already deleted or not found" };
      }
      fileId = searchData[0].fileId;
    }

    const response = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ImageKit delete error:", errorData);
      throw new Error(`Delete failed: ${response.status}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("ImageKit delete server action error:", error);
    return { success: false, error: error.message };
  }
}
