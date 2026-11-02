
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
  ListingStatus,
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
  findPropertyByIdWithContacts,
  updateProperty,
} from "../repository/propertyRepository";



import type { Property } from "../types/property";

import type { PropertyAgent } from "../types/propertyAgent";

import type { PropertyCreator, RegisterPropertyInput } from "../types/registerProperty";

import { createPropertyHistory } from "../repository/propertyHistoryRepository";

import type { UpdatePropertyInput } from "../types/updateProperty";

import { prisma } from "../../../lib/prisma";
import { findPropertyListingByPropertyId, updatePropertyListing } from "../repository/propertyListingRepository";

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
  if (data.rooms != null && (!Number.isInteger(data.rooms) || data.rooms < 0)) {
    throw new Error("تعداد اتاق باید یک عدد صحیح معتبر باشد.");
  }
  if (data.floor != null && !Number.isInteger(data.floor)) {
    throw new Error("طبقه باید عدد صحیح معتبر باشد.");
  }
  if (data.totalUnits != null && (!Number.isInteger(data.totalUnits) || data.totalUnits < 1)) {
    throw new Error("تعداد کل واحدها باید حداقل یک باشد.");
  }
  if (!data.city?.trim() || !data.address?.trim()) {
    throw new Error("شهر و نشانی ملک الزامی هستند.");
  }
  if (!Number.isFinite(data.latitudeExact) || data.latitudeExact < -90 || data.latitudeExact > 90 ||
      !Number.isFinite(data.longitudeExact) || data.longitudeExact < -180 || data.longitudeExact > 180) {
    throw new Error("موقعیت جغرافیایی ملک معتبر نیست.");
  }
  if (!data.documentType || !["SINGLE_SHEET", "OLD_DEED", "OFFICIAL_CONTRACT", "ORDINARY_CONTRACT"].includes(data.documentType)) {
    throw new Error("نوع سند معتبر و الزامی است.");
  }
  if (!data.ownershipType || !["SIX_DANG", "SHARED"].includes(data.ownershipType)) {
    throw new Error("نوع مالکیت معتبر و الزامی است.");
  }
  if (!data.landTenure || !["FREEHOLD", "ENDOWMENT"].includes(data.landTenure)) {
    throw new Error("وضعیت عرصه معتبر و الزامی است.");
  }
  if (data.yearBuilt != null && (!Number.isInteger(data.yearBuilt) || data.yearBuilt < 1300 || data.yearBuilt > 1500)) {
    throw new Error("سال ساخت باید بین ۱۳۰۰ تا ۱۵۰۰ باشد.");
  }
  if (data.renovationYear != null && (!Number.isInteger(data.renovationYear) || data.renovationYear < 1300 || data.renovationYear > 1500)) {
    throw new Error("سال بازسازی باید بین ۱۳۰۰ تا ۱۵۰۰ باشد.");
  }
  if (data.parkingCount != null && (!Number.isInteger(data.parkingCount) || data.parkingCount < 0)) {
    throw new Error("تعداد پارکینگ باید عدد صحیح نامنفی باشد.");
  }
  if (data.renovationStatus != null && !["NO_RENOVATION", "PARTIAL", "FULL"].includes(data.renovationStatus)) {
    throw new Error("وضعیت بازسازی معتبر نیست.");
  }
  if (!["VACANT", "OWNER_OCCUPIED", "TENANT_OCCUPIED"].includes(data.occupancyStatus ?? "VACANT")) {
    throw new Error("وضعیت سکونت معتبر نیست.");
  }
  if ((data.description?.length ?? 0) > 10000) throw new Error("توضیحات بیش از حد مجاز طولانی است.");

  if (creator.role === "AGENT") {
    if (typeof data.ownerFirstName !== "string" || !data.ownerFirstName.trim() || data.ownerFirstName.trim().length > 80) throw new Error("نام مالک الزامی است و حداکثر باید ۸۰ نویسه باشد.");
    if (typeof data.ownerLastName !== "string" || !data.ownerLastName.trim() || data.ownerLastName.trim().length > 100) throw new Error("نام خانوادگی مالک الزامی است و حداکثر باید ۱۰۰ نویسه باشد.");
    if (typeof data.ownerMobile !== "string" || !/^09\d{9}$/.test(data.ownerMobile.trim())) throw new Error("شماره همراه مالک باید یک شماره معتبر ۱۱ رقمی ایران باشد.");
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
      if (isAgentRegistration && existingProperty.createdByUserId === creator.id) {
        property = await updateProperty(existingProperty.id, {
          ...(!existingProperty.ownerMobile ? { ownerMobile: data.ownerMobile!.trim() } : {}),
          ...(!existingProperty.ownerFirstName ? { ownerFirstName: data.ownerFirstName!.trim() } : {}),
          ...(!existingProperty.ownerLastName ? { ownerLastName: data.ownerLastName!.trim() } : {}),
        }, tx);
      }
    } else {
      property = await createProperty(
        {
          registrationSource: isOwnerRegistration
            ? RegistrationSource.OWNER
            : RegistrationSource.AGENT,
          createdByUserId: creator.id,
          createdByRole: creator.role,
          creatorMobile: creator.mobile,
          ownerMobile: isOwnerRegistration ? creator.mobile : data.ownerMobile!.trim(),
          ownerFirstName: isAgentRegistration ? data.ownerFirstName!.trim() : null,
          ownerLastName: isAgentRegistration ? data.ownerLastName!.trim() : null,
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

export async function getPropertyById(id: string) {
  /**
   * دریافت ملک به همراه Listing و روابط هویتی لازم؛
   * فیلتر دسترسی و ساخت پاسخ امن در همین Use Case انجام می‌شود.
   */
  const property = await findPropertyByIdWithContacts(id);

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
  if (has("district") && typeof data.district !== "string") throw new Error("محله یا منطقه معتبر نیست.");
  if (has("address") && !data.address?.trim()) throw new Error("نشانی ملک الزامی است.");
  if (has("ownerMobile") && (typeof data.ownerMobile !== "string" || !/^09\d{9}$/.test(data.ownerMobile.trim()))) throw new Error("شماره همراه مالک معتبر نیست.");
  if (has("ownerFirstName") && (typeof data.ownerFirstName !== "string" || !data.ownerFirstName.trim() || data.ownerFirstName.trim().length > 80)) throw new Error("نام مالک معتبر نیست.");
  if (has("ownerLastName") && (typeof data.ownerLastName !== "string" || !data.ownerLastName.trim() || data.ownerLastName.trim().length > 100)) throw new Error("نام خانوادگی مالک معتبر نیست.");
  if (has("latitudeExact") && (data.latitudeExact == null || !Number.isFinite(data.latitudeExact) || data.latitudeExact < -90 || data.latitudeExact > 90)) throw new Error("عرض جغرافیایی معتبر نیست.");
  if (has("longitudeExact") && (data.longitudeExact == null || !Number.isFinite(data.longitudeExact) || data.longitudeExact < -180 || data.longitudeExact > 180)) throw new Error("طول جغرافیایی معتبر نیست.");
  if (has("area") && (data.area == null || !Number.isFinite(data.area) || data.area <= 0)) throw new Error("متراژ باید بیشتر از صفر باشد.");
  if (has("rooms") && data.rooms != null && (!Number.isInteger(data.rooms) || data.rooms < 0)) throw new Error("تعداد اتاق باید عدد صحیح نامنفی باشد.");
  if (has("floor") && data.floor != null && !Number.isInteger(data.floor)) throw new Error("طبقه باید عدد صحیح باشد.");
  if (has("totalUnits") && data.totalUnits != null && (!Number.isInteger(data.totalUnits) || data.totalUnits < 1)) throw new Error("تعداد کل واحدها باید حداقل یک باشد.");
  if (has("yearBuilt") && data.yearBuilt != null && (!Number.isInteger(data.yearBuilt) || data.yearBuilt < 1300 || data.yearBuilt > 1500)) throw new Error("سال ساخت معتبر نیست.");
  if (has("parkingCount") && data.parkingCount != null && (!Number.isInteger(data.parkingCount) || data.parkingCount < 0)) throw new Error("تعداد پارکینگ معتبر نیست.");
  if (has("renovationYear") && data.renovationYear != null && (!Number.isInteger(data.renovationYear) || data.renovationYear < 1300 || data.renovationYear > 1500)) throw new Error("سال بازسازی معتبر نیست.");
  if (has("documentType") && (!data.documentType || !["SINGLE_SHEET", "OLD_DEED", "OFFICIAL_CONTRACT", "ORDINARY_CONTRACT"].includes(data.documentType))) throw new Error("نوع سند معتبر و الزامی است.");
  if (has("ownershipType") && (!data.ownershipType || !["SIX_DANG", "SHARED"].includes(data.ownershipType))) throw new Error("نوع مالکیت معتبر و الزامی است.");
  if (has("landTenure") && (!data.landTenure || !["FREEHOLD", "ENDOWMENT"].includes(data.landTenure))) throw new Error("وضعیت عرصه معتبر و الزامی است.");
  if (has("renovationStatus") && data.renovationStatus != null && !["NO_RENOVATION", "PARTIAL", "FULL"].includes(data.renovationStatus)) throw new Error("وضعیت بازسازی معتبر نیست.");
  if (has("occupancyStatus") && !["VACANT", "OWNER_OCCUPIED", "TENANT_OCCUPIED"].includes(data.occupancyStatus ?? "")) throw new Error("وضعیت سکونت معتبر نیست.");
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

    // هر ویرایش اطلاعات ملک، انتشار قبلی را تا بررسی مجدد هشتی متوقف می‌کند.
    // وضعیت مالکیت و ارتباط مشاور مستقل می‌ماند و دست‌کاری نمی‌شود.
    const existingListing = await findPropertyListingByPropertyId(propertyId, tx);
    if (existingListing && existingListing.status !== ListingStatus.PENDING_HASHTI_VERIFICATION) {
      await updatePropertyListing(
        existingListing.id,
        { status: ListingStatus.PENDING_HASHTI_VERIFICATION },
        tx
      );
      await createPropertyHistory(
        {
          propertyId,
          action: PropertyHistoryAction.LISTING_CHANGED,
          field: "listing.status",
          oldValue: existingListing.status,
          newValue: ListingStatus.PENDING_HASHTI_VERIFICATION,
          reason: "ویرایش ملک؛ نیازمند بررسی مجدد هشتی پیش از انتشار",
        },
        tx
      );
    }

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

