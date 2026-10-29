import { prisma } from "../../../lib/prisma";
import { PropertyHistoryAction } from "@prisma/client";

/**
 * Soft-delete a property owned by the authenticated owner.
 * Related records and audit history are preserved.
 */
export async function deleteOwnPropertyService(propertyId: string, userId: string) {
  const ownership = await prisma.propertyOwner.findFirst({
    where: { propertyId, owner: { userId } },
    select: { propertyId: true, ownerId: true },
  });
  if (!ownership) throw new Error("PROPERTY_NOT_OWNED_BY_USER");

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, isActive: true },
  });
  if (!property) throw new Error("PROPERTY_NOT_FOUND");
  if (!property.isActive) throw new Error("PROPERTY_ALREADY_DELETED");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.property.update({
      where: { id: propertyId },
      data: { isActive: false },
    });
    await tx.propertyHistory.create({
      data: {
        propertyId,
        action: PropertyHistoryAction.OTHER,
        field: "isActive",
        oldValue: "true",
        newValue: "false",
        performedBy: userId,
        reason: "مالک ملک را از فهرست فعال خود حذف کرد؛ داده‌های وابسته حفظ شدند.",
      },
    });
    return updated;
  });
}


/** مشاور فقط می‌تواند ملک ثبت‌شده توسط خودش را غیرفعال کند؛ تاریخچه حفظ می‌شود. */
export async function deleteAgentManagedOwnerPropertyService(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, isActive: true, registrationSource: true, createdByUserId: true },
  });
  if (!property) throw new Error("PROPERTY_NOT_FOUND");
  if (property.registrationSource !== "AGENT" || property.createdByUserId !== userId) {
    throw new Error("PROPERTY_NOT_REGISTERED_BY_AGENT");
  }

  const relation = await prisma.propertyAgent.findFirst({
    where: { propertyId, status: "ACTIVE", agent: { is: { userId } } },
    select: { propertyId: true },
  });
  if (!relation) throw new Error("PROPERTY_AGENT_RELATION_NOT_FOUND");
  if (!property.isActive) throw new Error("PROPERTY_ALREADY_DELETED");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.property.update({ where: { id: propertyId }, data: { isActive: false } });
    await tx.propertyHistory.create({
      data: {
        propertyId,
        action: PropertyHistoryAction.OTHER,
        field: "isActive",
        oldValue: "true",
        newValue: "false",
        performedBy: userId,
        reason: "مشاور ثبت‌کننده، ملک خود را از فهرست فعال خارج کرد؛ سوابق حفظ شدند.",
      },
    });
    return updated;
  });
}
