import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { fetchEsslLogsServer } from "@/lib/essl-server";
import { sendAttendanceSmsServer } from "@/lib/sms-server";
import { format, subHours } from "date-fns";

export const dynamic = 'force-dynamic';

/**
 * Automation Route: /api/automation/sync-attendance
 * Can be called by cron-job.org every few minutes
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const instituteId = searchParams.get("instituteId");
  const key = searchParams.get("key");

  // 1. Security Check
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!instituteId) {
    return NextResponse.json({ error: "Missing instituteId" }, { status: 400 });
  }

  try {
    console.log(`[Automation] Starting sync for institute: ${instituteId}`);

    // 2. Setup Date Range (Last 2 hours to ensure no gaps)
    const now = new Date();
    // Using local server time. If deployed to a UTC server, consider using timezone offsets.
    const fromDate = format(subHours(now, 2), "yyyy-MM-dd HH:mm:ss");
    const toDate = format(now, "yyyy-MM-dd HH:mm:ss");

    // 3. Machine Configuration (In production, these should be in DB. Hardcoded for now per current setup)
    const machineConfig = {
      SerialNumber: "NFZ8245102868",
      UserName: "aspireedu",
      UserPassword: "Aspire@123"
    };

    // 4. Fetch Logs from Machine
    const rawLogs = await fetchEsslLogsServer({
      FromDateTime: fromDate,
      ToDateTime: toDate,
      ...machineConfig
    });

    if (rawLogs.length === 0) {
      return NextResponse.json({ success: true, message: "No new logs found in range", count: 0 });
    }

    // 5. Fetch Student and Existing Log Data from Firebase
    // Optimization: Only fetch logs from the date of our earliest new log
    const sortedLogs = [...rawLogs].sort((a: any, b: any) => a.DateTime.localeCompare(b.DateTime));
    const firstLogDate = sortedLogs[0]?.DateTime?.split(" ")[0] || "2020-01-01";

    const [studentsSnap, existingLogsSnap] = await Promise.all([
      db.ref(`Institutes/${instituteId}/admissions`).get(),
      db.ref(`Institutes/${instituteId}/essl_logs`)
        .orderByChild("DateTime")
        .startAt(firstLogDate)
        .get()
    ]);

    const students = studentsSnap.exists() ? Object.values(studentsSnap.val() as any) : [];
    const existingLogs = existingLogsSnap.val() || {};

    const updates: any = {};
    const smsPromises: Promise<any>[] = [];
    let newLogsCount = 0;
    let smsSentCount = 0;

    // 6. Process Logs - Sort chronologically so first punch of day is processed first
    const inPunchesThisRun = new Set<string>(); // key: studentRoll_date

    for (const log of sortedLogs) {
      const uniqueKey = `${log.DateTime}_${log.EmployeeCode}`.replace(/[^a-z0-9]/gi, '_');
      const existingLog = existingLogs[uniqueKey];

      const isNew = !existingLog;
      const needsSms = isNew || (existingLog && !existingLog.smsSent);

      if (isNew || needsSms) {
        if (isNew) newLogsCount++;

        // Find Student
        const student: any = students.find((s: any) => {
          if (!s.rollNo || !log.EmployeeCode) return false;
          const dbRoll = s.rollNo.toString().toLowerCase().trim();
          const machineCode = log.EmployeeCode.toString().toLowerCase().trim();
          return dbRoll === machineCode ||
            dbRoll === `stu_${machineCode}` ||
            machineCode === `stu_${dbRoll}` ||
            dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
        });

        if (student) {
          const studentRoll = student.rollNo.toString().toLowerCase().trim();
          const logDate = log.DateTime.split(" ")[0]; // "yyyy-MM-dd"
          const runKey = `${studentRoll}_${logDate}`;

          // Check if there is an IN punch for this student today
          let hasInPunchToday = inPunchesThisRun.has(runKey);

          if (!hasInPunchToday) {
            // Check in existing firebase logs
            for (const key in existingLogs) {
              const exLog = existingLogs[key];
              const exCode = exLog.EmployeeCode?.toString().toLowerCase().trim();
              if (
                (exCode === studentRoll || exCode === `stu_${studentRoll}` || studentRoll === `stu_${exCode}`) &&
                exLog.DateTime?.startsWith(logDate)
              ) {
                const exStatus = (exLog.Status || "").toString().trim().toUpperCase();
                if (exStatus === "IN") {
                  hasInPunchToday = true;
                  break;
                }
              }
            }
          }

          // Smart Status Resolution
          let punchType: "IN" | "OUT";
          const rawStatus = (log.Status || "").toString().trim().toUpperCase();
          if (rawStatus === "IN" || rawStatus === "CHECKIN" || rawStatus === "0" || rawStatus === "P") {
            punchType = "IN";
          } else if (rawStatus === "OUT" || rawStatus === "CHECKOUT" || rawStatus === "1") {
            punchType = "OUT";
          } else {
            // UNKNOWN or empty fallback
            punchType = hasInPunchToday ? "OUT" : "IN";
          }

          // If resolved as IN, mark it locally
          if (punchType === "IN") {
            inPunchesThisRun.add(runKey);
          }

          const logEntry = {
            ...log,
            Status: punchType, // Update status to standardized value
            smsSent: existingLog?.smsSent || false
          };

          if (student.fatherMobile && needsSms) {
            console.log(`[Automation] Sending SMS to ${student.studentName} (${punchType})`);

            const smsPromise = sendAttendanceSmsServer({
              mobile: student.fatherMobile,
              studentName: student.studentName,
              dateTime: log.DateTime,
              type: punchType
            }).then(async (res) => {
              if (res.success) {
                smsSentCount++;
                // Mark as sent in DB immediately
                await db.ref(`Institutes/${instituteId}/essl_logs/${uniqueKey}/smsSent`).set(true);
              }
              return res;
            });

            smsPromises.push(smsPromise);
            logEntry.smsSent = true;
          }

          if (isNew) {
            updates[`Institutes/${instituteId}/essl_logs/${uniqueKey}`] = logEntry;
          }
        } else {
          // Non-student log or generic staff log
          const logEntry = {
            ...log,
            smsSent: false
          };
          if (isNew) {
            updates[`Institutes/${instituteId}/essl_logs/${uniqueKey}`] = logEntry;
          }
        }
      }
    }

    // 7. Save New Logs
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }

    // 8. Wait for SMS completion
    if (smsPromises.length > 0) {
      await Promise.allSettled(smsPromises);
    }

    // 9. Sync to Attendance Records (Mark as Present)
    // Reusing the logic from esslService.syncToFirebase but adapted for server
    await syncToAttendance(rawLogs, instituteId, students);

    return NextResponse.json({
      success: true,
      summary: {
        totalFetched: rawLogs.length,
        newLogsSaved: newLogsCount,
        smsSent: smsSentCount
      }
    });

  } catch (error: any) {
    console.error("[Automation Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Syncs machine logs to the daily attendance collection
 */
async function syncToAttendance(logs: any[], instituteId: string, students: any[]) {
  const updates: any = {};

  for (const log of logs) {
    const code = log.EmployeeCode;
    const dateTime = log.DateTime;
    if (!code || !dateTime) continue;

    const [date, time] = dateTime.split(' ');

    const student = students.find((s: any) => {
      const dbRoll = s.rollNo?.toString().toLowerCase().trim();
      const machineCode = code.toString().toLowerCase().trim();
      return dbRoll === machineCode || dbRoll === `stu_${machineCode}` || machineCode === `stu_${dbRoll}`;
    });

    if (student) {
      const studentId = student.id;
      const batchId = student.batchId || "all";
      const path = `Institutes/${instituteId}/attendance/Student/${date}/${batchId}/${studentId}`;

      // Since we are running in automation, we update checkIn/checkOut if they are better than existing
      const snap = await db.ref(path).get();
      const existing = snap.val() || { status: "Present", remarks: "Auto-Synced", updatedAt: Date.now() };

      if (!existing.checkIn || time < existing.checkIn) existing.checkIn = time;
      if (!existing.checkOut || time > existing.checkOut) existing.checkOut = time;

      updates[path] = existing;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }
}
