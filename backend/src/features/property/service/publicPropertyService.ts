import { findPublishedPublicPropertyById } from "../repository/publicPropertyRepository";

/**
 * دریافت اطلاعات قابل نمایش عمومی یک آگهی.
 *
 * آگهی حذف‌شده، منقضی یا منتشرنشده در دسترس عمومی نیست.
 */
export async function getPublishedPublicPropertyById(id: string) {
  const property = await findPublishedPublicPropertyById(id);

  if (!property) {
    throw new Error("آگهی عمومی موردنظر پیدا نشد.");
  }

  const { owners, agents, ...publicProperty } = property;
  const selectedAgent = agents[0]?.agent;
  const selectedOwner = owners[0]?.owner;
  const contact = selectedAgent
    ? { type: "AGENT" as const, firstName: selectedAgent.firstName, lastName: selectedAgent.lastName, mobile: selectedAgent.user.mobile }
    : selectedOwner
      ? { type: "OWNER" as const, firstName: selectedOwner.firstName, lastName: selectedOwner.lastName, mobile: selectedOwner.user.mobile }
      : null;

  return { ...publicProperty, contact };
}
