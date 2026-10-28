'use server';

import { admin } from '@/lib/firebase-admin';


/**
 * Generates a password reset link for a user.
 * Requires Firebase Admin SDK configured properly.
 */
export async function generateResetLink(email: string) {
  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    return { success: true, link };
  } catch (error: any) {
    console.error("Error generating reset link:", error);
    return { success: false, error: error.message };
  }
}
