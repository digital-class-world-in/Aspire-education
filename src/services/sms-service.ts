
export const smsService = {
  /**
   * Calls the internal API route to send an SMS securely.
   */
  async sendAttendanceSms(params: {
    mobile: string,
    studentName: string,
    dateTime: string,
    type: 'IN' | 'OUT'
  }) {
    try {
      console.log(`[SMS Service] Requesting ${params.type} SMS for ${params.studentName}...`);
      
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("[SMS Service] API Error:", result.error);
        return { success: false, error: result.error };
      }

      console.log("[SMS Service] API Success:", result);
      return { success: true, data: result };
    } catch (error: any) {
      console.error("[SMS Service] Critical error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Legacy/Direct helper if ever needed on server side
  async sendSmsDirect(apiKey: string, payload: any) {
    try {
      const response = await fetch("https://api.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "authkey": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (error: any) {
      console.error("Direct SMS error:", error);
      return { success: false, error: error.message };
    }
  }
};
