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

/**
 * ------------------------------------------------------------
 * دریافت Profile مالک
 * ------------------------------------------------------------
 */
export const getOwnerProfile = async (
  ownerId: string
) => {
  const owner =
    await findOwnerProfileById(ownerId);

  if (!owner) {
    throw new Error("Owner not found");
  }

  return owner;
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

  return updateOwnerProfile(ownerId, {
    ...(firstName !== undefined && {
      firstName,
    }),

    ...(lastName !== undefined && {
      lastName,
    }),
  });
};

/**
 * Lists properties connected to an existing owner profile.
 */
export const getOwnerPropertiesService = async (ownerId: string) => {
  const owner = await findOwnerProfileById(ownerId);
  if (!owner) throw new Error("Owner not found");
  return findOwnerPropertiesByOwnerId(ownerId);
};

/**
 * دریافت پروفایل مالک از نشست معتبر، بدون اتکا به شناسه ذخیره‌شده در مرورگر.
 */
export const getCurrentOwnerProfile = async (authenticatedUserId: string) => {
  const owner = await findOwnerProfileByUserId(authenticatedUserId);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");
  return owner;
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
  return updateOwnerProfileService(owner.id, data);
};

/**
 * دریافت املاک مالک جاری؛ شناسه مالک از نشست معتبر به دست می‌آید.
 */
export const getCurrentOwnerPropertiesService = async (authenticatedUserId: string) => {
  const owner = await findOwnerProfileByUserId(authenticatedUserId);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");
  return findOwnerPropertiesByOwnerId(owner.id);
};
