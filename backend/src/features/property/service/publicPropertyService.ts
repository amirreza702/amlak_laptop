import { findPublishedPublicPropertyById } from "../repository/publicPropertyRepository";

/**
 * دریافت اطلاعات قابل نمایش عمومی یک آگهی.
 *
 * سیاست تماس:
 * - ملک ثبت‌شده توسط مالک: تا پیش از تأیید مشاور، شماره مالک نمایش داده می‌شود.
 * - پس از تأیید مشاور: فقط شماره مشاور تأییدشده نمایش داده می‌شود.
 * - ملک ثبت‌شده توسط مشاور: فقط شماره مشاور ثبت‌کننده نمایش داده می‌شود.
 * - اطلاعات تماس مالک و مشاوران دیگر از پاسخ عمومی حذف می‌شود.
 *
 * دسترسی کارکنان هشتی و ادمین از مسیرهای مدیریتی احراز هویت‌شده انجام می‌شود؛
 * این سرویس صرفاً پاسخ عمومی آگهی را می‌سازد.
 */
export async function getPublishedPublicPropertyById(id: string) {
  const property = await findPublishedPublicPropertyById(id);

  if (!property) {
    throw new Error("آگهی عمومی موردنظر پیدا نشد.");
  }

  const { owners, agents, registrationSource, ...publicProperty } = property;

  const firstRegistrant = agents.find((relation) => relation.isFirstRegistrant)?.agent
    ?? agents[0]?.agent;
  const approvedAgent = agents.find((relation) => relation.approvedByOwner)?.agent;
  const primaryOwner = owners[0]?.owner;

  const selectedContact =
    registrationSource === "AGENT"
      ? firstRegistrant
      : approvedAgent ?? primaryOwner;

  const contact = selectedContact
    ? {
        type: selectedContact === primaryOwner ? "OWNER" as const : "AGENT" as const,
        firstName: selectedContact.firstName,
        lastName: selectedContact.lastName,
        mobile: selectedContact.user.mobile,
      }
    : null;

  return { ...publicProperty, contact };
}
