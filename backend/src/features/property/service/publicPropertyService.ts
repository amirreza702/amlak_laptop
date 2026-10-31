import { findPublishedPublicPropertyById } from "../repository/publicPropertyRepository";

/**
 * دریافت اطلاعات قابل نمایش عمومی یک آگهی.
 *
 * سیاست تماس:
 * - ملک ثبت‌شده توسط مالک: تا پیش از تأیید مشاور، شماره مالک نمایش داده می‌شود.
 * - پس از تأیید مشاور: فقط شماره همان مشاور نمایش داده می‌شود.
 * - ملک ثبت‌شده توسط مشاور: فقط شماره مشاور ثبت‌کننده نمایش داده می‌شود.
 * - شماره مالک در ملک ثبت‌شده توسط مشاور هرگز در پاسخ عمومی قرار نمی‌گیرد.
 *
 * اطلاعات تماس کامل کارکنان هشتی فقط از مسیرهای مدیریتی احراز هویت‌شده
 * قابل دریافت است؛ این سرویس صرفاً پاسخ عمومی آگهی را می‌سازد.
 */
export async function getPublishedPublicPropertyById(id: string) {
  const property = await findPublishedPublicPropertyById(id);

  if (!property) {
    throw new Error("آگهی عمومی موردنظر پیدا نشد.");
  }

  const { owners, agents, registrationSource, ...publicProperty } = property;

  const firstRegistrantRelation = agents.find((relation) => relation.isFirstRegistrant)
    ?? agents[0];
  const firstRegistrant = firstRegistrantRelation?.status === "ACTIVE"
    ? firstRegistrantRelation.agent
    : null;

  // فقط رابطه فعال و تأییدشده می‌تواند شماره عمومی مشاور باشد.
  const approvedAgent = agents.find(
    (relation) => relation.status === "ACTIVE" && relation.approvedByOwner
  )?.agent;

  const primaryOwner = owners[0]?.owner;

  let contact: {
    type: "OWNER" | "AGENT";
    firstName: string;
    lastName: string;
    mobile: string;
  } | null = null;

  if (registrationSource === "AGENT") {
    // ثبت مشاور: فقط شماره همان مشاور ثبت‌کننده؛ بدون fallback به مالک.
    if (firstRegistrant) {
      contact = {
        type: "AGENT",
        firstName: firstRegistrant.firstName,
        lastName: firstRegistrant.lastName,
        mobile: firstRegistrant.user.mobile,
      };
    }
  } else if (approvedAgent) {
    // ثبت مالک پس از تأیید نهایی: فقط شماره مشاور منتخب مالک.
    contact = {
      type: "AGENT",
      firstName: approvedAgent.firstName,
      lastName: approvedAgent.lastName,
      mobile: approvedAgent.user.mobile,
    };
  } else if (primaryOwner) {
    // ثبت مالک پیش از تأیید مشاور: شماره مالک تأییدشده.
    contact = {
      type: "OWNER",
      firstName: primaryOwner.firstName,
      lastName: primaryOwner.lastName,
      mobile: primaryOwner.user.mobile,
    };
  }

  return { ...publicProperty, contact };
}
