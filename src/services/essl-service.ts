


const ESSL_API_URL = "/api/essl/logs";
import { smsService } from "./sms-service";
import { ref, get, update } from "firebase/database";
import { EsslLogParams } from "./essl-logs-service";


export interface EsslEmployee {
  EmployeeCode: string;
  EmployeeName: string;
  CardNumber?: string;
  SerialNumber: string;
  UserName: string;
  UserPassword?: string;
  CommandId?: string;
  Department?: string;
  Designation?: string;
  Category?: string;
}

export interface TransactionLogParams {
  FromDateTime: string;
  ToDateTime: string;
  SerialNumber: string;
  UserName: string;
  UserPassword?: string;
  instituteId?: string;
}

export const esslService = {
  async addEmployee(employee: EsslEmployee) {
    try {
      const response = await fetch(`${ESSL_API_URL}?op=AddEmployee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employee),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`eSSL Proxy Error (${response.status}):`, errText.substring(0, 200));
        throw new Error(`Proxy returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error adding employee to eSSL:", error);
      throw error;
    }
  },

  async deleteEmployee(employee: { EmployeeCode: string; SerialNumber: string; UserName: string; UserPassword?: string; CommandId?: string }) {
    try {
      const response = await fetch(`${ESSL_API_URL}?op=DeleteUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employee),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`eSSL Proxy Error (${response.status}):`, errText.substring(0, 200));
        throw new Error(`Proxy returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error deleting employee from eSSL:", error);
      throw error;
    }
  },

  async getTransactionLogs(params: TransactionLogParams) {
    console.log("Service: getTransactionLogs started with params ->", params);
    try {
      const response = await fetch(`${ESSL_API_URL}?op=GetTransactionsLog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`eSSL Proxy Error (${response.status}):`, errText.substring(0, 200));
        throw new Error(`Proxy returned ${response.status}`);
      }

      const result = await response.json();

      if (result.rawXml) {
        console.log("eSSL Raw XML Response:", result.rawXml);
      }

      return result;
    } catch (error) {
      console.error("Error fetching transaction logs from eSSL:", error);
      throw error;
    }
  },

  async fetchAndSaveLogs(params: EsslLogParams, database: any, resolvedId: string, cachedStudents?: any[]) {
    console.log("%c[SYSTEM] 🔍 Checking biometric machine for new punches...", "color: #6366f1; font-weight: bold; font-size: 12px;");
    const result = await this.getTransactionLogs({
      ...params,
      UserName: params.UserName || "essl",
      instituteId: resolvedId
    });

    let logData: any[] = [];
    if (Array.isArray(result)) {
      logData = result;
    } else if (result && result.data && Array.isArray(result.data)) {
      logData = result.data;
    } else if (result && result.Logs) {
      logData = Array.isArray(result.Logs) ? result.Logs : [result.Logs];
    } else if (result && typeof result === 'object') {
      const firstArray = Object.values(result).find(val => Array.isArray(val));
      if (firstArray) logData = firstArray as any[];
    }

    const finalResult = {
      count: result.count || logData.length,
      status: result.status || "Success",
      data: logData,
      rawLogs: result.rawLogs || "",
      rawXml: result.rawXml || "",
      smsSentCount: result.smsSentCount || 0
    };
    
    console.log("Service: fetchAndSaveLogs API processed records ->", { count: finalResult.count, smsSent: finalResult.smsSentCount });
    return finalResult;
  },
  async manualPunch(data: { EmployeeCode: string; Status: string; DateTime?: string; instituteId: string }) {
    try {
      const response = await fetch(`/api/CheckEsslAttendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `API error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error in manual punch:", error);
      throw error;
    }
  },
  async syncToFirebase(logs: any[], database: any, resolvedId: string) {
    if (!logs || logs.length === 0) return;

    // 1. Fetch all students and staff to match EmployeeCode
    const [studentsSnap, staffSnap] = await Promise.all([
      get(ref(database, `Institutes/${resolvedId}/admissions`)),
      get(ref(database, `Institutes/${resolvedId}/employees`))
    ]);

    const students = studentsSnap.exists() ? Object.values(studentsSnap.val()) : [];
    const staff = staffSnap.exists() ? Object.values(staffSnap.val()) : [];

    const updates: any = {};

    for (const log of logs) {
      const code = log.EmployeeCode;
      const dateTime = log.DateTime; // Expected format: "2026-04-28 09:15:00"
      if (!code || !dateTime) continue;

      const [date, time] = dateTime.split(' ');

      // Find matching entity
      const student = students.find((s: any) => {
        if (!s.rollNo || !code) return false;
        const dbRoll = s.rollNo.toString().toLowerCase().trim();
        const machineCode = code.toString().toLowerCase().trim();
        return dbRoll === machineCode ||
          dbRoll === `stu_${machineCode}` ||
          machineCode === `stu_${dbRoll}` ||
          dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
      });
      const employee = staff.find((e: any) => e.employeeId === code);

      const uniqueKey = `${dateTime}_${code}`.replace(/[^a-z0-9]/gi, '_');
      const esslLogPath = `Institutes/${resolvedId}/essl_logs/${uniqueKey}`;
      
      updates[esslLogPath] = {
        EmployeeCode: code,
        DateTime: dateTime,
        Status: log.Status || "IN",
        source: "API_SYNC",
        SerialNumber: log.SerialNumber || "NFZ8245102868",
        smsSent: log.smsSent || false,
        isSMSSent: log.isSMSSent || false
      };

      if (student) {
        const studentId = (student as any).id;
        const batchId = (student as any).batchId || "all"; // Handle batch-specific path if needed
        const path = `Institutes/${resolvedId}/attendance/Student/${date}/${batchId}/${studentId}`;

        // Get existing record to not overwrite status if already marked
        const existingRef = ref(database, path);
        const snapshot = await get(existingRef);
        const existingData = snapshot.val() || { status: "Present", remarks: "Synced from eSSL", updatedAt: Date.now() };

        if (!existingData.checkIn || time < existingData.checkIn) {
          existingData.checkIn = time;
        }
        if (!existingData.checkOut || time > existingData.checkOut) {
          existingData.checkOut = time;
        }

        updates[path] = existingData;
      } else if (employee) {
        const empId = (employee as any).id;
        const path = `Institutes/${resolvedId}/attendance/Staff/${date}/${empId}`;

        const existingRef = ref(database, path);
        const snapshot = await get(existingRef);
        const existingData = snapshot.val() || { status: "Present", remarks: "Synced from eSSL", updatedAt: Date.now() };

        if (!existingData.checkIn || time < existingData.checkIn) {
          existingData.checkIn = time;
        }
        if (!existingData.checkOut || time > existingData.checkOut) {
          existingData.checkOut = time;
        }

        updates[path] = existingData;
      }
    }

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  }
};


