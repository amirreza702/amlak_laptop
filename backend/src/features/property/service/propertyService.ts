
/**
 * ============================================================
 * Property Service
 * ============================================================
 *
 * منطق Business مربوط به Property در این Service قرار دارد.
 *
 * ============================================================
 * جریان ثبت ملک توسط Agent
 * ============================================================
 *
 * Agent
 *   ↓
 * بررسی وجود مشاور
 *   ↓
 * بررسی وجود ملک
 *   ↓
 * ایجاد ملک در صورت جدید بودن
 *   ↓
 * ثبت ارتباط Agent و Property
 *
 * نکته:
 * registrationSource برای این Use Case همیشه AGENT است.
 * ============================================================
 */

import {
  PropertyHistoryAction,
  RegistrationSource,
} from "@prisma/client";

import { findAgentById } from "../../agent/repository/agentRepository";
import { createPropertyOwner } from "../repository/propertyOwnerRepository";
import type { PropertyOwner } from "@prisma/client";

import {
  createProperty,
  findPropertyByPostalCode,
  findPropertyById,
  updateProperty,
} from "../repository/propertyRepository";



import type {
  Property,
  PropertyWithListing,
} from "../types/property";

import type { PropertyAgent } from "../types/propertyAgent";

import type { RegisterPropertyInput } from "../types/registerProperty";

import { createPropertyHistory } from "../repository/propertyHistoryRepository";

import type { UpdatePropertyInput } from "../types/updateProperty";

import { prisma } from "../../../lib/prisma";

/**
 * ============================================================
 * RegisterPropertyResult
 * ============================================================
 *
 * خروجی Use Case ثبت ملک.
 */
export interface RegisterPropertyResult {
  property: Property;
  propertyAgent?: PropertyAgent;
  propertyOwner?: PropertyOwner;
  isNewProperty: boolean;
}

export async function registerProperty(
  data: RegisterPropertyInput
): Promise<RegisterPropertyResult> {
  // هویت ثبت‌کننده باید دقیقاً یک پروفایل معتبر داشته باشد.
  const isAgentRegistration = Boolean(data.agentId);
  const isOwnerRegistration = Boolean(data.ownerId);

  if (isAgentRegistration === isOwnerRegistration) {
    throw new Error("اطلاعات ثبت‌کننده معتبر نیست.");
  }

  if (isAgentRegistration) {
    const agent = await findAgentById(data.agentId!);
    if (!agent) {
      throw new Error("مشاور مورد نظر پیدا نشد.");
    }
  } else {
    const owner = await prisma.owner.findUnique({
      where: { id: data.ownerId! },
      select: { id: true },
    });
    if (!owner) {
      throw new Error("مالک مورد نظر پیدا نشد.");
    }
  }

  const existingProperty = data.postalCode
    ? await findPropertyByPostalCode(data.postalCode)
    : null;

  // مالک نباید ناخواسته به ملک موجودی که ممکن است متعلق به شخص دیگری باشد متصل شود.
  // اتصال مالکیت برای ملک موجود باید از فرایند بررسی/تأیید مالکیت عبور کند.
  if (isOwnerRegistration && existingProperty) {
    throw new Error(
      "ملکی با این کد پستی قبلاً ثبت شده است؛ برای اتصال و تأیید مالکیت از فرایند بررسی هشتی استفاده کنید."
    );
  }

  const isNewProperty = !existingProperty;

  return prisma.$transaction(async (tx) => {
    let property: Property;

    if (existingProperty) {
      property = existingProperty;
    } else {
      property = await createProperty(
        {
          registrationSource: isOwnerRegistration
            ? RegistrationSource.OWNER
            : RegistrationSource.AGENT,
          propertyType: data.propertyType,
          city: data.city,
          district: data.district,
          address: data.address,
          latitudeExact: data.latitudeExact,
          longitudeExact: data.longitudeExact,
          postalCode: data.postalCode ?? null,
          area: data.area ?? null,
          rooms: data.rooms ?? null,
          floor: data.floor ?? null,
          isActive: true,
        },
        tx
      );

      await createPropertyHistory(
        {
          propertyId: property.id,
          action: PropertyHistoryAction.CREATED,
          reason: isOwnerRegistration
            ? "ایجاد ملک توسط مالک"
            : "ایجاد ملک جدید توسط مشاور",
        },
        tx
      );
    }

    if (isOwnerRegistration) {
      // مالکیت ادعاشده با وضعیت PENDING ذخیره می‌شود و تأیید نهایی جداگانه است.
      const propertyOwner = await createPropertyOwner(
        {
          propertyId: property.id,
          ownerId: data.ownerId!,
          share: 6,
          isPrimary: true,
        },
        tx
      );

      await createPropertyHistory(
        {
          propertyId: property.id,
          action: PropertyHistoryAction.OWNERSHIP_CHANGED,
          field: "propertyOwner",
          newValue: JSON.stringify({
            ownerId: data.ownerId,
            share: 6,
            isPrimary: true,
            verificationStatus: "PENDING",
          }),
          reason: "ثبت ادعای مالکیت توسط مالک؛ نیازمند تأیید هشتی",
        },
        tx
      );

      return { property, propertyOwner, isNewProperty };
    }

    const existingAgent = await tx.propertyAgent.findUnique({
      where: {
        propertyId_agentId: {
          propertyId: property.id,
          agentId: data.agentId!,
        },
      },
    });

    if (existingAgent) {
      if (existingAgent.status === "REVOKED") {
        const propertyAgent = await tx.propertyAgent.update({
          where: {
            propertyId_agentId: {
              propertyId: property.id,
              agentId: data.agentId!,
            },
          },
          data: {
            status: "ACTIVE",
            approvedByOwner: false,
            approvedAt: null,
          },
        });

        return { property, propertyAgent, isNewProperty };
      }

      throw new Error("این مشاور قبلاً این ملک را ثبت کرده است.");
    }

    const hasAgents = (await tx.propertyAgent.count({
      where: { propertyId: property.id },
    })) > 0;

    const propertyAgent = await tx.propertyAgent.create({
      data: {
        propertyId: property.id,
        agentId: data.agentId!,
        isFirstRegistrant: !hasAgents,
      },
    });

    return { property, propertyAgent, isNewProperty };
  });
}

