
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

import type { PropertyCreator, RegisterPropertyInput } from "../types/registerProperty";

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
  data: RegisterPropertyInput,
  creator: PropertyCreator
): Promise<RegisterPropertyResult> {
  // نقش از سشن می‌آید؛ شناسه پروفایل ارسالی به سرویس باید با همان حساب منطبق باشد.
  if (creator.role !== "OWNER" && creator.role !== "AGENT") {
    throw new Error("نقش ثبت‌کننده معتبر نیست.");
  }

  if (!Number.isFinite(data.area) || data.area == null || data.area <= 0) {
    throw new Error("متراژ ملک باید بیشتر از صفر باشد.");
  }
  if (!Number.isInteger(data.rooms) || data.rooms == null || data.rooms < 0) {
    throw new Error("تعداد اتاق باید یک عدد صحیح معتبر باشد.");
  }
  if (!Number.isInteger(data.floor) || data.floor == null) {
    throw new Error("طبقه ملک الزامی است.");
  }
  if (!Number.isInteger(data.totalUnits) || data.totalUnits == null || data.totalUnits < 1) {
    throw new Error("تعداد کل واحدها باید حداقل یک باشد.");
  }
  if (!data.documentType || !data.ownershipType || !data.landTenure) {
    throw new Error("نوع سند، نوع مالکیت و وضعیت عرصه الزامی هستند.");
  }

  const isAgentRegistration = creator.role === "AGENT";
  const isOwnerRegistration = creator.role === "OWNER";

  if (
    (isAgentRegistration && (!data.agentId || Boolean(data.ownerId))) ||
    (isOwnerRegistration && (!data.ownerId || Boolean(data.agentId)))
  ) {
    throw new Error("اطلاعات ثبت‌کننده با نشست کاربر مطابقت ندارد.");
  }

  if (isAgentRegistration) {
    const agent = await findAgentById(data.agentId!);
    if (!agent || agent.userId !== creator.id) {
      throw new Error("مشاور مورد نظر با حساب واردشده مطابقت ندارد.");
    }
  } else {
    const owner = await prisma.owner.findFirst({
      where: { id: data.ownerId!, userId: creator.id },
      select: { id: true },
    });
    if (!owner) {
      throw new Error("مالک مورد نظر با حساب واردشده مطابقت ندارد.");
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
          createdByUserId: creator.id,
          createdByRole: creator.role,
          creatorMobile: creator.mobile,
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
          yearBuilt: data.yearBuilt ?? null,
          unitNumber: data.unitNumber ?? null,
          totalUnits: data.totalUnits ?? null,
          parkingCount: data.parkingCount ?? null,
          parkingType: data.parkingType ?? null,
          parkingNumber: data.parkingNumber ?? null,
          hasElevator: data.hasElevator ?? null,
          hasStorage: data.hasStorage ?? null,
          hasBalcony: data.hasBalcony ?? null,
          hasYard: data.hasYard ?? null,
          heatingSystem: data.heatingSystem ?? null,
          coolingSystem: data.coolingSystem ?? null,
          documentType: data.documentType ?? null,
          ownershipType: data.ownershipType ?? null,
          landTenure: data.landTenure ?? null,
          description: data.description ?? null,
          renovationStatus: data.renovationStatus ?? null,
          renovationYear: data.renovationYear ?? null,
          occupancyStatus: data.occupancyStatus,
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

  // اعتبارسنجی سمت سرور؛ اعتبارسنجی مرورگر به‌تنهایی قابل اتکا نیست.
  const has = (key: keyof UpdatePropertyInput) => Object.prototype.hasOwnProperty.call(data, key);
  if (has("city") && !data.city?.trim()) throw new Error("شهر الزامی است.");
  if (has("district") && !data.district?.trim()) throw new Error("محله یا منطقه الزامی است.");
  if (has("address") && !data.address?.trim()) throw new Error("نشانی ملک الزامی است.");
  if (has("latitudeExact") && (!Number.isFinite(data.latitudeExact) || data.latitudeExact! < -90 || data.latitudeExact! > 90)) throw new Error("عرض جغرافیایی معتبر نیست.");
  if (has("longitudeExact") && (!Number.isFinite(data.longitudeExact) || data.longitudeExact! < -180 || data.longitudeExact! > 180)) throw new Error("طول جغرافیایی معتبر نیست.");
  if (has("area") && (data.area == null || !Number.isFinite(data.area) || data.area <= 0)) throw new Error("متراژ باید بیشتر از صفر باشد.");
  if (has("rooms") && (data.rooms == null || !Number.isInteger(data.rooms) || data.rooms < 0)) throw new Error("تعداد اتاق باید عدد صحیح نامنفی باشد.");
  if (has("floor") && (data.floor == null || !Number.isInteger(data.floor))) throw new Error("طبقه باید عدد صحیح باشد.");
  if (has("totalUnits") && (data.totalUnits == null || !Number.isInteger(data.totalUnits) || data.totalUnits < 1)) throw new Error("تعداد کل واحدها باید حداقل یک باشد.");
  if (has("yearBuilt") && data.yearBuilt != null && (!Number.isInteger(data.yearBuilt) || data.yearBuilt < 0 || data.yearBuilt > new Date().getFullYear() + 1)) throw new Error("سال ساخت معتبر نیست.");
  if (has("parkingCount") && data.parkingCount != null && (!Number.isInteger(data.parkingCount) || data.parkingCount < 0)) throw new Error("تعداد پارکینگ معتبر نیست.");
  if (has("renovationYear") && data.renovationYear != null && (!Number.isInteger(data.renovationYear) || data.renovationYear < 0 || data.renovationYear > new Date().getFullYear() + 1)) throw new Error("سال بازسازی معتبر نیست.");
  if (has("documentType") && !data.documentType) throw new Error("نوع سند الزامی است.");
  if (has("ownershipType") && !data.ownershipType) throw new Error("نوع مالکیت الزامی است.");
  if (has("landTenure") && !data.landTenure) throw new Error("وضعیت عرصه الزامی است.");
  if (has("description") && (data.description?.length ?? 0) > 10000) throw new Error("توضیحات بیش از حد مجاز طولانی است.");

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

