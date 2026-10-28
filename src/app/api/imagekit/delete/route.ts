import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { fileId: rawFileId, url } = await req.json();

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    if (!privateKey) {
      return NextResponse.json({ success: false, error: "ImageKit private key missing" }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;
    let targetFileId = rawFileId;

    // If an image URL is passed instead of fileId, search for the fileId
    if (!targetFileId && url && typeof url === "string" && url.startsWith("http")) {
      const fileName = url.split("/").pop()?.split("?")[0];
      if (!fileName) {
        return NextResponse.json({ success: true, message: "Invalid URL provided" });
      }

      const searchQuery = `name="${fileName}"`;
      const searchRes = await fetch(
        `https://api.imagekit.io/v1/files?searchQuery=${encodeURIComponent(searchQuery)}`,
        {
          headers: { Authorization: authHeader },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (Array.isArray(searchData) && searchData.length > 0) {
          targetFileId = searchData[0].fileId;
        }
      }
    }

    if (!targetFileId) {
      return NextResponse.json({ success: true, message: "File already deleted or not found" });
    }

    const response = await fetch(`https://api.imagekit.io/v1/files/${targetFileId}`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: data.message || "Delete failed" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ImageKit delete route error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
