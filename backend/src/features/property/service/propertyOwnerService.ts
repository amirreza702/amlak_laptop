import { Prisma, PropertyHistoryAction } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { createPropertyOwner } from "../repository/propertyOwnerRepository";
import { createPropertyHistory } from "../repository/propertyHistoryRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";
import { requireAdminServicePermission } from "../../admin/service/adminService";

export interface AddPropertyOwnerInput {
  propertyId: string;
  ownerId: string;
  share: number;
  isPrimary?: boolean;
  performedBy?: string;
}

/** ایجاد رابطه مالکیت فقط توسط هشتی فعال و در یک تراکنش Serializable. */
export async function addPropertyOwner(data: AddPropertyOwnerInput) {
  if (data.performedBy) await requireAdminServicePermission(data.performedBy, "PROPERTIES_MANAGE");
  if (!Number.isFinite(data.share) || data.share <= 0 || data.share > 6) {
    throw new Error("سهم مالکیت باید بیشتر از صفر و حداکثر ۶ دانگ باشد.");
  }

  if (!data.performedBy) {
    throw new Error("فقط کاربر فعال هشتی مجاز به افزودن مالک به ملک است.");
  }

  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: data.performedBy! },
      select: { id: true, mobile: true, role: true, isActive: true },
    });
    if (!actor || actor.role !== "HASHTI" || actor.isActive !== true) {
      throw new Error("فقط کاربر فعال هشتی مجاز به افزودن مالک به ملک است.");
    }

    const authorizationContext = await findPropertyAuthorizationContextById(data.propertyId, tx);
    if (!authorizationContext || authorizationContext.deletedAt) {
      throw new Error("ملک مورد نظر پیدا نشد.");
    }
    const allowed = await authorizePropertyAction(actor, "ADD_OWNER_RELATION", authorizationContext);
    if (!allowed) throw new Error("افزودن رابطه مالکیت برای این ملک مجاز نیست.");

    const [property, owner, existingRelation, existingPrimary, existingOwners] = await Promise.all([
      tx.property.findUnique({
        where: { id: data.propertyId },
        select: { id: true, createdByUserId: true, city: true, district: true, address: true },
      }),
      tx.owner.findUnique({
        where: { id: data.ownerId },
        select: { id: true },
      }),
      tx.propertyOwner.findUnique({
        where: { propertyId_ownerId: { propertyId: data.propertyId, ownerId: data.ownerId } },
        select: { propertyId: true, ownerId: true },
      }),
      data.isPrimary
        ? tx.propertyOwner.findFirst({ where: { propertyId: data.propertyId, isPrimary: true }, select: { propertyId: true, ownerId: true } })
        : Promise.resolve(null),
      tx.propertyOwner.findMany({ where: { propertyId: data.propertyId }, select: { share: true } }),
    ]);

    if (!property) throw new Error("ملک مورد نظر پیدا نشد.");
    if (!owner) throw new Error("مالک مورد نظر پیدا نشد.");
    if (existingRelation) throw new Error("این مالک قبلاً به این ملک متصل شده است.");
    if (existingPrimary) throw new Error("این ملک قبلاً مالک اصلی دارد.");

    const currentTotalShare = existingOwners.reduce((total, relation) => total + relation.share, 0);
    if (currentTotalShare + data.share > 6) {
      throw new Error(`مجموع سهم مالکان نمی‌تواند بیشتر از ۶ دانگ باشد. مجموع فعلی: ${currentTotalShare} دانگ`);
    }

    const propertyOwner = await createPropertyOwner({
      propertyId: data.propertyId,
      ownerId: data.ownerId,
      share: data.share,
      isPrimary: data.isPrimary ?? false,
      addedByUserId: actor.id,
      addedByRole: actor.role,
      addedByMobile: actor.mobile,
    }, tx);

    await createPropertyHistory({
      propertyId: data.propertyId,
      action: PropertyHistoryAction.OWNERSHIP_CHANGED,
      field: "propertyOwner",
      performedBy: actor.id,
      newValue: JSON.stringify({
        ownerId: data.ownerId,
        share: data.share,
        isPrimary: data.isPrimary ?? false,
      }),
      reason: "افزودن مالک به ملک",
    }, tx);

    if (property.createdByUserId && property.createdByUserId !== actor.id) {
      // اعلان به ثبت‌کننده فقط رویداد را اطلاع می‌دهد؛ اطلاعات تماس و نشانی دقیق
      // مالک از مسیر اعلان افشا نمی‌شود و باید از مجوز جزئیات ملک عبور کند.
      await tx.notification.create({
        data: {
          userId: property.createdByUserId,
          title: "افزودن مالک به ملک",
          message: "هشتی یک مالک را به ملک ثبت‌شده شما متصل کرد.",
          details: {
            action: "HASHTI_ADDED_PROPERTY_OWNER",
            subjectType: "PROPERTY_OWNER",
            subject: `${property.city}، ${property.district}`,
            propertyId: property.id,
            actorRole: actor.role,
            occurredAt: new Date().toISOString(),
          },
        },
      });
    }

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

    return propertyOwner;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
