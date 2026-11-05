import type { AuthorizationContext, AuthorizationPolicy } from "../authorization.types";

interface SelfOwnedResourcePolicyData {
  isSelf?: boolean;
  isOwner?: boolean;
}

/**
 * Policy منابع شخصی؛ مالکیت رابطه در لایه آماده‌سازی Context احراز می‌شود.
 * این Policy فقط تصمیم می‌گیرد و هیچ وابستگی به Express یا Prisma ندارد.
 */
export const selfOwnedResourcePolicy: AuthorizationPolicy = (
  action: string,
  context: AuthorizationContext,
): boolean => {
  const data = context.resource?.data as SelfOwnedResourcePolicyData | undefined;
  if (!data || (data.isSelf !== true && data.isOwner !== true)) return false;

  return ["READ", "UPDATE", "BIND", "ACCESS", "LIST_OWN", "MANAGE"].includes(action);
};
