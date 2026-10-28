
import { NextRequest, NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";
import { db } from "@/lib/firebase-admin";
import { sendAttendanceSmsServer } from "@/lib/sms-server";

export const dynamic = 'force-dynamic';

/**
 * Next.js API Proxy Route for eSSL SOAP API
 * Location: /api/essl/logs
 */
export async function POST(req: NextRequest) {
  // 1. Setup machine details
  // Note: Using the IP provided by the user. 
  // "?op=" URLs are documentation pages and don't work for direct API calls.
  const BASE_URL = "http://27.116.54.3:83/iclock/webapiservice.asmx";

  const { searchParams } = new URL(req.url);
  const op = searchParams.get("op");

  if (!op) {
    return NextResponse.json({ error: "Missing 'op' parameter" }, { status: 400 });
  }

  try {
    // Get parameters from request body
    const body = await req.json();
    const { SerialNumber, UserName, UserPassword, instituteId } = body;
    let soapEnvelope = "";

    if (op === "GetTransactionsLog") {
      const { FromDateTime, ToDateTime } = body;
      soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetTransactionsLog xmlns="http://tempuri.org/">
      <FromDateTime>${FromDateTime}</FromDateTime>
      <ToDateTime>${ToDateTime}</ToDateTime>
      <SerialNumber>${SerialNumber}</SerialNumber>
      <UserName>${UserName}</UserName>
      <UserPassword>${UserPassword}</UserPassword>
      <strDataList></strDataList>
    </GetTransactionsLog>
  </soap:Body>
</soap:Envelope>`;
    } else if (op === "AddEmployee") {
      const { EmployeeCode, EmployeeName, CardNumber, CommandId } = body;
      soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <AddEmployee xmlns="http://tempuri.org/">
      <APIKey></APIKey>
      <EmployeeCode>${EmployeeCode}</EmployeeCode>
      <EmployeeName>${EmployeeName}</EmployeeName>
      <CardNumber>${CardNumber || ""}</CardNumber>
      <SerialNumber>${SerialNumber}</SerialNumber>
      <UserName>${UserName}</UserName>
      <UserPassword>${UserPassword || ""}</UserPassword>
      <CommandId>${CommandId || "1"}</CommandId>
    </AddEmployee>
  </soap:Body>
</soap:Envelope>`;
    } else if (op === "DeleteUser") {
      const { EmployeeCode, CommandId } = body;
      soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <DeleteUser xmlns="http://tempuri.org/">
      <APIKey></APIKey>
      <EmployeeCode>${EmployeeCode}</EmployeeCode>
      <SerialNumber>${SerialNumber}</SerialNumber>
      <UserName>${UserName}</UserName>
      <UserPassword>${UserPassword || ""}</UserPassword>
      <CommandId>${CommandId || "2"}</CommandId>
    </DeleteUser>
  </soap:Body>
</soap:Envelope>`;
    } else {
      return NextResponse.json({ error: "Unsupported operation" }, { status: 400 });
    }

    // 3. Setup Fetch with Retries
    console.log(`[eSSL Proxy] Preparing ${op} request...`);
    console.log(`[eSSL Proxy] Body:`, soapEnvelope);

    let response: Response | null = null;
    let lastError: any = null;
    const maxRetries = 2;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout per attempt

        const TARGET_URL = `${BASE_URL}?op=${op}`;
        console.log(`[eSSL Proxy] Attempt ${i + 1} to ${TARGET_URL} (SOAP 1.1)...`);

        response = await fetch(TARGET_URL, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": `http://tempuri.org/${op}`
          },
          body: soapEnvelope,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) break;

        const errorText = await response.text();
        console.warn(`[eSSL Proxy] Attempt ${i + 1} failed (${response.status}):`, errorText.substring(0, 200));

      } catch (error: any) {
        lastError = error;
        console.error(`[eSSL Proxy] Attempt ${i + 1} Error:`, error.message);

        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json({
        error: "Machine Connection Failed",
        status: response?.status || 500,
        details: lastError?.message || "Check machine connectivity."
      }, { status: 500 });
    }

    const xmlData = await response.text();
    console.log(`[eSSL Proxy] Received Response:`, xmlData);

    let safeXmlData = xmlData;
    // Fix truncated XML to prevent xml2js from crashing
    if (op === "GetTransactionsLog") {
      if (safeXmlData.includes("<strDataList>") && !safeXmlData.includes("</strDataList>")) safeXmlData += "</strDataList>";
      if (safeXmlData.includes("<GetTransactionsLogResponse") && !safeXmlData.includes("</GetTransactionsLogResponse>")) safeXmlData += "</GetTransactionsLogResponse>";
      if (safeXmlData.includes("<soap:Body>") && !safeXmlData.includes("</soap:Body>")) safeXmlData += "</soap:Body>";
      if (safeXmlData.includes("<soap:Envelope") && !safeXmlData.includes("</soap:Envelope>")) safeXmlData += "</soap:Envelope>";
      if (safeXmlData.includes("<soap12:Body>") && !safeXmlData.includes("</soap12:Body>")) safeXmlData += "</soap12:Body>";
      if (safeXmlData.includes("<soap12:Envelope") && !safeXmlData.includes("</soap12:Envelope>")) safeXmlData += "</soap12:Envelope>";
    }

    // 5. Parse XML to JSON using xml2js
    const parsedResult = await parseStringPromise(safeXmlData, {
      explicitArray: false,
      ignoreNamespaces: true
    });

    // Navigate to the actual result data in the SOAP response
    const responseBody = parsedResult?.Envelope?.Body;
    const resultKey = op === "GetTransactionsLog" ? "GetTransactionsLogResponse" : op === "DeleteUser" ? "DeleteUserResponse" : "AddEmployeeResponse";
    const resultSubKey = op === "GetTransactionsLog" ? "GetTransactionsLogResult" : op === "DeleteUser" ? "DeleteUserResult" : "AddEmployeeResult";

    const resultData = responseBody?.[resultKey];
    const statusResult = resultData?.[resultSubKey];

    // Check for application level errors in the XML result
    if (statusResult === "Unathorised User") {
      return NextResponse.json({
        success: false,
        error: "Authentication Failed",
        details: "The machine rejected the credentials or serial number.",
        tip: "Check if the Serial Number and Machine User/Password are correct in the configuration."
      }, { status: 401 });
    }

    let finalData = statusResult;

    // Special handling for GetTransactionsLog to parse the raw text in strDataList
    if (op === "GetTransactionsLog" && resultData?.strDataList) {
      const rawLogs = resultData.strDataList;
      if (typeof rawLogs === 'string' && rawLogs.trim()) {
        // Parse the tab-separated and newline-separated string
        // Format typically: EmployeeCode \t DateTime \t Status/Mode
        const lines = rawLogs.trim().split(/\r?\n/);
        finalData = lines.map(line => {
          // Split by tabs first, as they are the primary delimiters
          let parts = line.split(/\t/);

          // If only one part, it might be space separated
          if (parts.length < 2) {
            parts = line.split(/\s+/);
          }

          let employeeCode = parts[0]?.trim();
          let dateTime = "";
          let status = "";

          // If we have 3 or more parts (Code, Date, Time, Status)
          if (parts.length >= 4) {
            dateTime = `${parts[1]} ${parts[2]}`;
            status = parts[3];
          } else if (parts.length === 3) {
            // Could be Code, DateTime (one string), Status
            dateTime = parts[1];
            status = parts[2];
          } else if (parts.length === 2) {
            // Code, DateTime only
            dateTime = parts[1];
          }

          return {
            userId: employeeCode,
            EmployeeCode: employeeCode,
            dateTime: dateTime?.trim(),
            DateTime: dateTime?.trim(),
            status: status?.trim()?.toLowerCase() || "unknown",
            Status: status?.trim()?.toUpperCase() || "UNKNOWN",
            SerialNumber: SerialNumber
          };
        }).filter(log => log.EmployeeCode && log.DateTime);
      } else {
        finalData = [];
      }
    }

    let smsSentCount = 0;

    // 6. DB Saving and SMS Sending Logic
    if (op === "GetTransactionsLog" && instituteId && finalData.length > 0) {
      try {
        console.log(`[eSSL Proxy] Processing ${finalData.length} logs for DB storage and SMS...`);
        
        const earliestDate = finalData.reduce((min: string, log: any) => {
          const d = log.DateTime?.split(" ")[0];
          return (d && (!min || d < min)) ? d : min;
        }, "2050-01-01");
        const fetchStartDate = earliestDate !== "2050-01-01" ? earliestDate : "2020-01-01";

        const [studentsSnap, staffSnap, existingLogsSnap] = await Promise.all([
          db.ref(`Institutes/${instituteId}/admissions`).get(),
          db.ref(`Institutes/${instituteId}/employees`).get(),
          db.ref(`Institutes/${instituteId}/essl_logs`)
            .orderByChild("DateTime")
            .startAt(fetchStartDate)
            .get()
        ]);

        const students = studentsSnap.exists() ? Object.values(studentsSnap.val() as any) : [];
        const staff = staffSnap.exists() ? Object.values(staffSnap.val() as any) : [];
        const existingLogs = existingLogsSnap.val() || {};

        const updates: any = {};
        const attendanceUpdates: any = {};
        const smsPromises: Promise<any>[] = [];
        const dailyPunches = new Map<string, any>();
        
        // Sort chronologically
        const sortedLogs = [...finalData].sort((a: any, b: any) => a.DateTime.localeCompare(b.DateTime));
        const inPunchesThisRun = new Set<string>();

        sortedLogs.forEach(log => {
          const date = log.DateTime?.split(" ")[0];
          const time = log.DateTime?.split(" ")[1];
          const studentRoll = log.EmployeeCode?.toString().toLowerCase().trim();
          const runKey = `${studentRoll}_${date}`;
          
          let hasInPunchToday = inPunchesThisRun.has(runKey);
          if (!hasInPunchToday) {
            for (const key in existingLogs) {
              const exLog = existingLogs[key];
              const exCode = exLog.EmployeeCode?.toString().toLowerCase().trim();
              if ((exCode === studentRoll || exCode === `stu_${studentRoll}` || studentRoll === `stu_${exCode}`) &&
                  exLog.DateTime?.startsWith(date)) {
                const exStatus = (exLog.Status || "").toString().trim().toUpperCase();
                if (exStatus === "IN") {
                  hasInPunchToday = true;
                  break;
                }
              }
            }
          }

          const rawStatus = (log.Status || "").toString().trim().toUpperCase();
          let punchType: "IN" | "OUT";
          if (rawStatus === "IN" || rawStatus === "CHECKIN" || rawStatus === "0" || rawStatus === "P") {
            punchType = "IN";
          } else if (rawStatus === "OUT" || rawStatus === "CHECKOUT" || rawStatus === "1") {
            punchType = "OUT";
          } else {
            punchType = hasInPunchToday ? "OUT" : "IN";
          }

          if (punchType === "IN") inPunchesThisRun.add(runKey);

          const dedupeKey = `${log.EmployeeCode}_${date}_${punchType}`;
          if (dailyPunches.has(dedupeKey)) {
            const existing = dailyPunches.get(dedupeKey);
            if (punchType === "IN") {
              if (log.DateTime < existing.DateTime) dailyPunches.set(dedupeKey, { ...log, smartStatus: punchType, _time: time, _date: date });
            } else {
              if (log.DateTime > existing.DateTime) dailyPunches.set(dedupeKey, { ...log, smartStatus: punchType, _time: time, _date: date });
            }
          } else {
            dailyPunches.set(dedupeKey, { ...log, smartStatus: punchType, _time: time, _date: date });
          }
        });

        const filteredLogs = Array.from(dailyPunches.values());

        filteredLogs.forEach(log => {
          const uniqueKey = `${log.DateTime}_${log.EmployeeCode}`.replace(/[^a-z0-9]/gi, '_');
          const logPath = `Institutes/${instituteId}/essl_logs/${uniqueKey}`;
          const existingLog = existingLogs[uniqueKey];
          
          const isNew = !existingLog;
          const needsSms = isNew || (existingLog && !existingLog.smsSent && !existingLog.isSMSSent);

          if (isNew || needsSms) {
            const student = students.find((s: any) => {
              if (!s.rollNo || !log.EmployeeCode) return false;
              const dbRoll = s.rollNo.toString().toLowerCase().trim();
              const machineCode = log.EmployeeCode.toString().toLowerCase().trim();
              return dbRoll === machineCode || 
                     dbRoll === `stu_${machineCode}` || 
                     machineCode === `stu_${dbRoll}` ||
                     dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
            });

            const employee = staff.find((e: any) => e.employeeId === log.EmployeeCode);
            const punchType = log.smartStatus;

            const logEntry = {
              ...log,
              Status: punchType,
              source: "API_SYNC",
              smsSent: existingLog?.smsSent || false,
              isSMSSent: existingLog?.isSMSSent || false
            };
            delete logEntry.smartStatus;
            delete logEntry._time;
            delete logEntry._date;

            if (student && student.fatherMobile && needsSms) {
              const smsPromise = sendAttendanceSmsServer({
                mobile: student.fatherMobile,
                studentName: student.studentName,
                dateTime: log.DateTime,
                type: punchType
              }).then(async (res) => {
                if (res.success) {
                  await db.ref().update({ [`${logPath}/isSMSSent`]: true, [`${logPath}/smsSent`]: true });
                }
                return res;
              });

              smsPromises.push(smsPromise);
              logEntry.smsSent = true;
              logEntry.isSMSSent = true;
              smsSentCount++;
            }

            if (isNew) updates[logPath] = logEntry;

            if (student || employee) {
              const entityId = student ? (student as any).id : (employee as any).id;
              const type = student ? "Student" : "Staff";
              const batchId = student ? ((student as any).batchId || "all") : null;
              const path = student 
                ? `Institutes/${instituteId}/attendance/${type}/${log._date}/${batchId}/${entityId}`
                : `Institutes/${instituteId}/attendance/${type}/${log._date}/${entityId}`;

              const existingData = attendanceUpdates[path] || { status: "Present", remarks: "Synced from eSSL API", updatedAt: Date.now() };

              if (!existingData.checkIn || log._time < existingData.checkIn) {
                existingData.checkIn = log._time;
              }
              if (!existingData.checkOut || log._time > existingData.checkOut) {
                existingData.checkOut = log._time;
              }
              attendanceUpdates[path] = existingData;
            }
          }
        });

        if (Object.keys(updates).length > 0) {
          await db.ref().update(updates);
        }

        if (Object.keys(attendanceUpdates).length > 0) {
          const currentUpdates: any = {};
          for(const [path, data] of Object.entries(attendanceUpdates)) {
              const currentSnap = await db.ref(path).get();
              const currentVal = currentSnap.val() || data;
              if (currentSnap.exists()) {
                  if ((data as any).checkIn && (!currentVal.checkIn || (data as any).checkIn < currentVal.checkIn)) currentVal.checkIn = (data as any).checkIn;
                  if ((data as any).checkOut && (!currentVal.checkOut || (data as any).checkOut > currentVal.checkOut)) currentVal.checkOut = (data as any).checkOut;
              }
              currentUpdates[path] = currentVal;
          }
          await db.ref().update(currentUpdates);
        }

        if (smsPromises.length > 0) {
          await Promise.allSettled(smsPromises);
        }

      } catch (err: any) {
        console.error("[eSSL Proxy] DB/SMS Sync Error:", err);
      }
    }

    // Detect if this is a cron job to prevent "output too large" errors
    const userAgent = req.headers.get("user-agent") || "";
    const isCron = userAgent.toLowerCase().includes("cron");

    if (isCron) {
      return NextResponse.json({
        success: true,
        data: finalData.slice(0, 10), // Limit array
        rawLogs: "Omitted for cron",
        status: statusResult,
        rawXml: "Omitted for cron",
        count: finalData.length,
        smsSentCount
      });
    }

    return NextResponse.json({
      success: true,
      data: finalData,
      rawLogs: resultData?.strDataList || "", // Include the raw text as requested
      status: statusResult,
      rawXml: xmlData,
      count: finalData.length,
      smsSentCount
    });

  } catch (error: any) {
    console.error("eSSL Proxy Critical Error:", error);

    return NextResponse.json({
      error: "Proxy Internal Error",
      details: error.message
    }, { status: 500 });
  }
}
