import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { requireAdminServicePermission } from "../../admin/service/adminService";

/** بررسی اعتبار تأیید آگهی پس از احراز دسترسی به ملک. */
export async function checkPropertyConfirmation(propertyId: string, actor: AuthorizationActor) {
  if (actor.role === "HASHTI") await requireAdminServicePermission(actor.id, "PROPERTIES_MANAGE");
  const property = await findPropertyAuthorizationContextById(propertyId);
  if (!property) throw new Error("ملک مورد نظر پیدا نشد.");
  const allowed = await authorizePropertyAction(actor, "ACCESS", property, { allowAgentCreator: true });
  if (!allowed) throw new Error("PROPERTY_CONFIRMATION_FORBIDDEN");

  const confirmUntil = property.listing?.confirmUntil ?? null;
  if (!confirmUntil) {
    return { isExpired: false, needsConfirmation: false, confirmUntil: null };
  }

  const isExpired = new Date(confirmUntil) <= new Date();
  return { isExpired, needsConfirmation: isExpired, confirmUntil };
}
