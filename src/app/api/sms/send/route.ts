import "dotenv/config";
import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: /api/sms/send
 * Securely sends SMS via MSG91 using server-side environment variables.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobile, studentName, dateTime, type, var1, var2, var3, templateId: customTemplateId } = body;

    const authKey = process.env.MSG91_AUTH_KEY || process.env.NEXT_PUBLIC_MSG91_AUTH_KEY;
    const senderId = process.env.MSG91_SENDER_ID || process.env.NEXT_PUBLIC_MSG91_SENDER_ID || "MYCLED";
    const templateIn = process.env.MSG91_TEMPLATE_IN || process.env.NEXT_PUBLIC_MSG91_TEMPLATE_IN;
    const templateOut = process.env.MSG91_TEMPLATE_OUT || process.env.NEXT_PUBLIC_MSG91_TEMPLATE_OUT;

    console.log("[SMS API] Processing request:", { mobile, type, studentName });

    if (!authKey) {
      console.error("[SMS API] Error: MSG91 Auth Key is missing.");
      return NextResponse.json({ 
        success: false, 
        error: "SMS Gateway not configured." 
      }, { status: 500 });
    }

    let finalTemplateId = customTemplateId;
    if (!finalTemplateId) {
      if (type === "IN") finalTemplateId = templateIn;
      else if (type === "OUT") finalTemplateId = templateOut;
      else if (type === "MARKS") finalTemplateId = "6a01d4f2ffca989ac6090163";
    }

    if (!finalTemplateId) {
      console.error(`[SMS API] Error: No Template ID found for type ${type}`);
      return NextResponse.json({ success: false, error: `SMS Template for ${type} not configured` }, { status: 500 });
    }

    // Format mobile (ensure 91 prefix)
    let formattedMobile = mobile.toString().trim().replace(/[^0-9]/g, '');
    if (formattedMobile.length === 11 && formattedMobile.startsWith('0')) {
      formattedMobile = formattedMobile.substring(1);
    }
    if (formattedMobile.length === 10) {
      formattedMobile = "91" + formattedMobile;
    }

    const payload: any = {
      template_id: finalTemplateId,
      sender: senderId,
      short_url: "0",
      mobiles: formattedMobile,
    };

    // Mapping variables based on type
    if (type === "MARKS") {
      payload.var1 = var1; // Marks
      payload.var2 = var2; // Subject
      payload.var3 = var3; // Exam Date
    } else {
      payload.var1 = studentName;
      payload.var2 = dateTime ? (dateTime.split(' ')[1] || dateTime) : "";
    }

    console.log(`[SMS API] Sending ${type} SMS to ${formattedMobile}...`, payload);
    
    const response = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "authkey": authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("[SMS API] MSG91 Response:", result);

    if (!response.ok || result.type === "error") {
      return NextResponse.json({ success: false, error: result.message || "MSG91 rejected the request" }, { status: response.status });
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
      console.error("[SMS API] Failed to update SMS count", dbErr);
    }

    return NextResponse.json({ success: true, data  : result });

  } catch (error: any) {
    console.error("[SMS API] Critical Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

