import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import xml2js from "xml2js";

export const dynamic = 'force-dynamic';

function normalizeEsslStatus(raw: string | number | null | undefined): string {
  const s = (raw ?? "").toString().trim().toUpperCase().replace(/[\s-]/g, "");
  if (s === "CHECKIN" || s === "0" || s === "4" || s === "P" || s === "IN" || s === "OTIN") return "IN";
  if (s === "CHECKOUT" || s === "1" || s === "5" || s === "OUT" || s === "OTOUT") return "OUT";
  return s || "UNKNOWN";
}

async function parseSoapResponse(xmlData: string) {
  try {
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const result = await parser.parseStringPromise(xmlData);

    // Navigate through SOAP Envelope to get strDataList
    // The exact path might vary depending on namespaces, but xml2js makes properties accessible
    // usually Envelope -> Body -> GetTransactionsLogResponse -> GetTransactionsLogResult
    let strDataList = "";
    
    // Attempting various typical paths
    const envelope = result["soap12:Envelope"] || result["soap:Envelope"] || result.Envelope;
    if (envelope) {
      const body = envelope["soap12:Body"] || envelope["soap:Body"] || envelope.Body;
      if (body) {
        const response = body.GetTransactionsLogResponse;
        if (response) {
          // If the device directly returns strDataList or GetTransactionsLogResult
          strDataList = response.GetTransactionsLogResult || response.strDataList || "";
        }
      }
    }

    // Fallback regex if xml2js pathing fails due to namespace issues
    if (!strDataList) {
      const altMatch = xmlData.match(/<strDataList[^>]*>([\s\S]*?)(?:<\/strDataList>|$)/);
      if (altMatch) {
        strDataList = altMatch[1];
      }
    }

    return strDataList;
  } catch (error) {
    console.error("XML Parsing Error:", error);
    throw new Error("Failed to parse SOAP XML response");
  }
}

