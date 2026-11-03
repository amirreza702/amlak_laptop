import { autoArchivePropertiesJob } from "../features/property/job/autoArchivePropertiesJob";

/** زمان اجرای بعدی: ابتدای ماه تقویمی بعد، ساعت ۰۰:۱۰ زمان سرور. */
function millisecondsUntilNextMonth() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 10, 0, 0);
  return Math.max(1, nextMonth.getTime() - now.getTime());
}

export function startPropertyArchivalScheduler() {
  console.log("[Property Archival Scheduler] فعال شد.");

  // یک بررسی هنگام راه‌اندازی؛ سپس در ابتدای هر ماه تقویمی.
  void autoArchivePropertiesJob().catch((error) => {
    console.error("[Property Archival Scheduler] خطا در اجرای اولیه:", error);
  });

  const scheduleNextRun = () => {
    setTimeout(async () => {
      try {
        await autoArchivePropertiesJob();
      } catch (error) {
        console.error("[Property Archival Scheduler] خطا در اجرای ماهانه:", error);
      } finally {
        scheduleNextRun();
      }
    }, millisecondsUntilNextMonth());
  };

  scheduleNextRun();
}
