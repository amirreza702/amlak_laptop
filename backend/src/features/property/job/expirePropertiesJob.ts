/**
 * ============================================================
 * Expire Properties Job
 * ============================================================
 *
 * این Job وظیفه اجرای دوره‌ای منطق انقضای ملک‌ها را دارد.
 *
 * نکته:
 *
 * Job خودش منطق Business ندارد.
 * فقط Service مربوط به انقضا را اجرا می‌کند.
 *
 * جریان:
 *
 * Scheduler / Cron
 *        ↓
 * expirePropertiesJob()
 *        ↓
 * expireExpiredProperties()
 *        ↓
 * پیدا کردن ملک‌های منقضی
 *        ↓
 * PUBLISHED → EXPIRED
 */

import {
  expireExpiredProperties,
} from "../service/expireExpiredPropertiesService";

/**
 * اجرای Job انقضای ملک‌ها
 */
export async function expirePropertiesJob() {
  console.log(
    "[Property Expiration Job] شروع بررسی ملک‌های منقضی‌شده..."
  );

  const result =
    await expireExpiredProperties();

  console.log(
    "[Property Expiration Job] نتیجه:",
    result
  );

  return result;
}