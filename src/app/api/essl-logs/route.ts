import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instituteId = searchParams.get("instituteId");

    if (!instituteId) {
      return NextResponse.json(
        { success: false, error: "Missing instituteId parameter" },
        { status: 400 }
      );
    }

    // Optional date filters
    const fromDate = searchParams.get("fromDate"); // Format: YYYY-MM-DD
    const toDate = searchParams.get("toDate"); // Format: YYYY-MM-DD

    let logsRef: any = db.ref(`Institutes/${instituteId}/essl_logs`);

    if (fromDate) {
      logsRef = logsRef.orderByChild("DateTime").startAt(fromDate);
    }

    const snapshot = await logsRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No logs found."
      });
    }

    const rawLogs = snapshot.val();
    let logsArray = Object.keys(rawLogs).map(key => ({
      id: key,
      ...rawLogs[key]
    }));

    // Filter by toDate if provided since we can only use one range query in Firebase Realtime DB
    if (toDate) {
      const toDateEnd = `${toDate} 23:59:59`;
      logsArray = logsArray.filter(log => log.DateTime <= toDateEnd);
    }

    // Sort by DateTime descending (newest first)
    logsArray.sort((a, b) => b.DateTime.localeCompare(a.DateTime));

    return NextResponse.json({
      success: true,
      count: logsArray.length,
      data: logsArray
    });

  } catch (error: any) {
    console.error("Error fetching ESSL logs from database:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs", details: error.message },
      { status: 500 }
    );
  }
}
