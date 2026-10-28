
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { sendAttendanceSmsServer } from "@/lib/sms-server";

export const dynamic = 'force-dynamic';

/**
 * API Route: /api/CheckEsslAttendance
 * Purpose: Automated check and database update for eSSL Attendance records.
 * Path in DB: attendance/CheckEsslAttendance/pushKey/{EmployeeCode}
 */

/**
 * Helper: Resolves any eSSL Att State value to a normalized "IN" or "OUT".
 * Handles: Check-In, Check-Out, 0, 1, 4 (Overtime-In), 5 (Overtime-Out), P, IN, OUT
 */
function resolveEsslStatus(raw: string | number | null | undefined): "IN" | "OUT" | "UNKNOWN" {
  const s = (raw ?? "").toString().trim().toUpperCase().replace(/-/g, "");
  // Check-In variants
  if (s === "CHECKIN" || s === "0" || s === "4" || s === "P" || s.startsWith("IN")) return "IN";
  // Check-Out variants
  if (s === "CHECKOUT" || s === "1" || s === "5" || s.startsWith("OUT")) return "OUT";
  return "UNKNOWN";
}

async function getSmartPunchType(
  employeeCode: string,
  rawStatus: string | number | null | undefined,
  punchDate: string,
  instituteId: string
): Promise<"IN" | "OUT"> {
  const resolved = resolveEsslStatus(rawStatus);
  if (resolved === "IN") return "IN";
  if (resolved === "OUT") return "OUT";

  // If UNKNOWN/ambiguous: check if there's already an IN punch for this employee today
  const dateStr = punchDate.split(' ')[0]; // yyyy-MM-dd
  try {
    const logsSnap = await db.ref(`Institutes/${instituteId}/essl_logs`)
      .orderByChild("DateTime")
      .startAt(dateStr)
      .get();

    if (logsSnap.exists()) {
      const logs = Object.values(logsSnap.val() as any);
      const studentRoll = employeeCode.toString().toLowerCase().trim();

      const hasInPunch = logs.some((l: any) => {
        const lCode = l.EmployeeCode?.toString().toLowerCase().trim();
        const lDate = l.DateTime?.split(' ')[0];
        const lStatus = (l.Status || "").toString().trim().toUpperCase();

        return (
          (lCode === studentRoll || lCode === `stu_${studentRoll}` || studentRoll === `stu_${lCode}`) &&
          lDate === dateStr &&
          lStatus === "IN"
        );
      });

      if (hasInPunch) return "OUT";
    }
  } catch (err) {
    console.error("[getSmartPunchType] error checking logs:", err);
  }
  return "IN"; // Fallback to IN for the first punch
}

/**
 * Helper: Syncs log entries to the daily attendance record (Present/Absent/Check-In/Out)
 */
