import { archiveEligibleProperties } from "../service/autoArchivePropertiesService";

/** اجرای Job آرشیو خودکار ملک‌های فروخته/اجاره‌رفته و آگهی‌های قدیمی. */
export async function autoArchivePropertiesJob() {
  console.log("[Property Auto Archive Job] شروع بررسی آرشیو خودکار...");
  const result = await archiveEligibleProperties();
  console.log("[Property Auto Archive Job] نتیجه:", result);
  return result;
}
