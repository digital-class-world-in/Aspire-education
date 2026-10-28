import { NextRequest, NextResponse } from "next/server";
import { pushUserToMachine } from "@/lib/essl-server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { EmployeeCode, EmployeeName, SerialNumber, instituteId } = body;

    if (!EmployeeCode || !EmployeeName) {
      return NextResponse.json(
        { error: "EmployeeCode and EmployeeName are required" },
        { status: 400 }
      );
    }

    console.log(`[eSSL API] Syncing user ${EmployeeCode} to machine...`);

    // In production, you might look up SerialNumber based on instituteId.
    // Here we use the default machine SN from the backend if not provided.
    const result = await pushUserToMachine({
      EmployeeCode: EmployeeCode.toString(),
      EmployeeName: EmployeeName.toString(),
      SerialNumber
    });

    return NextResponse.json({
      success: true,
      message: `User ${EmployeeName} synced to biometric machine successfully.`,
      result
    });

  } catch (error: any) {
    console.error("[eSSL API Error] sync-user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync user to machine" },
      { status: 500 }
    );
  }
}
