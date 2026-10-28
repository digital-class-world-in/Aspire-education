/**
 * Server-side SMS Utility
 * Sends SMS via MSG91 using process.env
 */
export async function sendAttendanceSmsServer(params: {
  mobile: string,
  studentName: string,
  dateTime: string,
  type: 'IN' | 'OUT'
}) {
  try {
    const authKey = process.env.MSG91_AUTH_KEY || process.env.NEXT_PUBLIC_MSG91_AUTH_KEY;
    const senderId = process.env.MSG91_SENDER_ID || process.env.NEXT_PUBLIC_MSG91_SENDER_ID || "MYCLED";
    const templateIn = process.env.MSG91_TEMPLATE_IN || process.env.NEXT_PUBLIC_MSG91_TEMPLATE_IN;
    const templateOut = process.env.MSG91_TEMPLATE_OUT || process.env.NEXT_PUBLIC_MSG91_TEMPLATE_OUT;

    if (!authKey) {
      console.error("[SMS Server] Error: MSG91_AUTH_KEY is missing");
      return { success: false, error: "Missing API Key" };
    }

    const templateId = params.type === "IN" ? templateIn : templateOut;
    if (!templateId) {
      console.error(`[SMS Server] Error: Template ID for ${params.type} is missing`);
      return { success: false, error: `Template for ${params.type} not configured` };
    }

    // Format mobile (ensure 91 prefix)
    let formattedMobile = params.mobile.toString().trim().replace(/[^0-9]/g, '');
    if (formattedMobile.length === 11 && formattedMobile.startsWith('0')) {
      formattedMobile = formattedMobile.substring(1);
    }
    if (formattedMobile.length === 10) {
      formattedMobile = "91" + formattedMobile;
    }

    const payload = {
      template_id: templateId,
      sender: senderId,
      short_url: "0",
      mobiles: formattedMobile,
      var1: params.studentName,
      var2: params.dateTime.split(' ')[1] || params.dateTime // Extract time
    };

    const response = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "authkey": authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || result.type === "error") {
      return { success: false, error: result.message || "MSG91 error" };
    }

    try {
      const { db } = await import("@/lib/firebase-admin");
      const countRef = db.ref("SystemSettings/SmsCount");
      await countRef.transaction((current_value) => {
        return (current_value || 0) + 1;
      }, (error, committed, snapshot) => {
        if (committed && snapshot) {
          const newCount = snapshot.val();
          if (newCount >= 10000) {
            console.log("WARNING: 10,000 SMS messages limit has been reached!");
          }
        }
      });
    } catch (dbErr) {
      console.error("[SMS Server] Failed to update SMS count", dbErr);
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("[SMS Server] Critical Error:", error.message);
    return { success: false, error: error.message };
  }
}
