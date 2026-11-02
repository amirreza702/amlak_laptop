import { expireExpiredProperties } from "./expireExpiredPropertiesService";

/** مسیر دستی هشتی همان منطق مرکزی را با مجوز انقضای اجباری اجرا می‌کند. */
export async function expirePropertyListing(propertyId: string, performedBy?: string) {
  if (!performedBy) throw new Error("HASHTI_PERMISSION_REQUIRED");
  const result = await expireExpiredProperties({ propertyId, performedBy, force: true });
  return {
    expired: result.expiredCount > 0,
    statusChanged: result.expiredCount > 0,
    processedCount: result.processedCount,
    expiredCount: result.expiredCount,
  };
}
