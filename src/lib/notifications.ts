"use client"

import { ref, push, serverTimestamp } from "firebase/database";
import { Database } from "firebase/database";

export enum NotificationType {
  Attendance = "Attendance",
  Fee = "Fee",
  Exam = "Exam",
  Admission = "Admission",
  Leave = "Leave",
  System = "System",
  Chat = "Chat"
}

interface NotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
}

/**
 * Creates a notification for a specific student.
 */
export async function createStudentNotification(
  database: Database,
  adminUid: string,
  studentId: string,
  input: NotificationInput
) {
  if (!database || !adminUid || !studentId) return;

  const notifRef = ref(database, `Institutes/${adminUid}/notifications/${studentId}`);
  await push(notifRef, {
    ...input,
    type: input.type || NotificationType.System,
    read: false,
    timestamp: serverTimestamp(),
  });
}

/**
 * Creates a notification for the admin.
 */
export async function createAdminNotification(
  database: Database,
  adminUid: string,
  input: NotificationInput
) {
  if (!database || !adminUid) return;

  const notifRef = ref(database, `Institutes/${adminUid}/notifications/admin`);
  await push(notifRef, {
    ...input,
    type: input.type || NotificationType.System,
    read: false,
    timestamp: serverTimestamp(),
  });
}
