
import CryptoJS from 'crypto-js';

const MASTER_SECRET = "tb-ims-secure-protocol-v2-2024";

/**
 * Encrypts a message using AES-256 before storing in Firestore.
 */
export const encryptMessage = (message: string, chatId: string): string => {
  const key = `${MASTER_SECRET}-${chatId}`;
  return CryptoJS.AES.encrypt(message, key).toString();
};

/**
 * Decrypts a message using AES-256 for local display.
 */
export const decryptMessage = (ciphertext: string, chatId: string): string => {
  try {
    const key = `${MASTER_SECRET}-${chatId}`;
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return "Error decrypting message";
  }
};
