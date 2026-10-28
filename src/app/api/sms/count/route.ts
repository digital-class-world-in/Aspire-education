import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snap = await db.ref("SystemSettings/SmsCount").get();
    const count = snap.val() || 0;
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
