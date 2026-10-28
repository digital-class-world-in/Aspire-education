import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { sendAttendanceSmsServer } from "@/lib/sms-server";
import { format, subDays } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const instituteId = searchParams.get("instituteId");
  const key = searchParams.get("key");

  // Security Check (same as sync-attendance)
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!instituteId) {
    return NextResponse.json({ error: "Missing instituteId" }, { status: 400 });
  }

  try {
    console.log(`[Cron: Send Pending SMS] Starting for institute: ${instituteId}`);

    // Get logs from the last 3 days to avoid sending very old messages
    const threeDaysAgo = format(subDays(new Date(), 3), "yyyy-MM-dd");

    // Fetch Students and DB Logs
    const [studentsSnap, logsSnap] = await Promise.all([
      db.ref(`Institutes/${instituteId}/admissions`).get(),
      db.ref(`Institutes/${instituteId}/essl_logs`)
        .orderByChild("DateTime")
        .startAt(threeDaysAgo)
        .get()
    ]);

    const students = studentsSnap.exists() ? Object.values(studentsSnap.val() as any) : [];
    const dbLogs = logsSnap.exists() ? logsSnap.val() : {};

    const smsPromises: Promise<any>[] = [];
    let sentCount = 0;

    for (const [key, log] of Object.entries(dbLogs) as any) {
      // Check if log is relatively recent and SMS is not sent yet
      const logDate = log.DateTime ? log.DateTime.split(" ")[0] : "";
      
      // Some logs might have `isSMSSent` or `smsSent` or `IsSendSms` set to false
      const isPending = (log.isSMSSent === false || log.IsSendSms === false || log.smsSent === false);

      if (isPending && logDate >= threeDaysAgo) {
        const student: any = students.find((s: any) => {
          if (!s.rollNo || !log.EmployeeCode) return false;
          const dbRoll = s.rollNo.toString().toLowerCase().trim();
          const machineCode = log.EmployeeCode.toString().toLowerCase().trim();
          return dbRoll === machineCode ||
            dbRoll === `stu_${machineCode}` ||
            machineCode === `stu_${dbRoll}` ||
            dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
        });

        if (student && student.fatherMobile && student.fatherMobile !== "N/A") {
          console.log(`[Cron: Send Pending SMS] Sending to ${student.studentName} for punch ${log.Status}`);

          const smsPromise = sendAttendanceSmsServer({
            mobile: student.fatherMobile,
            studentName: student.studentName,
            dateTime: log.DateTime,
            type: log.Status || "IN"
          }).then(async (res) => {
            if (res.success) {
              sentCount++;
              // Mark as sent in all possible fields to be safe
              await db.ref(`Institutes/${instituteId}/essl_logs/${key}`).update({
                IsSendSms: true,
                isSMSSent: true,
                smsSent: true
              });
            } else {
              console.error(`[Cron: Send Pending SMS] Failed for ${student.studentName}:`, res.error);
            }
            return res;
          }).catch(err => {
             console.error(`[Cron: Send Pending SMS] Exception for ${student.studentName}:`, err);
          });

          smsPromises.push(smsPromise);
        } else {
           // Not a student or no mobile, mark it as sent so we don't keep retrying
           await db.ref(`Institutes/${instituteId}/essl_logs/${key}`).update({
             IsSendSms: true,
             isSMSSent: true,
             smsSent: true
           });
        }
      }
    }

    if (smsPromises.length > 0) {
      await Promise.allSettled(smsPromises);
    }

    return NextResponse.json({
      success: true,
      message: `Checked pending SMS. Sent ${sentCount} messages.`,
      sentCount
    });

  } catch (error: any) {
    console.error("[Cron: Send Pending SMS] Critical Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
