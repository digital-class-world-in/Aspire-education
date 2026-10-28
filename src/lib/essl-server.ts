/**
 * Server-side eSSL Utility
 * Fetches raw logs from the machine
 */

/**
 * Normalizes any raw eSSL status value to a clean "IN" or "OUT" string.
 * ESSL machines can return: Check-In, Check-Out, 0, 1, 4 (OT-In), 5 (OT-Out), P, IN, OUT
 */
function normalizeEsslStatus(raw: string | number | null | undefined): "IN" | "OUT" | "UNKNOWN" {
  const s = (raw ?? "").toString().trim().toUpperCase().replace(/[\s-]/g, "");
  if (s === "CHECKIN" || s === "0" || s === "4" || s === "P" || s === "IN" || s === "OTIN") return "IN";
  if (s === "CHECKOUT" || s === "1" || s === "5" || s === "OUT" || s === "OTOUT") return "OUT";
  return "UNKNOWN";
}

export async function fetchEsslLogsServer(params: {
  FromDateTime: string;
  ToDateTime: string;
  SerialNumber: string;
  UserName: string;
  UserPassword?: string;
}) {
  const BASE_URL = "http://27.116.54.3:83/iclock/webapiservice.asmx";
  const { SerialNumber, UserName, UserPassword, FromDateTime, ToDateTime } = params;

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
      <UserPassword>${UserPassword || ""}</UserPassword>
      <strDataList></strDataList>
    </GetTransactionsLog>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const TARGET_URL = `${BASE_URL}?op=GetTransactionsLog`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8"
      },
      body: soapEnvelope,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Machine returned status ${response.status}`);
    }

    const xmlData = await response.text();

    // Extract <strDataList> content
    let rawLogs = "";
    const startTag = "<strDataList>";
    const endTag = "</strDataList>";

    const startIndex = xmlData.indexOf(startTag);
    const endIndex = xmlData.indexOf(endTag);

    if (startIndex !== -1) {
      if (endIndex !== -1) {
        rawLogs = xmlData.substring(startIndex + startTag.length, endIndex);
      } else {
        // Handle truncated XML (missing closing tag)
        let extracted = xmlData.substring(startIndex + startTag.length);
        // Remove any other ending XML tags if they somehow appear
        extracted = extracted.replace(/<\/[a-zA-Z0-9:]+>/g, "");
        rawLogs = extracted;
      }
    } else {
      const altMatch = xmlData.match(/<strDataList[^>]*>([\s\S]*?)(?:<\/strDataList>|$)/);
      if (altMatch) {
        rawLogs = altMatch[1];
      }
    }

    if (rawLogs && rawLogs.trim()) {
      const trimmedLogs = rawLogs.trim();
      const lines = trimmedLogs.split(/\r?\n/);

      const processedLogs = lines.map((line) => {
        let parts = line.split(/\t/);
        if (parts.length < 2) parts = line.split(/\s{2,}/);
        if (parts.length < 2) parts = line.split(/\s+/);

        let employeeCode = parts[0]?.trim();
        let dateTime = "";
        let status = "";

        if (parts.length >= 4) {
          dateTime = `${parts[1]} ${parts[2]}`;
          status = parts[3];
        } else if (parts.length === 3) {
          dateTime = parts[1];
          status = parts[2];
        } else if (parts.length === 2) {
          dateTime = parts[1];
        }

        return {
          EmployeeCode: employeeCode,
          DateTime: dateTime?.trim(),
          Status: normalizeEsslStatus(status),
          SerialNumber: SerialNumber,
          RawLine: line
        };
      }).filter(log => log.EmployeeCode && log.DateTime);

      return processedLogs;
    }

    return [];

  } catch (error: any) {
    console.error("[eSSL Server] Error:", error.message);
    throw error;
  }
}

/**
 * Pushes a new/edited user to the biometric machine using the AddEmployee SOAP method.
 */
export async function pushUserToMachine(params: {
  EmployeeCode: string;
  EmployeeName: string;
  SerialNumber?: string;
  UserName?: string;
  UserPassword?: string;
}) {
  const BASE_URL = "http://27.116.54.3:83/iclock/webapiservice.asmx";
  
  const { 
    EmployeeCode, 
    EmployeeName, 
    SerialNumber = "NFZ8245102868", 
    UserName = "aspireedu", 
    UserPassword = "Aspire@123" 
  } = params;

  // The SOAP payload for AddEmployee
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <AddEmployee xmlns="http://tempuri.org/">
      <EmployeeCode>${EmployeeCode}</EmployeeCode>
      <EmployeeName>${EmployeeName}</EmployeeName>
      <CardNumber></CardNumber>
      <SerialNumber>${SerialNumber}</SerialNumber>
      <UserName>${UserName}</UserName>
      <UserPassword>${UserPassword}</UserPassword>
      <CommandId></CommandId>
    </AddEmployee>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const TARGET_URL = `${BASE_URL}?op=AddEmployee`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8"
      },
      body: soapEnvelope,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Machine returned status ${response.status}`);
    }

    const xmlData = await response.text();
    console.log(`[eSSL pushUserToMachine] Success for ${EmployeeCode}: ${EmployeeName}`);
    
    return { success: true, raw: xmlData };
  } catch (error: any) {
    console.error(`[eSSL pushUserToMachine] Error for ${EmployeeCode}:`, error.message);
    throw error;
  }
}