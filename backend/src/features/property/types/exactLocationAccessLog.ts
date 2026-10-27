/**
 * ============================================================
 * Exact Location Access Log
 * ============================================================
 *
 * ثبت سابقه دسترسی به موقعیت دقیق ملک.
 *
 * این لاگ مشخص می‌کند:
 * - موقعیت دقیق کدام ملک مشاهده شده
 * - توسط چه کاربری
 * - در چه زمانی
 * - با چه دلیلی
 */

export interface ExactLocationAccessLog {
  id: string;
  propertyId: string;
  userId: string;
  accessedAt: Date;
  reason: string | null;
}