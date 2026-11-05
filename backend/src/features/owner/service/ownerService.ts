/**
 * ============================================================
 * Owner Service
 * ============================================================
 *
 * منطق Business مربوط به Profile مالک در این Service قرار دارد.
 *
 * Service مستقیماً با Database ارتباط ندارد.
 * تمام دسترسی به Database از طریق Owner Repository انجام می‌شود.
 *
 * ============================================================
 */

import {
  findOwnerProfileById,
  findOwnerProfileByUserId,
  findOwnerPropertiesByOwnerId,
  updateOwnerProfile,
} from "../repository/ownerRepository";
import { authorizePropertyAction, getPropertyVisibility, projectPropertyForActor } from "../../property/service/propertyAuthorizationService";
import { authorize } from "../../../shared/authorization/authorization.core";

/**
 * ------------------------------------------------------------
 * دریافت Profile مالک
 * ------------------------------------------------------------
 */
export const getOwnerProfile = async (
  ownerId: string,
  authenticatedUserId: string
) => {
  const owner =
    await findOwnerProfileById(ownerId);

  if (!owner) {
    throw new Error("Owner not found");
  }

  const allowed = await authorize("owner", "READ", {
    actor: { id: authenticatedUserId, role: "OWNER" },
    resource: { id: owner.id, data: { isSelf: owner.userId === authenticatedUserId } },
  });
  if (!allowed) throw new Error("OWNER_PROFILE_FORBIDDEN");
  const { userId: _userId, ...safeOwner } = owner;
  return safeOwner;
};

/**
 * ------------------------------------------------------------
 * ویرایش Profile مالک
 * ------------------------------------------------------------
 *
 * قوانین:
 *
 * - firstName در صورت ارسال نباید خالی باشد.
 * - lastName در صورت ارسال نباید خالی باشد.
 * - حداقل یکی از فیلدها باید ارسال شده باشد.
 * - mobile در این Service قابل تغییر نیست.
 */
export const updateOwnerProfileService = async (
  ownerId: string,
  authenticatedUserId: string,
  data: {
    firstName?: string;
    lastName?: string;
  }
) => {
  const owner =
    await findOwnerProfileById(ownerId);

  if (!owner) {
    throw new Error("Owner not found");
  }

  const allowed = await authorize("owner", "UPDATE", {
    actor: { id: authenticatedUserId, role: "OWNER" },
    resource: { id: owner.id, data: { isSelf: owner.userId === authenticatedUserId } },
  });
  if (!allowed) throw new Error("OWNER_PROFILE_FORBIDDEN");

  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();

  if (
    firstName !== undefined &&
    firstName.length === 0
  ) {
    throw new Error("First name cannot be empty");
  }

  if (
    lastName !== undefined &&
    lastName.length === 0
  ) {
    throw new Error("Last name cannot be empty");
  }

  if (
    firstName === undefined &&
    lastName === undefined
  ) {
    throw new Error("No profile fields to update");
  }

  const updated = await updateOwnerProfile(ownerId, {
    ...(firstName !== undefined && {
      firstName,
    }),

    ...(lastName !== undefined && {
      lastName,
    }),
  });
  const { userId: _userId, ...safeUpdated } = updated;
  return safeUpdated;
};

/**
 * Shape owner property records with the same per-owner contact privacy rules
 * for both profile-scoped and session-scoped endpoints.
 */
