import { findPublishedPublicPropertyById } from "../repository/publicPropertyRepository";

/**
 * جزئیات مسیر جستجو همیشه با سطح دسترسی عمومی برمی‌گردد.
 * هویت و نقش نشست کاربر در این خروجی دخالت ندارد؛
 * اطلاعات خصوصی مالک فقط از مسیرهای خصوصی پنل‌های مجاز قابل دریافت است.
 */
export async function getPublishedPublicPropertyById(id: string) {
  const property = await findPublishedPublicPropertyById(id);
  if (!property) throw new Error("آگهی عمومی موردنظر پیدا نشد.");

  const {
    owners,
    agents,
    registrationSource,
    ...publicProperty
  } = property;

  // مالکی که هشتی به‌عنوان رابطه تکمیلی افزوده است، منبع اطلاعات تماس عمومی نیست.
  const publicOwners = owners.filter((relation) => relation.addedByRole !== "HASHTI");

  const firstRegistrantRelation = agents.find((relation) => relation.isFirstRegistrant);
  const firstRegistrant = firstRegistrantRelation?.status === "ACTIVE" &&
    firstRegistrantRelation.agent.verificationStatus === "VERIFIED" &&
    firstRegistrantRelation.agent.user.isActive === true
    ? firstRegistrantRelation.agent
    : null;
  const approvedAgentRelation = agents.find(
    (relation) => relation.status === "ACTIVE" && relation.approvedByOwner &&
      relation.agent.verificationStatus === "VERIFIED" && relation.agent.user.isActive === true
  );
  const approvedAgent = approvedAgentRelation?.agent ?? null;
  const primaryOwner = publicOwners[0]?.owner?.user.isActive === true
    ? publicOwners[0].owner
    : null;

  // اطلاعات تماس عمومی بر اساس منشأ آگهی و وضعیت تأیید مالک تعیین می‌شود،
  // نه بر اساس نقش یا هویت بازدیدکننده.
  let contact: {
    type: "OWNER" | "AGENT";
    label: "مالک" | "مشاور ثبت‌کننده" | "مشاور تأییدشده";
    firstName: string;
    lastName: string;
    mobile: string;
  } | null = null;

  if (registrationSource === "AGENT") {
    if (firstRegistrant) {
      contact = {
        type: "AGENT",
        label: "مشاور ثبت‌کننده",
        firstName: firstRegistrant.firstName,
        lastName: firstRegistrant.lastName,
        mobile: firstRegistrant.user.mobile,
      };
    }
  } else if (approvedAgent) {
    contact = {
      type: "AGENT",
      label: "مشاور تأییدشده",
      firstName: approvedAgent.firstName,
      lastName: approvedAgent.lastName,
      mobile: approvedAgent.user.mobile,
    };
  } else if (primaryOwner) {
    // استثنای آگهی مالک‌محور: تا وقتی مشاور منتخب وجود ندارد،
    // مالک ثبت‌کننده، مخاطب عمومی آگهی است.
    contact = {
      type: "OWNER",
      label: "مالک",
      firstName: primaryOwner.firstName,
      lastName: primaryOwner.lastName,
      mobile: primaryOwner.user.mobile,
    };
  }

  // پاسخ جستجو برای همه کاربران یکسان است؛ هیچ مشخصات خصوصی مالک ارسال نمی‌شود.
  const listing = publicProperty.listing
    ? {
        transactionType: publicProperty.listing.transactionType,
        salePrice: publicProperty.listing.salePrice,
        depositAmount: publicProperty.listing.depositAmount,
        rentAmount: publicProperty.listing.rentAmount,
      }
    : null;
  const media = publicProperty.media.map(({ type, url, sortOrder }) => ({
    type,
    url,
    sortOrder,
  }));

  // مختصات عمومی در نتایج جستجو استفاده می‌شود؛ جزئیات عمومی آن را ارسال نمی‌کند.
  return {
    ...publicProperty,
    listing,
    media,
    contact,
    ownerDetails: null,
  };
}