export async function getPropertyById(
  id: string
): Promise<PropertyWithListing> {
  /**
   * دریافت ملک به همراه Listing فعلی.
   */
  const property = await findPropertyById(id);

  /**
   * اگر ملک وجود نداشته باشد،
   * خطای Business ایجاد می‌کنیم.
   */
  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  /**
   * Property به همراه Listing را برمی‌گردانیم.
   */
  return property;
}

/**
 * ============================================================
 * updatePropertyService
 * ============================================================
 *
 * ویرایش اطلاعات پایه Property.
 *
 * جریان:
 *
 * دریافت Property
 *      ↓
 * بررسی وجود ملک
 *      ↓
 * Update اطلاعات
 *      ↓
 * ثبت UPDATED در PropertyHistory
 */

export async function updatePropertyService(
  propertyId: string,
  data: UpdatePropertyInput
): Promise<Property> {
  /**
   * ============================================================
   * 1. بررسی وجود Property
   * ============================================================
   */
  const property = await findPropertyById(propertyId);

  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  /**
   * ============================================================
   * 2. تشخیص تغییر موقعیت
   * ============================================================
   */
  const locationChanged =
    (data.latitudeExact !== undefined &&
      data.latitudeExact !== property.latitudeExact) ||
    (data.longitudeExact !== undefined &&
      data.longitudeExact !== property.longitudeExact) ||
    (data.latitudePublic !== undefined &&
      data.latitudePublic !== property.latitudePublic) ||
    (data.longitudePublic !== undefined &&
      data.longitudePublic !== property.longitudePublic);

  /**
   * ============================================================
   * 3. عملیات اتمیک
   * ============================================================
   *
   * Update Property
   *      +
   * History UPDATED
   *      +
   * در صورت تغییر موقعیت:
   * History LOCATION_CHANGED
   *
   * همه در یک Transaction.
   */
  return prisma.$transaction(async (tx) => {
    /**
     * ----------------------------------------------------------
     * Update Property
     * ----------------------------------------------------------
     */
    const updatedProperty = await updateProperty(
      propertyId,
      data,
      tx
    );

    /**
     * ----------------------------------------------------------
     * ثبت History مربوط به ویرایش
     * ----------------------------------------------------------
     */
    await createPropertyHistory(
      {
        propertyId,
        action: PropertyHistoryAction.UPDATED,
        reason: "ویرایش اطلاعات ملک",
      },
      tx
    );

    /**
     * ----------------------------------------------------------
     * ثبت History تغییر موقعیت
     * ----------------------------------------------------------
     */
    if (locationChanged) {
      await createPropertyHistory(
        {
          propertyId,
          action: PropertyHistoryAction.LOCATION_CHANGED,
          field: "location",
          oldValue: JSON.stringify({
            latitudeExact: property.latitudeExact,
            longitudeExact: property.longitudeExact,
            latitudePublic: property.latitudePublic,
            longitudePublic: property.longitudePublic,
          }),
          newValue: JSON.stringify({
            latitudeExact: updatedProperty.latitudeExact,
            longitudeExact: updatedProperty.longitudeExact,
            latitudePublic: updatedProperty.latitudePublic,
            longitudePublic: updatedProperty.longitudePublic,
          }),
          reason: "تغییر موقعیت ملک",
        },
        tx
      );
    }

    return updatedProperty;
  });
}

