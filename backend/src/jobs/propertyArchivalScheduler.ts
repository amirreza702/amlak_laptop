import { autoArchivePropertiesJob } from "../features/property/job/autoArchivePropertiesJob";

const ARCHIVAL_INTERVAL_MS = 24 * 24 * 60 * 60 * 1000;

export function startPropertyArchivalScheduler() {
  console.log("[Property Archival Scheduler] فعال شد.");

  // یک بررسی هنگام راه‌اندازی؛ سپس هر ۲۴ روز یک‌بار.
  void autoArchivePropertiesJob().catch((error) => {
    console.error("[Property Archival Scheduler] خطا در اجرای اولیه:", error);
  });

  const scheduleNextRun = () => {
    setTimeout(async () => {
      try {
        await autoArchivePropertiesJob();
      } catch (error) {
        console.error("[Property Archival Scheduler] خطا در اجرای ۲۴ روزه:", error);
      } finally {
        scheduleNextRun();
      }
    }, ARCHIVAL_INTERVAL_MS);
  };

  scheduleNextRun();
}
