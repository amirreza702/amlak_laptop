/**
 * ============================================================
 * VerificationDocument
 * ============================================================
 *
 * قرارداد داده‌ای مدرک محرمانه مربوط به پرونده تأیید.
 *
 * این مدارک برای فرآیند بررسی هشتی هستند و با
 * PropertyMedia تفاوت دارند.
 *
 * PropertyMedia
 *   → تصاویر و پلان قابل استفاده برای معرفی ملک
 *
 * VerificationDocument
 *   → مدارک مورد استفاده در فرآیند تأیید هشتی
 */

export interface VerificationDocument {
  id: string;

  verificationCaseId: string;

  documentType: string;

  fileUrl: string;

  createdAt: Date;
}