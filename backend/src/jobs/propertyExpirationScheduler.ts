/**
 * ============================================================
 * Property Expiration Scheduler
 * ============================================================
 *
 * وظیفه این فایل فقط زمان‌بندی اجرای Job است.
 *
 * هیچ منطق Business مربوط به Property
 * نباید داخل Scheduler قرار بگیرد.
 *
 * جریان:
 *
 * Scheduler
 *     ↓
 * هر ۱ ساعت
 *     ↓
 * Property Expiration Job
 *     ↓
 * Expiration Service
 */

import {
  expirePropertiesJob,
} from "../features/property/job/expirePropertiesJob";

/**
 * فاصله اجرای Scheduler
 *
 * فعلاً هر ۱ ساعت:
 *
 * 60 دقیقه
 * × 60 ثانیه
 * × 1000 میلی‌ثانیه
 */
const ONE_HOUR = 60 * 60 * 1000;

/**
 * شروع Scheduler انقضای ملک‌ها
 */
export function startPropertyExpirationScheduler() {
  console.log(
    "[Property Expiration Scheduler] فعال شد."
  );

  /**
   * اجرای دوره‌ای Job
   */
  setInterval(
    async () => {
      try {
        await expirePropertiesJob();
      } catch (error) {
        console.error(
          "[Property Expiration Scheduler] خطا در اجرای Job:",
          error
        );
      }
    },
    ONE_HOUR
  );
}