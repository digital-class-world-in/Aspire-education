
/**
 * Frontend Service for eSSL Biometric Integration
 */
export interface EsslLogParams {
  FromDateTime: string; // "YYYY-MM-DD HH:mm:ss"
  ToDateTime: string;   // "YYYY-MM-DD HH:mm:ss"
  SerialNumber: string;
  UserName?: string;
  UserPassword?: string;
  instituteId?: string; // Optional for backward compatibility, required for DB sync
}

export const esslLogsService = {
  /**
   * Fetches transaction logs from the biometric device via our secure proxy.
   */
  async getLogs(params: EsslLogParams) {
    try {
      const response = await fetch("/api/essl/logs?op=GetTransactionsLog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params,
          UserName: params.UserName || "essl",
          UserPassword: params.UserPassword || "essl"
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || "Failed to fetch logs");
      }

      return result.data;
    } catch (error: any) {
      console.error("Service Error:", error);
      throw error;
    }
  }
};