async function syncToAttendance(logs: any[], instituteId: string) {
  if (!logs || logs.length === 0) return;

  try {
    // Fetch all students and staff for matching
    const [studentsSnap, staffSnap] = await Promise.all([
      db.ref(`Institutes/${instituteId}/admissions`).get(),
      db.ref(`Institutes/${instituteId}/employees`).get()
    ]);

    const students = studentsSnap.exists() ? Object.values(studentsSnap.val() as any) : [];
    const staff = staffSnap.exists() ? Object.values(staffSnap.val() as any) : [];

    const updates: any = {};

    for (const log of logs) {
      const code = log.EmployeeCode;
      const dateTime = log.DateTime;
      if (!code || !dateTime) continue;

      const [date, time] = dateTime.split(' ');
      if (!date || !time) continue;

      // Find matching entity
      const student: any = students.find((s: any) => {
        if (!s.rollNo) return false;
        const dbRoll = s.rollNo.toString().toLowerCase().trim();
        const machineCode = code.toString().toLowerCase().trim();
        return dbRoll === machineCode ||
          dbRoll === `stu_${machineCode}` ||
          machineCode === `stu_${dbRoll}` ||
          dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
      });

      const employee: any = staff.find((e: any) =>
        e.employeeId?.toString() === code.toString() ||
        e.id?.toString() === code.toString()
      );

      if (student) {
        const studentId = student.id;
        const batchId = student.batchId || "all";
        const path = `Institutes/${instituteId}/attendance/Student/${date}/${batchId}/${studentId}`;

        // Use a placeholder if record doesn't exist yet
        // In a real environment we'd fetch existing, but for a batch update we can use a clever trick
        // or just accept that multiple punches will update the node.

        // For server-side sync, it's safer to fetch existing if we want to preserve checkIn/Out
        const existingSnap = await db.ref(path).get();
        const existing = existingSnap.val() || {
          status: "Present",
          remarks: "Synced via API",
          updatedAt: Date.now()
        };

        if (!existing.checkIn || time < existing.checkIn) existing.checkIn = time;
        if (!existing.checkOut || time > existing.checkOut) existing.checkOut = time;

        updates[path] = existing;
      } else if (employee) {
        const empId = employee.id;
        const path = `Institutes/${instituteId}/attendance/Staff/${date}/${empId}`;

        const existingSnap = await db.ref(path).get();
        const existing = existingSnap.val() || {
          status: "Present",
          remarks: "Synced via API",
          updatedAt: Date.now()
        };

        if (!existing.checkIn || time < existing.checkIn) existing.checkIn = time;
        if (!existing.checkOut || time > existing.checkOut) existing.checkOut = time;

        updates[path] = existing;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }
  } catch (err) {
    console.error("[syncToAttendance] Error:", err);
  }
}

export function extractPunchParams(req: NextRequest, bodyData: any = {}) {
  const { searchParams } = new URL(req.url);

  const getVal = (keys: string[]) => {
    for (const key of keys) {
      if (bodyData && bodyData[key] !== undefined && bodyData[key] !== null) {
        return bodyData[key].toString().trim();
      }
      const queryVal = searchParams.get(key);
      if (queryVal !== null && queryVal !== undefined) {
        return queryVal.trim();
      }
    }
    return null;
  };

  const employeeCode = getVal(["EmployeeCode", "employeeCode", "UserId", "userId", "EnrollNumber", "enrollNumber", "UserCode", "userCode", "pin", "PIN", "emp_code", "emp_id"]);
  const rawStatus = getVal(["Status", "status", "Direction", "direction", "ioMode", "IOMode", "PunchType", "punchType", "state", "punch_state"]);
  const dateTime = getVal(["DateTime", "dateTime", "LogDate", "logDate", "PunchDate", "punchDate", "time", "Time", "punch_time"]);
  const serialNumber = getVal(["SerialNumber", "serialNumber", "DeviceID", "deviceId", "DeviceSerialNumber", "deviceSerialNumber", "sn"]);
  const instituteId = getVal(["instituteId", "instituteID"]) || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2";

  return { employeeCode, rawStatus, dateTime, serialNumber, instituteId };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { employeeCode, rawStatus, dateTime, serialNumber, instituteId } = extractPunchParams(req);

  const status = rawStatus || "IN";
  const punchDate = dateTime || new Date().toLocaleString();
  const source = searchParams.get("source") || "MANUAL_GET";
  const finalSerialNumber = serialNumber || "MANUAL";

  // 0. If no EmployeeCode is provided, this acts as a "Full Sync Trigger" or "Get Logs" request
  if (!employeeCode) {
    if (instituteId) {
      const action = searchParams.get("action");
      if (action === "getLogs") {
        return await handleGetLogs(instituteId, req);
      }
      return await handleFullSync(instituteId, req);
    }
    return NextResponse.json({
      error: "Missing EmployeeCode or instituteId",
      tip: "Use ?EmployeeCode=110... for single punch, or ?instituteId=ID for full machine sync, or ?action=getLogs for fast database logs."
    }, { status: 400 });
  }

  try {
    const punchType = await getSmartPunchType(employeeCode, status, punchDate, instituteId);

    // 1. Prepare logic for SMS Sending
    let isSMSSent = false;
    let studentNameFound = null;

    if (instituteId) {
      const studentsSnap = await db.ref(`Institutes/${instituteId}/admissions`).get();
      if (studentsSnap.exists()) {
        const students = Object.values(studentsSnap.val() as any);
        const student: any = students.find((s: any) => {
          if (!s.rollNo) return false;
          const dbRoll = s.rollNo.toString().toLowerCase().trim();
          const machineCode = employeeCode.toString().toLowerCase().trim();
          return dbRoll === machineCode ||
            dbRoll === `stu_${machineCode}` ||
            machineCode === `stu_${dbRoll}` ||
            dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
        });

        if (student && student.fatherMobile && student.fatherMobile !== "N/A") {
          studentNameFound = student.studentName;
          try {
            let mobile = student.fatherMobile.toString().trim();
            if (mobile.length === 10 && !mobile.startsWith("91")) mobile = "91" + mobile;

            const smsRes = await sendAttendanceSmsServer({
              mobile: mobile,
              studentName: student.studentName,
              dateTime: punchDate,
              type: punchType
            });
            isSMSSent = smsRes.success;
          } catch (smsErr) {
            console.error(`[SMS Error] ${employeeCode}:`, smsErr);
            isSMSSent = false;
          }
        }
      }
    }

    // 2. Prepare Log Entry
    const logEntry = {
      EmployeeCode: employeeCode,
      DateTime: punchDate,
      Status: punchType,
      isSMSSent: isSMSSent,
      source: source,
      instituteId: instituteId,
      SerialNumber: finalSerialNumber,
      processedAt: new Date().toISOString()
    };

    // 3. Update Database
    const uniqueKey = `${logEntry.DateTime}_${logEntry.EmployeeCode}`.replace(/[^a-z0-9]/gi, '_');

    // A. Transaction Log
    await db.ref(`Institutes/${instituteId}/essl_logs/${uniqueKey}`).set(logEntry);

    // B. Latest Status Node (Legacy support)
    await db.ref(`attendance/CheckEsslAttendance/pushKey/${employeeCode}`).set({
      isSMSSent,
      punchDate,
      status: logEntry.Status
    });

    // 4. Sync to Attendance Dashboard (Mark Present)
    await syncToAttendance([logEntry], instituteId!);

    return NextResponse.json({
      success: true,
      message: `Manual punch collected for ${studentNameFound || employeeCode}`,
      data: logEntry
    });

  } catch (error: any) {
    console.error("[API Error] CheckEsslAttendance:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        body = await req.json();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        const obj: any = {};
        formData.forEach((value, key) => {
          obj[key] = value;
        });
        body = obj;
      }
    } catch (err) {
      console.warn("[POST CheckEsslAttendance] Failed to parse body:", err);
    }

    const { employeeCode, rawStatus, dateTime, serialNumber, instituteId } = extractPunchParams(req, body);

    if (!employeeCode || !instituteId) {
      return NextResponse.json({
        error: "Missing EmployeeCode or instituteId",
        tip: "Provide EmployeeCode (or alternative names like UserId) and optionally instituteId in the request body or query params."
      }, { status: 400 });
    }

    const status = rawStatus || "IN";
    const punchDate = dateTime || new Date().toLocaleString();
    const punchType = await getSmartPunchType(employeeCode, status, punchDate, instituteId);
    const source = body.source || searchParams.get("source") || "MANUAL_POST";
    const finalSerialNumber = serialNumber || "MANUAL";

    let isSMSSent = false;
    const studentsSnap = await db.ref(`Institutes/${instituteId}/admissions`).get();
    if (studentsSnap.exists()) {
      const students = Object.values(studentsSnap.val() as any);
      const student: any = students.find((s: any) => {
        const dbRoll = s.rollNo?.toString().toLowerCase().trim();
        const machineCode = employeeCode.toString().toLowerCase().trim();
        return dbRoll === machineCode || dbRoll === `stu_${machineCode}` || machineCode === `stu_${dbRoll}`;
      });

      if (student && student.fatherMobile && student.fatherMobile !== "N/A") {
        try {
          let mobile = student.fatherMobile.toString().trim();
          if (mobile.length === 10 && !mobile.startsWith("91")) mobile = "91" + mobile;

          const smsRes = await sendAttendanceSmsServer({
            mobile: mobile,
            studentName: student.studentName,
            dateTime: punchDate,
            type: punchType
          });
          isSMSSent = smsRes.success;
        } catch (smsErr) {
          console.error(`[SMS Error] ${employeeCode}:`, smsErr);
          isSMSSent = false;
        }
      }
    }

    const logEntry = {
      EmployeeCode: employeeCode,
      DateTime: punchDate,
      Status: punchType,
      isSMSSent: isSMSSent,
      source: source,
      instituteId: instituteId,
      processedAt: new Date().toISOString(),
      SerialNumber: finalSerialNumber
    };

    const uniqueKey = `${logEntry.DateTime}_${logEntry.EmployeeCode}`.replace(/[^a-z0-9]/gi, '_');
    await db.ref(`Institutes/${instituteId}/essl_logs/${uniqueKey}`).set(logEntry);

    // Sync to Attendance Dashboard
    await syncToAttendance([logEntry], instituteId);

    return NextResponse.json({
      success: true,
      message: "Punch collected and synced to attendance",
      data: logEntry
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleFullSync(instituteId: string, req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { fetchEsslLogsServer } = await import("@/lib/essl-server");

    const today = new Date();
    const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const defaultFrom = `${localDate} 00:00:00`;
    const defaultTo = `${localDate} 23:59:59`;

    const fromDate = searchParams.get("FromDateTime") || defaultFrom;
    const toDate = searchParams.get("ToDateTime") || defaultTo;

    console.log(`[handleFullSync] Fetching logs for range: ${fromDate} to ${toDate}`);

    const serialNumber = searchParams.get("SerialNumber") || searchParams.get("serialNumber") || "NFZ8245102868";
    const userName = searchParams.get("UserName") || searchParams.get("userName") || "aspireedu";
    const userPassword = searchParams.get("UserPassword") || searchParams.get("userPassword") || "Aspire@123";

    let rawLogs: any[] = [];
    try {
      rawLogs = await fetchEsslLogsServer({
        FromDateTime: fromDate,
        ToDateTime: toDate,
        SerialNumber: serialNumber,
        UserName: userName,
        UserPassword: userPassword
      });
    } catch (machineErr: any) {
      console.warn("[handleFullSync] Machine sync failed or timed out, loading from DB only:", machineErr.message);
      // Proceed with rawLogs = [] so we still load the DB logs
    }

    if (!rawLogs) {
      rawLogs = [];
    }

    const initialMachineLogsCount = rawLogs.length;

    // 1. Filter by strict date range and remove exact duplicates (same timestamp/code)
    const seenMap = new Set();
    rawLogs = rawLogs.filter(log => {
      const isInRange = log.DateTime >= fromDate && log.DateTime <= toDate;
      const uniqueKey = `${log.EmployeeCode}_${log.DateTime}`;
      if (isInRange && !seenMap.has(uniqueKey)) {
        seenMap.add(uniqueKey);
        return true;
      }
      return false;
    });

    // 2. Smart Status Inference: Group by employee+date, earliest = IN, latest = OUT
    // This fixes cases where the machine sends empty/ambiguous status values.
    const punchesGroupedByDay = new Map<string, any[]>();
    for (const log of rawLogs) {
      const date = log.DateTime.split(" ")[0];
      const groupKey = `${log.EmployeeCode}_${date}`;
      if (!punchesGroupedByDay.has(groupKey)) punchesGroupedByDay.set(groupKey, []);
      punchesGroupedByDay.get(groupKey)!.push(log);
    }

    // Assign smart status based on eSSL Att State value, with chronological fallback
    const logsWithSmartStatus = rawLogs.map(log => {
      const date = log.DateTime.split(" ")[0];
      const groupKey = `${log.EmployeeCode}_${date}`;
      const dayLogs = punchesGroupedByDay.get(groupKey)!.sort((a, b) => a.DateTime.localeCompare(b.DateTime));

      const rawStatus = (log.Status ?? "").toString().trim();
      const normalized = rawStatus.toUpperCase().replace(/-/g, "");

      let resolvedStatus: "IN" | "OUT";

      if (normalized === "CHECKIN" || normalized === "0" || normalized === "4" || normalized === "P" || normalized.startsWith("IN")) {
        // Explicit Check-In from machine (Check-In, 0, 4=Overtime-In, P)
        resolvedStatus = "IN";
      } else if (normalized === "CHECKOUT" || normalized === "1" || normalized === "5" || normalized.startsWith("OUT")) {
        // Explicit Check-Out from machine (Check-Out, 1, 5=Overtime-Out)
        resolvedStatus = "OUT";
      } else {
        // No explicit status — use chronological order: first punch of day = IN, rest = OUT
        resolvedStatus = (log.DateTime === dayLogs[0].DateTime) ? "IN" : "OUT";
      }

      return { ...log, Status: resolvedStatus };
    });

    // 3. Strict Deduplication: ONE IN and ONE OUT per person per day
    const dailyPunches = new Map<string, any>();

    for (const log of logsWithSmartStatus) {
      const date = log.DateTime.split(" ")[0];
      const dedupeKey = `${log.EmployeeCode}_${date}_${log.Status}`;

      if (dailyPunches.has(dedupeKey)) {
        const existing = dailyPunches.get(dedupeKey);
        // Keep the earliest IN and the latest OUT
        if (log.Status === "IN") {
          if (log.DateTime < existing.DateTime) dailyPunches.set(dedupeKey, log);
        } else {
          if (log.DateTime > existing.DateTime) dailyPunches.set(dedupeKey, log);
        }
      } else {
        dailyPunches.set(dedupeKey, log);
      }
    }

    const deduplicatedLogs = Array.from(dailyPunches.values()).map(log => ({
      ...log,
      source: "MACHINE_SYNC",
      processedAt: new Date().toISOString()
    }));

    // 3. SMS Logic for Deduplicated Entries
    const [studentsSnap, existingLogsSnap, dbLogsSnap] = await Promise.all([
      db.ref(`Institutes/${instituteId}/admissions`).get(),
      db.ref(`Institutes/${instituteId}/attendance/essl-attendce-logs-2`).get(),
      db.ref(`Institutes/${instituteId}/essl_logs`).get()
    ]);

    const students = studentsSnap.exists() ? Object.values(studentsSnap.val() as any) : [];
    const existingLogs = existingLogsSnap.val() || {};
    const todayStr = new Date().toISOString().split('T')[0];

    for (const log of deduplicatedLogs) {
      const uniqueKey = `${log.DateTime}_${log.EmployeeCode}`.replace(/[^a-z0-9]/gi, '_');
      const alreadySent = existingLogs[uniqueKey]?.IsSendSms === true;

      if (!alreadySent) {
        const student: any = students.find((s: any) => {
          if (!s.rollNo) return false;
          const dbRoll = s.rollNo.toString().toLowerCase().trim();
          const machineCode = log.EmployeeCode.toString().toLowerCase().trim();
          return dbRoll === machineCode || dbRoll === `stu_${machineCode}` || machineCode === `stu_${dbRoll}` ||
            dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
        });

        if (student && student.fatherMobile && student.fatherMobile !== "N/A") {
          try {
            let mobile = student.fatherMobile.toString().trim();
            if (mobile.length === 10 && !mobile.startsWith("91")) mobile = "91" + mobile;

            const smsRes = await sendAttendanceSmsServer({
              mobile: mobile,
              studentName: student.studentName,
              dateTime: log.DateTime,
              type: log.Status
            });
            log.IsSendSms = smsRes.success;
          } catch (smsErr) {
            console.error(`[SMS Error] ${log.EmployeeCode}:`, smsErr);
            log.IsSendSms = false;
          }
        }
      } else {
        log.IsSendSms = true;
      }
    }

    // 4. Batch Database Updates
    const updates: any = {};

    // A. Save ALL logs with smart-inferred status to the Transaction Logs path (essl_logs)
    for (const log of logsWithSmartStatus) {
      const uniqueKey = `${log.DateTime}_${log.EmployeeCode}`.replace(/[^a-z0-9]/gi, '_');
      updates[`Institutes/${instituteId}/essl_logs/${uniqueKey}`] = {
        ...log,
        source: "MACHINE_SYNC",
        processedAt: new Date().toISOString()
      };
    }

    // B. Save Deduplicated logs to the Archival path
    for (const log of deduplicatedLogs) {
      const uniqueKey = `${log.DateTime}_${log.EmployeeCode}`.replace(/[^a-z0-9]/gi, '_');
      updates[`Institutes/${instituteId}/attendance/essl-attendce-logs-2/${uniqueKey}`] = log;
    }

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      await syncToAttendance(deduplicatedLogs, instituteId);
    }

    // 5. Final Combined Response — use logsWithSmartStatus (already has correct IN/OUT)
    const rawDbLogs = [
      ...Object.values(dbLogsSnap.val() || {}),
      ...Object.values(existingLogsSnap.val() || {})
    ];

    const allDbLogs = rawDbLogs.filter((l: any) => {
      if (!l || !l.DateTime) return false;
      // Fast fallback string check, and try to handle different formats safely
      const logDate = l.DateTime.split(' ')[0];
      const fromD = fromDate.split(' ')[0];
      const toD = toDate.split(' ')[0];

      // If the logDate format is completely different, we might accidentally filter it out.
      // To be safe and show latest logs from the database in the API, we keep it if we are unsure.
      if (logDate && logDate.length === 10 && logDate.includes('-')) {
        return logDate >= fromD && logDate <= toD;
      }
      return true; // Keep it to ensure latest DB logs are returned
    });

    const mergedLogsMap = new Map();

    // 1. Add all DB logs to map
    for (const l of allDbLogs) {
      const key = `${l.EmployeeCode}_${l.DateTime}`;
      mergedLogsMap.set(key, l);
    }

    // 2. Add/Overwrite with newly fetched machine logs
    for (const l of logsWithSmartStatus) {
      const key = `${l.EmployeeCode}_${l.DateTime}`;
      const isDedupeLog = deduplicatedLogs.find(dl =>
        dl.EmployeeCode === l.EmployeeCode && dl.DateTime === l.DateTime
      );
      mergedLogsMap.set(key, {
        ...l,
        source: "MACHINE_SYNC",
        IsSendSms: isDedupeLog ? isDedupeLog.IsSendSms : false
      });
    }

    const combinedLogs = Array.from(mergedLogsMap.values()).map(l => {
      const student = students.find((s: any) => {
        if (!s.rollNo) return false;
        const dbRoll = s.rollNo.toString().toLowerCase().trim();
        const machineCode = l.EmployeeCode.toString().toLowerCase().trim();
        return dbRoll === machineCode || dbRoll === `stu_${machineCode}` || machineCode === `stu_${dbRoll}` ||
          dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
      });
      const rawStatus = (l.Status || "").toString().trim().toUpperCase();
      return {
        ...l,
        Status: rawStatus.includes("IN") ? "IN" : (rawStatus.includes("OUT") ? "OUT" : rawStatus),
        StudentName: student?.studentName || l.studentName || (l.source?.includes("MANUAL") ? "Manual Entry" : "Unknown"),
        FatherMobile: student?.fatherMobile || l.fatherMobile || "N/A"
      };
    }).sort((a, b) => b.DateTime.localeCompare(a.DateTime));

    const duplicatesRemoved = initialMachineLogsCount - deduplicatedLogs.length;

    const fiveHoursAgoMs = Date.now() - (5 * 60 * 60 * 1000);
    const logsLast5Hours = combinedLogs.filter(l => {
      const logTime = new Date(l.DateTime).getTime();
      return !isNaN(logTime) && logTime >= fiveHoursAgoMs;
    }).length;

    // Read optional limit query parameter. If no limit is specified, we return ALL logs.
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : null;
    const finalLogs = limit ? combinedLogs.slice(0, limit) : combinedLogs;

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${initialMachineLogsCount} logs from machine, removed ${duplicatesRemoved} duplicates.`,
      range: { from: fromDate, to: toDate },
      summary: {
        totalLogs: combinedLogs.length,
        logsLast5Hours: logsLast5Hours,
        totalFromMachine: initialMachineLogsCount,
        duplicatesRemoved: duplicatesRemoved,
        afterDeduplication: deduplicatedLogs.length,
        totalIn: combinedLogs.filter(l => l.Status === "IN").length,
        totalOut: combinedLogs.filter(l => l.Status === "OUT").length,
        totalManual: allDbLogs.filter((l: any) => l.source?.includes("MANUAL") || l.SerialNumber === "MANUAL").length
      },
      data: finalLogs,
      note: limit
        ? `All logs are successfully saved to Firebase. Returning the latest ${limit} logs for preview.`
        : "All logs are successfully saved to Firebase and returned in the response."
    });

  } catch (error: any) {
    console.error("[handleFullSync] Critical Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleGetLogs(instituteId: string, req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit") || "1000";
    const limit = parseInt(limitParam, 10);

    const [studentsSnap, dbLogsSnap] = await Promise.all([
      db.ref(`Institutes/${instituteId}/admissions`).get(),
      db.ref(`Institutes/${instituteId}/essl_logs`).get()
    ]);

    const students = studentsSnap.exists() ? Object.values(studentsSnap.val() as any) : [];
    let logs = dbLogsSnap.exists() ? Object.values(dbLogsSnap.val() as any) : [];

    // Map fields
    const enrichedLogs = logs.map((l: any) => {
      const student = students.find((s: any) => {
        if (!s.rollNo) return false;
        const dbRoll = s.rollNo.toString().toLowerCase().trim();
        const machineCode = (l.EmployeeCode || "").toString().toLowerCase().trim();
        return dbRoll === machineCode || dbRoll === `stu_${machineCode}` || machineCode === `stu_${dbRoll}` ||
          dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
      });
      const rawStatus = (l.Status || "").toString().trim().toUpperCase();
      return {
        ...l,
        Status: rawStatus.includes("IN") ? "IN" : (rawStatus.includes("OUT") ? "OUT" : rawStatus),
        StudentName: student?.studentName || l.studentName || (l.source?.includes("MANUAL") ? "Manual Entry" : "Unknown"),
        FatherMobile: student?.fatherMobile || l.fatherMobile || "N/A"
      };
    });

    // Sort descending
    enrichedLogs.sort((a: any, b: any) => {
      if (a.DateTime && b.DateTime) {
        return b.DateTime.localeCompare(a.DateTime);
      }
      return 0;
    });

    const fiveHoursAgoMs = Date.now() - (5 * 60 * 60 * 1000);
    const logsLast5Hours = enrichedLogs.filter((l: any) => {
      const logTime = new Date(l.DateTime).getTime();
      return !isNaN(logTime) && logTime >= fiveHoursAgoMs;
    }).length;

    return NextResponse.json({
      success: true,
      message: `Successfully fetched latest ${limit} logs from database.`,
      summary: {
        totalLogs: enrichedLogs.length,
        logsLast5Hours: logsLast5Hours
      },
      data: enrichedLogs.slice(0, limit)
    });
  } catch (error: any) {
    console.error("[handleGetLogs] Critical Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}