const shapeOwnerPropertyRecords = async (
  owner: { userId: string; firstName: string; lastName: string; user: { mobile: string } },
  records: Awaited<ReturnType<typeof findOwnerPropertiesByOwnerId>>
) => Promise.all(records.map(async (record) => {
  const { agents, ownerAgentRequests, owners: ownerRelations, ...propertyData } = record.property;

  // مالکیت و سطح نمایش ملک از Policy مرکزی تعیین می‌شود؛ این سرویس فقط
  // روابط آماده‌شده توسط Repository را به Core می‌دهد.
  const visibility = await getPropertyVisibility(
    { id: owner.userId, role: "OWNER" },
    { ...record.property, owners: ownerRelations },
  );
  const safeProperty = projectPropertyForActor(propertyData, visibility, {
    owner: {
      firstName: owner.firstName,
      lastName: owner.lastName,
      mobile: owner.user.mobile,
    },
    owners: [],
  });

  // نمایش شماره مشاور همچنان تابع رابطه همکاری پذیرفته‌شده است؛
  // تصمیم محرمانگی داده‌های ملک و مالک از Policy مرکزی می‌آید.
  const approvedAgent = agents.find((relation) =>
    relation.status === "ACTIVE" && relation.approvedByOwner
  ) ?? null;
  const ownerApprovedThisAgent = Boolean(approvedAgent && ownerAgentRequests.some((request) =>
    request.responses.some((response) => response.agentId === approvedAgent.agentId)
  ));
  const canViewApprovedAgentContact = approvedAgent
    ? await authorizePropertyAction(
        { id: owner.userId, role: "OWNER" },
        "VIEW_APPROVED_AGENT_CONTACT",
        { ...record.property, owners: ownerRelations },
        { allowApprovedAgentContact: ownerApprovedThisAgent },
      )
    : false;

  return {
    ...record,
    property: {
      ...safeProperty,
      agents: record.property.registrationSource === "AGENT"
        ? agents.filter((relation) => relation.isFirstRegistrant && relation.status === "ACTIVE")
        : agents.map((relation) => ({
            ...relation,
            agent: {
              ...relation.agent,
              user: { mobile: relation.status === "ACTIVE" && relation.approvedByOwner && canViewApprovedAgentContact ? relation.agent.user.mobile : "" },
            },
          })),
    },
  };
}));

/**
 * Lists properties connected to an existing owner profile.
 */
export const getOwnerPropertiesService = async (ownerId: string, authenticatedUserId: string) => {
  const owner = await findOwnerProfileById(ownerId);
  if (!owner) throw new Error("Owner not found");
  const allowed = await authorize("owner", "LIST_OWN", {
    actor: { id: authenticatedUserId, role: "OWNER" },
    resource: { id: owner.id, data: { isSelf: owner.userId === authenticatedUserId } },
  });
  if (!allowed) throw new Error("OWNER_PROFILE_FORBIDDEN");
  const records = await findOwnerPropertiesByOwnerId(ownerId);
  return shapeOwnerPropertyRecords(owner, records);
};

/**
 * دریافت پروفایل مالک از نشست معتبر، بدون اتکا به شناسه ذخیره‌شده در مرورگر.
 */
export const getCurrentOwnerProfile = async (authenticatedUserId: string) => {
  const owner = await findOwnerProfileByUserId(authenticatedUserId);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");
  const allowed = await authorize("owner", "READ", { actor: { id: authenticatedUserId, role: "OWNER" }, resource: { id: owner.id, data: { isSelf: owner.userId === authenticatedUserId } } });
  if (!allowed) throw new Error("OWNER_PROFILE_FORBIDDEN");
  const { userId: _userId, ...safeOwner } = owner;
  return safeOwner;
};

/**
 * ویرایش پروفایل مالک جاری؛ مالک از نشست تعیین می‌شود.
 */
export const updateCurrentOwnerProfileService = async (
  authenticatedUserId: string,
  data: { firstName?: string; lastName?: string }
) => {
  const owner = await findOwnerProfileByUserId(authenticatedUserId);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");
  const allowed = await authorize("owner", "UPDATE", { actor: { id: authenticatedUserId, role: "OWNER" }, resource: { id: owner.id, data: { isSelf: owner.userId === authenticatedUserId } } });
  if (!allowed) throw new Error("OWNER_PROFILE_FORBIDDEN");
  return updateOwnerProfileService(owner.id, authenticatedUserId, data);
};

/**
 * دریافت املاک مالک جاری؛ شناسه مالک از نشست معتبر به دست می‌آید.
 */
export const getCurrentOwnerPropertiesService = async (authenticatedUserId: string) => {
  const owner = await findOwnerProfileByUserId(authenticatedUserId);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");
  const allowed = await authorize("owner", "LIST_OWN", { actor: { id: authenticatedUserId, role: "OWNER" }, resource: { id: owner.id, data: { isSelf: owner.userId === authenticatedUserId } } });
  if (!allowed) throw new Error("OWNER_PROFILE_FORBIDDEN");
  const records = await findOwnerPropertiesByOwnerId(owner.id);
  return shapeOwnerPropertyRecords(owner, records);
};
