import {
  VerificationStatus,
  PropertyHistoryAction,
} from "@prisma/client";

import {
  findPropertyOwner,
} from "../repository/propertyOwnerRepository";

import {
  createPropertyHistory,
} from "../repository/propertyHistoryRepository";

import { prisma } from "../../../lib/prisma";

export interface VerifyPropertyOwnerInput {
  propertyId: string;
  ownerId: string;
  status: VerificationStatus;

  /**
   * شناسه فرد/کاربری که عملیات Verification را انجام داده است.
   *
   * فعلاً از Controller دریافت نمی‌شود.
   * بعداً با Authentication و HashtiStaff تکمیل می‌شود.
   */
  performedBy?: string;

  /**
   * دلیل تغییر وضعیت.
   */
  reason?: string;
}

export async function verifyPropertyOwner(
  data: VerifyPropertyOwnerInput
) {
  // ----------------------------------------------------------
  // 1. پیدا کردن اتصال مالک به ملک
  // ----------------------------------------------------------

  const propertyOwner = await findPropertyOwner(
    data.propertyId,
    data.ownerId
  );

  if (!propertyOwner) {
    throw new Error(
      "این مالک به ملک مورد نظر متصل نیست."
    );
  }

  // ----------------------------------------------------------
  // 2. وضعیت جدید باید یکی از وضعیت‌های معتبر باشد.
  // ----------------------------------------------------------

  if (
    data.status !== VerificationStatus.PENDING &&
    data.status !== VerificationStatus.VERIFIED &&
    data.status !== VerificationStatus.REJECTED
  ) {
    throw new Error(
      "وضعیت تأیید نامعتبر است."
    );
  }

  // ----------------------------------------------------------
  // 3. بررسی Transition مجاز
  //
  // PENDING → VERIFIED
  // PENDING → REJECTED
  // REJECTED → PENDING
  //
  // VERIFIED → وضعیت دیگر مجاز نیست.
  // ----------------------------------------------------------

  const currentStatus =
    propertyOwner.verificationStatus;

  const isAllowedTransition =
    (currentStatus === VerificationStatus.PENDING &&
      (data.status === VerificationStatus.VERIFIED ||
        data.status === VerificationStatus.REJECTED)) ||
    (currentStatus === VerificationStatus.REJECTED &&
      data.status === VerificationStatus.PENDING);

  if (!isAllowedTransition) {
    throw new Error(
      `تغییر وضعیت از ${currentStatus} به ${data.status} مجاز نیست.`
    );
  }

  // ----------------------------------------------------------
  // 4. Transaction
  //
  // تغییر وضعیت و ثبت History باید یک عملیات اتمیک باشند.
  // ----------------------------------------------------------

  return prisma.$transaction(async (tx) => {
    const updatedPropertyOwner =
      await tx.propertyOwner.update({
        where: {
          propertyId_ownerId: {
            propertyId: data.propertyId,
            ownerId: data.ownerId,
          },
        },

        data: {
          verificationStatus: data.status,

          verifiedAt:
            data.status === VerificationStatus.VERIFIED
              ? new Date()
              : null,
        },
      });

    // --------------------------------------------------------
    // 5. ثبت تاریخچه تغییر Verification
    // --------------------------------------------------------

    await createPropertyHistory(
      {
        propertyId: data.propertyId,
        action:
          PropertyHistoryAction.VERIFICATION_CHANGED,
        field: "verificationStatus",
        oldValue: currentStatus,
        newValue: data.status,
        performedBy: data.performedBy ?? null,
        reason: data.reason ?? null,
      },
      tx
    );

 

    
    if (data.performedBy) {
      const actor = await tx.user.findUnique({
        where: { id: data.performedBy },
        select: { id: true, mobile: true, role: true },
      });

      if (actor?.role === "HASHTI") {
        await tx.adminAuditLog.create({
          data: {
            actorUserId: actor.id,
            actorMobile: actor.mobile,
            actorRole: actor.role,
            action: "OWNER_PROPERTY_VERIFICATION_CHANGED",
            targetType: "OWNER_PROPERTY",
            targetId: data.ownerId,
            details: {
              propertyId: data.propertyId,
              ownerId: data.ownerId,
              previousStatus: currentStatus,
              newStatus: data.status,
              reason: data.reason ?? null,
            },
          },
        });
      }
    }

    return updatedPropertyOwner;
  });
}