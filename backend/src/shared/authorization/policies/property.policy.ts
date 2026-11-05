import type {
  AuthorizationContext,
  AuthorizationPolicy,
} from "../authorization.types";

interface PropertyPolicyData {
  isRelatedOwner?: boolean;
  isApprovedAgent?: boolean;
  isAllowedAgentCreator?: boolean;
  isCreator?: boolean;
  isDeleted?: boolean;
  isActive?: boolean;
  isRegisteredByCurrentAgent?: boolean;
  isExpired?: boolean;
  isFinalApprovedAgent?: boolean;
  isAgentRegisteredProperty?: boolean;
  isApprovedAgentContactAllowed?: boolean;
}

/**
 * سیاست واحد دسترسی به منابع ملکی.
 * تصمیم درباره عملیات و داده‌های خصوصی فقط در این Policy انجام می‌شود.
 */
export const propertyPolicy: AuthorizationPolicy = (
  action: string,
  context: AuthorizationContext,
): boolean => {
  const data = context.resource?.data as PropertyPolicyData | undefined;
  if (!data) return false;

  const isHashti = context.actor.role === "HASHTI";
  if (data.isDeleted && !isHashti) return false;
  const isOwner = context.actor.role === "OWNER" && Boolean(data.isRelatedOwner);
  const isCreator = Boolean(data.isCreator);
  const isFinalApprovedAgent =
    context.actor.role === "AGENT" && Boolean(data.isFinalApprovedAgent);

  // ثبت سابقه فقط برای کاربری مجاز به مشاهده موقعیت دقیق؛
  // مشاهده سوابق محدود به هشتی و مالک مرتبط ملک است.
  if (action === "CREATE_EXACT_LOCATION_ACCESS_LOG") {
    return isHashti || isOwner || isFinalApprovedAgent || isCreator;
  }
  if (action === "VIEW_EXACT_LOCATION_ACCESS_LOGS") {
    return isHashti || isOwner;
  }

  if (action === "FAVORITE") {
    return context.actor.role === "CUSTOMER" &&
      data.isActive !== false &&
      !data.isExpired &&
      !data.isDeleted &&
      context.resource?.status === "PUBLISHED";
  }

  if (action === "ACCESS") {
    if (isHashti) return true;
    // انقضای آگهی، دسترسی عمومیِ ایجادکننده را هم می‌بندد.
    if (data.isExpired) return isOwner || isFinalApprovedAgent;
    if (context.actor.role === "OWNER") return isOwner;
    if (context.actor.role === "AGENT") {
      return isFinalApprovedAgent || Boolean(data.isAllowedAgentCreator);
    }
    return false;
  }

  // انتشار یا رد آگهی فقط یک تصمیم اختصاصی هشتی است.
  if (action === "APPROVE_PUBLICATION") {
    return isHashti;
  }

  if (action === "ARCHIVE") return isHashti;
  if (action === "VIEW_ARCHIVE") return isHashti || isOwner;
  if (action === "RESTORE") return isHashti || isOwner;

  if (action === "RENEW") {
    // تمدید فقط برای مالک مرتبط یا مشاور دارای تأیید نهایی مالک و فقط پس از انقضا مجاز است.
    return Boolean(data.isExpired && (isOwner || isFinalApprovedAgent));
  }

  if (action === "MANAGE") {
    if (isHashti) return true;
    // مجوز مشاهده مشاور تأییدشده، به‌تنهایی مجوز ویرایش نیست.
    // پس از انقضا فقط مالک مرتبط می‌تواند مدیریت کند.
    if (data.isExpired) return isOwner;
    return Boolean(
      data.isCreator ||
      (context.actor.role === "OWNER" && data.isRelatedOwner),
    );
  }

  if (action === "EDIT_OWN_REGISTRATION") {
    if (isHashti) return true;
    return !data.isExpired &&
      context.actor.role === "AGENT" &&
      Boolean(data.isRegisteredByCurrentAgent);
  }

  if (action === "READ_PRIVATE") {
    if (isHashti) return true;
    if (data.isExpired) return isOwner || isFinalApprovedAgent;
    return isCreator || isOwner || isFinalApprovedAgent;
  }

  // شماره مشاور تأییدشده برای مالک فقط پس از پذیرش درخواست همکاری نمایش داده می‌شود.
  if (action === "VIEW_APPROVED_AGENT_CONTACT") {
    if (isHashti) return true;
    return isOwner && Boolean(data.isApprovedAgentContactAllowed);
  }

  // مشاور فقط می‌تواند رابطه همکاری نهاییِ متعلق به خودش را لغو کند.
  if (action === "REVOKE_OWN_RELATION") {
    return context.actor.role === "AGENT" && isFinalApprovedAgent;
  }

  // اطلاعات مشاور ثبت‌کننده، مجوز مستقلی از اطلاعات خصوصی مالک دارد.
  if (action === "VIEW_REGISTRANT_DETAILS") {
    if (isHashti) return true;
    if (!data.isAgentRegisteredProperty) return false;
    if (data.isExpired) return isOwner || isFinalApprovedAgent;
    return context.actor.role === "AGENT";
  }

  // مجوز موقعیت دقیق و اطلاعات مالک مستقل از سایر مجوزهاست.
  if (action === "VIEW_EXACT_LOCATION" || action === "VIEW_OWNER_DETAILS") {
    if (isHashti) return true;
    if (data.isExpired) return isOwner || isFinalApprovedAgent;
    return isOwner || isCreator || isFinalApprovedAgent;
  }

  return false;
};
