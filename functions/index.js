const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");


// Initialize Firebase Admin
admin.initializeApp();

exports.sendAttendanceSms = functions.database
  .ref("/Institutes/{instituteId}/essl_logs/{logId}")
  .onCreate(async (snapshot, context) => {
    const logData = snapshot.val();
    const instituteId = context.params.instituteId;
    const logId = context.params.logId;

    console.log(`New log detected for Institute: ${instituteId}, Log ID: ${logId}`);

    // If no data or SMS already sent, exit
    if (!logData || logData.smsSent) {
      console.log("No log data or SMS already sent. Exiting.");
      return null;
    }

    const employeeCode = logData.EmployeeCode;
    if (!employeeCode) return null;

    // Fetch students (admissions) for this institute to match the EmployeeCode
    const db = admin.database();
    const admissionsSnap = await db.ref(`/Institutes/${instituteId}/admissions`).once("value");

    if (!admissionsSnap.exists()) {
      console.log("No students found for this institute.");
      return null;
    }

    const students = Object.values(admissionsSnap.val());

    // Find matching student
    const student = students.find(s => {
      if (!s.rollNo) return false;
      const dbRoll = s.rollNo.toString().toLowerCase().trim();
      const machineCode = employeeCode.toString().toLowerCase().trim();

      // Match logic (direct, with STU_ prefix, or stripped prefix)
      return dbRoll === machineCode ||
        dbRoll === `stu_${machineCode}` ||
        machineCode === `stu_${dbRoll}` ||
        dbRoll.replace(/^stu_/, '') === machineCode.replace(/^stu_/, '');
    });

    if (!student || !student.fatherMobile) {
      console.log(`No student or mobile number found for EmployeeCode: ${employeeCode}`);
      return null;
    }

    // Determine if it's a Punch IN or Punch OUT
    const rawStatus = (logData.Status || "").toString().trim().toLowerCase();
    const isPunchIn = rawStatus === "in" || rawStatus === "check-in" || rawStatus === "0" || rawStatus === "p" || rawStatus === "entry" || rawStatus === "";
    const isPunchOut = rawStatus === "out" || rawStatus === "ot-out" || rawStatus === "1" || rawStatus === "punch-out" || rawStatus === "exit" || rawStatus === "checkout" || rawStatus === "check-out";

    if (!isPunchIn && !isPunchOut) {
      console.log(`Status '${rawStatus}' not recognized as IN/OUT.`);
      return null;
    }

    const punchType = isPunchIn ? "IN" : "OUT";
    console.log(`Preparing to send ${punchType} SMS to ${student.studentName} (${student.fatherMobile})`);

    // SEND SMS via MSG91
    try {
      // You can set these via `firebase functions:config:set msg91.authkey="..."`
      // Or hardcode them here if you prefer a quick setup
      const authKey = functions.config().msg91?.authkey || process.env.MSG91_AUTH_KEY || "377178A6M4kK8pCUD6284bf39P1";
      const senderId = functions.config().msg91?.senderid || process.env.MSG91_SENDER_ID || "MYCLED";
      const templateId = punchType === "IN"
        ? (functions.config().msg91?.templatein || process.env.MSG91_TEMPLATE_IN || "69f32b9c4d3d7cbf9b0aaa02")
        : (functions.config().msg91?.templateout || process.env.MSG91_TEMPLATE_OUT || "69f32c3b8e3a51184e03a712");

      if (authKey === "YOUR_MSG91_AUTH_KEY") {
        console.error("MSG91 Credentials are not set. Cannot send SMS.");
        return null;
      }

      // Format mobile number to 12 digits (91 + 10 digits)
      let formattedMobile = student.fatherMobile.toString().trim().replace(/[^0-9]/g, '');
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
        var1: student.studentName,
        var2: logData.DateTime.split(' ')[1] || logData.DateTime // Get just the time
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
        console.error("MSG91 Error:", result.message || JSON.stringify(result));
      } else {
        // Success: Mark the log in Firebase as smsSent: true
        await snapshot.ref.update({ smsSent: true });
        console.log(`✅ SMS successfully sent to ${student.studentName} for ${punchType}`);
      }

    } catch (error) {
      console.error("Error sending SMS request:", error);
    }

    return null;
  });