export async function POST(req: NextRequest) {
  const startTimer = Date.now();
  try {
    console.log("SOAP Request Started...");
    const body = await req.json();
    const instituteId = body.instituteId || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2";
    
    if (!instituteId) {
      return NextResponse.json({ error: "Missing instituteId" }, { status: 400 });
    }

    // Default dates if not provided: Fetch only the current day's logs
    const now = new Date();
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const FromDateTime = body.FromDateTime || `${formatDate(now)} 00:00:00`;
    const ToDateTime = body.ToDateTime || `${formatDate(now)} 23:59:59`;
    const SerialNumber = body.SerialNumber || "NFZ8245102868";
    const UserName = body.UserName || "aspireedu";
    const UserPassword = body.UserPassword || "Aspire@123";

    const BASE_URL = "http://27.116.54.3:83/iclock/webapiservice.asmx";
    const TARGET_URL = `${BASE_URL}?op=GetTransactionsLog`;

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <GetTransactionsLog xmlns="http://tempuri.org/">
      <FromDateTime>${FromDateTime}</FromDateTime>
      <ToDateTime>${ToDateTime}</ToDateTime>
      <SerialNumber>${SerialNumber}</SerialNumber>
      <UserName>${UserName}</UserName>
      <UserPassword>${UserPassword}</UserPassword>
      <strDataList></strDataList>
    </GetTransactionsLog>
  </soap12:Body>
</soap12:Envelope>`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(TARGET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
      body: soapEnvelope,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`SOAP Error (${response.status}):`, errText);
      await saveSyncError(instituteId, `SOAP Server Failed: ${response.status}`);
      return NextResponse.json({ error: "SOAP server failed", details: errText }, { status: response.status });
    }

    const xmlData = await response.text();
    console.log("SOAP Response Received");
    // console.log("Raw XML:", xmlData.substring(0, 500) + "..."); // Optional verbose XML logging
    
    const strDataList = await parseSoapResponse(xmlData);
    
    let processedLogs = [];
    if (strDataList && strDataList.trim()) {
      const lines = strDataList.trim().split(/\r?\n/);
      processedLogs = lines.map((line) => {
        let parts = line.split(/\t/);
        if (parts.length < 2) parts = line.split(/\s{2,}/);
        if (parts.length < 2) parts = line.split(/\s+/);

        let employeeCode = parts[0]?.trim();
        let punchTime = "";
        let verifyMode = "";
        let ioMode = "";
        let workCode = "";

        if (parts.length >= 4) {
          punchTime = `${parts[1]} ${parts[2]}`;
          ioMode = parts[3];
          if (parts[4]) verifyMode = parts[4];
          if (parts[5]) workCode = parts[5];
        } else if (parts.length === 3) {
          punchTime = parts[1];
          ioMode = parts[2];
        } else if (parts.length === 2) {
          punchTime = parts[1];
        }

        return {
          employeeCode,
          employeeName: "Unknown", // Will populate from DB below
          punchTime: punchTime?.trim(),
          deviceId: SerialNumber, // eSSL devices often don't return DeviceID directly in logs, using SerialNumber
          verifyMode,
          ioMode: normalizeEsslStatus(ioMode),
          workCode,
          serialNumber: SerialNumber,
          createdAt: new Date().toISOString()
        };
      }).filter(log => log.employeeCode && log.punchTime);
    }

    console.log(`Records Found: ${processedLogs.length}`);

    if (processedLogs.length === 0) {
      await saveSyncSuccess(instituteId, 0, 0);
      return NextResponse.json({ success: true, message: "No new records found.", recordsFound: 0 });
    }

    // Pre-fetch employees/students to resolve names and check duplicates in all biometric tables
    const [
      studentsSnap,
      staffSnap,
      esslLogsSnap,
      archivalLogsSnap,
      esslLogDbSnap
    ] = await Promise.all([
      db.ref(`Institutes/${instituteId}/admissions`).get(),
      db.ref(`Institutes/${instituteId}/employees`).get(),
      db.ref(`Institutes/${instituteId}/essl_logs`).get(),
      db.ref(`Institutes/${instituteId}/attendance/essl-attendce-logs-2`).get(),
      db.ref(`Institutes/${instituteId}/attendance/essl-log-db`).get()
    ]);

    const students = studentsSnap.exists() ? Object.values(studentsSnap.val() as any) : [];
    const staff = staffSnap.exists() ? Object.values(staffSnap.val() as any) : [];
    const existingEsslLogs = esslLogsSnap.val() || {};
    const existingArchivalLogs = archivalLogsSnap.val() || {};
    const existingEsslLogDb = esslLogDbSnap.val() || {};

    let inserted = 0;
    let skipped = 0;
    const updates: any = {};
    const logsToSync: any[] = [];

    for (const log of processedLogs) {
      const uniqueKey = `${log.punchTime}_${log.employeeCode}`.replace(/[^a-z0-9]/gi, '_');

      // Check Duplicate across all three databases
      if (existingEsslLogs[uniqueKey] || existingArchivalLogs[uniqueKey] || existingEsslLogDb[uniqueKey]) {
        skipped++;
        continue;
      }

      // Resolve Employee/Student Name
      let employeeName = log.employeeCode;
      const student: any = students.find((s: any) => {
        if (!s.rollNo) return false;
        const dbRoll = s.rollNo.toString().toLowerCase().trim();
        const machineCode = log.employeeCode.toString().toLowerCase().trim();
        return dbRoll === machineCode || dbRoll === `stu_${machineCode}` || machineCode === `stu_${dbRoll}`;
      });

      if (student) {
        employeeName = student.studentName || student.name;
      } else {
        const employee: any = staff.find((e: any) => 
          e.employeeId?.toString() === log.employeeCode.toString() || 
          e.id?.toString() === log.employeeCode.toString()
        );
        if (employee) {
          employeeName = employee.name || employee.employeeName;
        }
      }

      log.employeeName = employeeName;

      // Map to standard essl_logs database schema
      const esslLogEntry = {
        EmployeeCode: log.employeeCode,
        DateTime: log.punchTime,
        Status: log.ioMode,
        SerialNumber: log.serialNumber,
        source: "MACHINE_SYNC",
        processedAt: new Date().toISOString(),
        verifyMode: log.verifyMode || "",
        workCode: log.workCode || "",
        smsSent: false,
        isSMSSent: false
      };

      updates[`Institutes/${instituteId}/essl_logs/${uniqueKey}`] = esslLogEntry;
      logsToSync.push(esslLogEntry);
      inserted++;
    }

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      // Synchronize the synced logs to the daily student/staff attendance registries
      await syncToAttendance(logsToSync, instituteId);
    }

    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped Duplicate: ${skipped}`);
    console.log(`Sync Completed Successfully`);

    await saveSyncSuccess(instituteId, inserted, skipped);

    return NextResponse.json({
      success: true,
      message: "Sync Completed Successfully",
      recordsFound: processedLogs.length,
      inserted,
      skipped,
      timeTakenMs: Date.now() - startTimer
    });

  } catch (error: any) {
    console.error("Sync API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instituteId = searchParams.get("instituteId") || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2";

    if (!instituteId) {
      return NextResponse.json({ error: "Missing instituteId" }, { status: 400 });
    }

    // Fetch from all three database locations, plus history, students, and employees
    const [
      esslLogsSnap,
      archivalLogsSnap,
      esslLogDbSnap,
      syncHistorySnap,
      studentsSnap,
      staffSnap
    ] = await Promise.all([
      db.ref(`Institutes/${instituteId}/essl_logs`).get(),
      db.ref(`Institutes/${instituteId}/attendance/essl-attendce-logs-2`).get(),
      db.ref(`Institutes/${instituteId}/attendance/essl-log-db`).get(),
      db.ref(`Institutes/${instituteId}/essl_sync_history`).get(),
      db.ref(`Institutes/${instituteId}/admissions`).get(),
      db.ref(`Institutes/${instituteId}/employees`).get()
    ]);

    const rawEsslLogs = esslLogsSnap.exists() ? Object.values(esslLogsSnap.val() as any) : [];
    const rawArchivalLogs = archivalLogsSnap.exists() ? Object.values(archivalLogsSnap.val() as any) : [];
    const rawEsslLogDb = esslLogDbSnap.exists() ? Object.values(esslLogDbSnap.val() as any) : [];

    const syncHistory = syncHistorySnap.val() || { status: "Unknown", lastSync: "Never" };
    const students = studentsSnap.exists() ? Object.values(studentsSnap.val() as any) : [];
    const staff = staffSnap.exists() ? Object.values(staffSnap.val() as any) : [];

    // Combine all raw logs
    const allRawLogs = [...rawEsslLogs, ...rawArchivalLogs, ...rawEsslLogDb];

    // Deduplicate by EmployeeCode + DateTime
    const seenPunches = new Map<string, any>();
    for (const log of allRawLogs) {
      if (!log) continue;
      const code = log.EmployeeCode || log.employeeCode;
      const time = log.DateTime || log.punchTime || log.dateTime;
      if (!code || !time) continue;

      const dedupeKey = `${time}_${code}`.replace(/[^a-z0-9]/gi, '_');
      if (!seenPunches.has(dedupeKey)) {
        seenPunches.set(dedupeKey, log);
      }
    }

    const uniqueLogs = Array.from(seenPunches.values());

    // Default to today's date if no date is provided in query
    const now = new Date();
    const defaultDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const targetDate = searchParams.get("date") || defaultDateStr;

    const filteredLogs = uniqueLogs.filter((log: any) => {
      const time = log.DateTime || log.punchTime || log.dateTime || "";
      return time.startsWith(targetDate) || time.includes(targetDate);
    });

    const mappedLogs = filteredLogs.map((log: any) => {
      const code = log.EmployeeCode || log.employeeCode;
      
      // Resolve Employee Name
      let employeeName = code || "Unknown";
      
      const student: any = students.find((s: any) => {
        if (!s.rollNo || !code) return false;
        const dbRoll = s.rollNo.toString().toLowerCase().trim();
        const machineCode = code.toString().toLowerCase().trim();
        return dbRoll === machineCode || dbRoll === `stu_${machineCode}` || machineCode === `stu_${dbRoll}`;
      });

      if (student) {
        employeeName = student.studentName || student.name || employeeName;
      } else {
        const employee: any = staff.find((e: any) => 
          e.employeeId?.toString() === code?.toString() || 
          e.id?.toString() === code?.toString()
        );
        if (employee) {
          employeeName = employee.name || employee.employeeName || employeeName;
        }
      }

      return {
        employeeCode: code,
        employeeName,
        punchTime: log.DateTime || log.punchTime || log.dateTime,
        deviceId: log.SerialNumber || log.deviceId || "Unknown",
        verifyMode: log.verifyMode || "-",
        ioMode: log.Status || log.ioMode || "UNKNOWN",
        workCode: log.workCode || "-",
        serialNumber: log.SerialNumber || log.serialNumber || "Unknown",
        createdAt: log.processedAt || log.createdAt || new Date().toISOString()
      };
    });

    // Sort logs descending by punchTime
    mappedLogs.sort((a: any, b: any) => {
      const timeA = a.punchTime || "";
      const timeB = b.punchTime || "";
      return timeB.localeCompare(timeA);
    });

    // Limit output to the latest 500 records
    const finalLogs = mappedLogs.slice(0, 500);

    return NextResponse.json({
      success: true,
      syncHistory,
      totalRecords: finalLogs.length,
      data: finalLogs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function saveSyncSuccess(instituteId: string, inserted: number, skipped: number) {
  await db.ref(`Institutes/${instituteId}/essl_sync_history`).set({
    status: "Success",
    lastSync: new Date().toISOString(),
    lastInserted: inserted,
    lastSkipped: skipped,
    errorMessage: ""
  });
}

async function saveSyncError(instituteId: string, errorMessage: string) {
  await db.ref(`Institutes/${instituteId}/essl_sync_history`).update({
    status: "Failed",
    lastSyncAttempt: new Date().toISOString(),
    errorMessage: errorMessage
  });
}

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

      // Find matching student
      const student: any = students.find((s: any) => {
        if (!s.rollNo) return false;
        const dbRoll = s.rollNo.toString().toLowerCase().trim();
        const machineCode = code.toString().toLowerCase().trim();
        return dbRoll === machineCode ||
          dbRoll === `stu_${machineCode}` ||
          machineCode === `stu_${dbRoll}` ||
          dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
      });

      // Find matching employee
      const employee: any = staff.find((e: any) =>
        e.employeeId?.toString() === code.toString() ||
        e.id?.toString() === code.toString()
      );

      if (student) {
        const studentId = student.id;
        const batchId = student.batchId || "all";
        const path = `Institutes/${instituteId}/attendance/Student/${date}/${batchId}/${studentId}`;

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
    console.error("[syncToAttendance] Error in sync/route:", err);
  }
}
