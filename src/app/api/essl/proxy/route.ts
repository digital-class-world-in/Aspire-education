import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const op = searchParams.get("op");
  console.log(`[Proxy] Operation: ${op}`);
  const soapBody = await req.text();

  if (!op) {
    return NextResponse.json({ error: "Missing operation (op) parameter" }, { status: 400 });
  }

  const ESSL_API_URL = `http://27.116.54.3:83/iclock/webapiservice.asmx?op=${op}`;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(ESSL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": `http://tempuri.org/${op}`,
      },
      body: soapBody,
      signal: controller.signal
    });
    clearTimeout(id);

    const responseText = await response.text();
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
      },
    });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json({ 
      error: "Failed to connect to eSSL server", 
      details: error.message,
      target: ESSL_API_URL
    }, { status: 500 });
  }
}
