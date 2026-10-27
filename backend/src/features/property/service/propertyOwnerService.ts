import { findPropertyById } from "../repository/propertyRepository";
import {
  findPropertyOwner,
  createPropertyOwner,
} from "../repository/propertyOwnerRepository";
import { prisma } from "../../../lib/prisma";
import { PropertyHistoryAction } from "@prisma/client";
import { createPropertyHistory } from "../repository/propertyHistoryRepository";

export interface AddPropertyOwnerInput {
  propertyId: string;
  ownerId: string;
  share: number;
  isPrimary?: boolean;
  performedBy?: string;
}

export async function addPropertyOwner(
  data: AddPropertyOwnerInput
) {
  // ----------------------------------------------------------
  // 1. بررسی وجود ملک
  // ----------------------------------------------------------

  const property = await findPropertyById(data.propertyId);

  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  // ----------------------------------------------------------
  // 2. بررسی وجود مالک
  // ----------------------------------------------------------

  const owner = await prisma.owner.findUnique({
    where: {
      id: data.ownerId,
    },
  });

  if (!owner) {
    throw new Error("مالک مورد نظر پیدا نشد.");
  }

  // ----------------------------------------------------------
  // 3. بررسی اعتبار سهم این مالک
  // ----------------------------------------------------------

  if (data.share <= 0 || data.share > 6) {
    throw new Error(
      "سهم مالکیت باید بیشتر از صفر و حداکثر ۶ دانگ باشد."
    );
  }

  // ----------------------------------------------------------
  // 4. جلوگیری از اتصال دوباره همان مالک به همان ملک
  // ----------------------------------------------------------

  const existingPropertyOwner =
    await findPropertyOwner(
      data.propertyId,
      data.ownerId
    );

  if (existingPropertyOwner) {
    throw new Error(
      "این مالک قبلاً به این ملک متصل شده است."
    );
  }

  // ----------------------------------------------------------
  // 5. بررسی مالک اصلی
  // ----------------------------------------------------------

  if (data.isPrimary) {
    const existingPrimaryOwner =
      await prisma.propertyOwner.findFirst({
        where: {
          propertyId: data.propertyId,
          isPrimary: true,
        },
      });

    if (existingPrimaryOwner) {
      throw new Error(
        "این ملک قبلاً مالک اصلی دارد."
      );
    }
  }

  // ----------------------------------------------------------
  // 6. بررسی مجموع سهم مالکان
  // ----------------------------------------------------------

  const existingOwners =
    await prisma.propertyOwner.findMany({
      where: {
        propertyId: data.propertyId,
      },
      select: {
        share: true,
      },
    });

  const currentTotalShare = existingOwners.reduce(
    (total, propertyOwner) =>
      total + propertyOwner.share,
    0
  );

  const newTotalShare =
    currentTotalShare + data.share;

  if (newTotalShare > 6) {
    throw new Error(
      `مجموع سهم مالکان نمی‌تواند بیشتر از ۶ دانگ باشد. مجموع فعلی: ${currentTotalShare} دانگ`
    );
  }

  // ----------------------------------------------------------
  // 7. ایجاد ارتباط مالک و ملک
  // ----------------------------------------------------------

  return prisma.$transaction(async (tx) => {
  const propertyOwner = await createPropertyOwner(
    {
      propertyId: data.propertyId,
      ownerId: data.ownerId,
      share: data.share,
      isPrimary: data.isPrimary ?? false,
    },
    tx
  );

  await createPropertyHistory(
    {
      propertyId: data.propertyId,
      action: PropertyHistoryAction.OWNERSHIP_CHANGED,
      field: "propertyOwner",
      performedBy: data.performedBy ?? null,
      newValue: JSON.stringify({
        ownerId: data.ownerId,
        share: data.share,
        isPrimary: data.isPrimary ?? false,
      }),
      reason: "افزودن مالک به ملک",
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
          action: "OWNER_PROPERTY_RELATION_CREATED",
          targetType: "OWNER_PROPERTY",
          targetId: data.ownerId,
          details: {
            propertyId: data.propertyId,
            ownerId: data.ownerId,
            share: data.share,
            isPrimary: data.isPrimary ?? false,
            reason: "Added property ownership relation by Hashti staff",
          },
        },
      });
    }
  }

  return propertyOwner;
});
}