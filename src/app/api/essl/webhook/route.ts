import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { sendAttendanceSmsServer } from "@/lib/sms-server";

export const dynamic = 'force-dynamic';

/**
 * eSSL Webhook Route: /api/essl/webhook
 * Used to receive instant real-time data pushes from the eSSL server or BioTime
 */
export async function POST(req: NextRequest) {
  try {
    // Institute ID can be passed as a query param ?instituteId=...
    // Otherwise fallback to NEXT_PUBLIC_DB_ID
    const { searchParams } = new URL(req.url);
    const instituteId = searchParams.get("instituteId") || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2";

    if (!instituteId) {
      return NextResponse.json({ error: "Missing instituteId" }, { status: 400 });
    }

    const payloadText = await req.text();
    if (!payloadText) {
      return NextResponse.json({ error: "Empty payload" }, { status: 400 });
    }

    let logs: any[] = [];
    
    // Attempt to parse JSON (BioTime or custom webhooks)
    try {
      const parsed = JSON.parse(payloadText);
      if (Array.isArray(parsed)) {
        logs = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Extract array if wrapped in an object like { data: [...] }
        logs = parsed.data && Array.isArray(parsed.data) ? parsed.data : [parsed];
      }
    } catch (e) {
      // If not JSON, it might be plain text sent directly by an ADMS machine (e.g. /iclock/cdata)
      // Format: EmployeeCode \t DateTime \t Status
      const lines = payloadText.trim().split(/\r?\n/);
      logs = lines.map(line => {
        const parts = line.split(/\t|\s+/);
        if (parts.length >= 2) {
           return {
             EmployeeCode: parts[0],
             // e.g., "2026-06-17 08:30:00"
             DateTime: parts.length >= 4 ? `${parts[1]} ${parts[2]}` : parts[1],
             Status: parts.length >= 4 ? parts[3] : "UNKNOWN"
           };
        }
        return null;
      }).filter(Boolean);
    }

    if (logs.length === 0) {
      return NextResponse.json({ success: true, message: "No actionable logs found" });
    }

    // Fetch existing students and staff to associate punches
    const [studentsSnap, staffSnap] = await Promise.all([
      db.ref(`Institutes/${instituteId}/admissions`).get(),
      db.ref(`Institutes/${instituteId}/employees`).get()
    ]);
    
    const students = studentsSnap.exists() ? Object.values(studentsSnap.val() as any) : [];
    const staff = staffSnap.exists() ? Object.values(staffSnap.val() as any) : [];

    const updates: any = {};
    const attendanceUpdates: any = {};
    const smsPromises: Promise<any>[] = [];
    let savedCount = 0;

    for (const rawLog of logs) {
      // Normalize field names (handles both uppercase/lowercase variations)
      const empCode = rawLog.EmployeeCode || rawLog.emp_code || rawLog.userId || rawLog.pin;
      const dateTime = rawLog.DateTime || rawLog.punch_time || rawLog.time;
      const statusRaw = rawLog.Status || rawLog.punch_state || rawLog.state || "UNKNOWN";
      const serialNum = rawLog.SerialNumber || rawLog.sn || rawLog.device_sn || "Webhook Push";

      if (!empCode || !dateTime) continue;

      const [date, time] = dateTime.split(" ");
      if (!date || !time) continue;

      // Ensure duplicate punches don't create multiple records
      const uniqueKey = `${dateTime}_${empCode}`.replace(/[^a-z0-9]/gi, '_');
      const logPath = `Institutes/${instituteId}/essl_logs/${uniqueKey}`;

      // We should technically check if it exists first, but since we use updates dict and Firebase update,
      // it will simply overwrite with identical data if repeated in the same batch.
      // To strictly avoid duplicate processing (like sending SMS twice), we can do a quick check:
      const existingSnap = await db.ref(logPath).get();
      if (existingSnap.exists()) {
        continue;
      }

      // Determine "IN" or "OUT" status
      let punchType: "IN" | "OUT" = "IN";
      const s = statusRaw.toString().trim().toUpperCase();
      if (s === "IN" || s === "CHECKIN" || s === "0" || s === "P") punchType = "IN";
      else if (s === "OUT" || s === "CHECKOUT" || s === "1") punchType = "OUT";

      // Match Student
      const student: any = students.find((s: any) => {
        if (!s.rollNo) return false;
        const dbRoll = s.rollNo.toString().toLowerCase().trim();
        const machineCode = empCode.toString().toLowerCase().trim();
        return dbRoll === machineCode || dbRoll === `stu_${machineCode}` || machineCode === `stu_${dbRoll}`;
      });

      // Match Staff
      const employee: any = staff.find((e: any) =>
        e.employeeId?.toString() === empCode.toString() ||
        e.id?.toString() === empCode.toString()
      );

      const logEntry = {
        EmployeeCode: empCode,
        DateTime: dateTime,
        Status: punchType,
        SerialNumber: serialNum,
        source: "WEBHOOK",
        processedAt: new Date().toISOString(),
        smsSent: false,
        isSMSSent: false
      };

      // Send SMS automatically if matched to a student with a mobile number
      if (student && student.fatherMobile) {
        const smsPromise = sendAttendanceSmsServer({
          mobile: student.fatherMobile,
          studentName: student.studentName || student.name,
          dateTime: dateTime,
          type: punchType
        }).then(async (res) => {
          if (res.success) {
            // Mark as sent in DB when resolved
            await db.ref().update({ [`${logPath}/isSMSSent`]: true, [`${logPath}/smsSent`]: true });
          }
          return res;
        });

        smsPromises.push(smsPromise);
        logEntry.smsSent = true;
        logEntry.isSMSSent = true;
      }

      updates[logPath] = logEntry;
      savedCount++;

      // Track daily attendance updates
      if (student) {
        const studentId = student.id;
        const batchId = student.batchId || "all";
        const attPath = `Institutes/${instituteId}/attendance/Student/${date}/${batchId}/${studentId}`;

        const existingAtt = attendanceUpdates[attPath] || { status: "Present", remarks: "Instant Sync via Webhook", updatedAt: Date.now() };
        if (!existingAtt.checkIn || time < existingAtt.checkIn) existingAtt.checkIn = time;
        if (!existingAtt.checkOut || time > existingAtt.checkOut) existingAtt.checkOut = time;
        attendanceUpdates[attPath] = existingAtt;

      } else if (employee) {
        const empId = employee.id;
        const attPath = `Institutes/${instituteId}/attendance/Staff/${date}/${empId}`;
        
        const existingAtt = attendanceUpdates[attPath] || { status: "Present", remarks: "Instant Sync via Webhook", updatedAt: Date.now() };
        if (!existingAtt.checkIn || time < existingAtt.checkIn) existingAtt.checkIn = time;
        if (!existingAtt.checkOut || time > existingAtt.checkOut) existingAtt.checkOut = time;
        attendanceUpdates[attPath] = existingAtt;
      }
    }

    // Apply main log insertions
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }

    // Merge and apply daily attendance updates safely
    if (Object.keys(attendanceUpdates).length > 0) {
      const finalAttUpdates: any = {};
      for (const [path, data] of Object.entries(attendanceUpdates)) {
        const snap = await db.ref(path).get();
        const existingVal = snap.val() || data;
        if (snap.exists()) {
          if ((data as any).checkIn && (!existingVal.checkIn || (data as any).checkIn < existingVal.checkIn)) existingVal.checkIn = (data as any).checkIn;
          if ((data as any).checkOut && (!existingVal.checkOut || (data as any).checkOut > existingVal.checkOut)) existingVal.checkOut = (data as any).checkOut;
        }
        finalAttUpdates[path] = existingVal;
      }
      await db.ref().update(finalAttUpdates);
    }

    // Wait for all SMS dispatches
    if (smsPromises.length > 0) {
      await Promise.allSettled(smsPromises);
    }

    console.log(`[Webhook] Processed ${savedCount} new punch logs instantly.`);
    return NextResponse.json({ success: true, message: `Processed ${savedCount} new logs` });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
