
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
  findPropertyByIdWithContacts,
  findPropertyAuthorizationContextById,
  updateProperty,
} from "../repository/propertyRepository";



import type { Property } from "../types/property";

import type { PropertyAgent } from "../types/propertyAgent";

import type { PropertyCreator, RegisterPropertyInput } from "../types/registerProperty";

import { createPropertyHistory } from "../repository/propertyHistoryRepository";

import type { UpdatePropertyInput } from "../types/updateProperty";

import { prisma } from "../../../lib/prisma";
import { getPublicCoordinates } from "../../../lib/publicCoordinates";
import { updatePropertyListing } from "../repository/propertyListingRepository";
import { queuePropertyListingForHashtiReview } from "./propertyListingStatusService";
import { authorizePropertyAction, getPropertyVisibility, projectPropertyForActor } from "./propertyAuthorizationService";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { authorize } from "../../../shared/authorization/authorization.core";
import { requireAdminServicePermission } from "../../admin/service/adminService";

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
  const registrationAllowed = await authorize("property", "REGISTER", {
    actor: creator,
    resource: { data: { isDeleted: false, isActive: true } },
  });
  if (!registrationAllowed) throw new Error("ثبت ملک برای این حساب مجاز نیست.");

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
    if (agent.verificationStatus !== "VERIFIED") {
      throw new Error("AGENT_VERIFICATION_REQUIRED");
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

  // مالک نمی‌تواند ملک موجود را دوباره ثبت کند.
  if (isOwnerRegistration && existingProperty) {
    throw new Error(
      "ملکی با این کد پستی قبلاً ثبت شده است؛ برای جلوگیری از ثبت ملک تکراری، اطلاعات آن را بررسی کنید."
    );
  }

  // ملک مالک‌محور فقط از مسیر درخواست همکاری قابل اتصال به مشاور است.
  if (isAgentRegistration && existingProperty?.registrationSource === RegistrationSource.OWNER) {
    throw new Error("این ملک توسط مالک ثبت شده است؛ برای همکاری باید از مسیر درخواست همکاری مالک اقدام کنید.");
  }

  // ثبت‌کننده دیگری نمی‌تواند با کد پستی به رابطه ملک متصل شود؛ اطلاعات عمومی آن در فهرست املاک قابل مشاهده است.
  if (isAgentRegistration && existingProperty && existingProperty.createdByUserId !== creator.id) {
    throw new Error("این ملک قبلاً توسط مشاور دیگری ثبت شده است و امکان ثبت مجدد آن وجود ندارد.");
  }

  const isNewProperty = !existingProperty;

  const result = await prisma.$transaction(async (tx) => {
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
          }),
          reason: "ثبت رابطه مالک و ملک از نشست احراز هویت‌شده مالک",
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
      if (existingAgent.status === "ACTIVE" && property.createdByUserId === creator.id) {
        return { property, propertyAgent: existingAgent, isNewProperty };
      }
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
            approvedByOwnerId: null,
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
  // نتیجه ثبت نیز باید از همان تصمیم و Projection مرکزی عبور کند؛
  // به‌ویژه وقتی مشاور به‌واسطه کد پستی به ملک موجود دیگری متصل می‌شود.
  const safeProperty = await getPropertyDetailsForActor(result.property.id, creator);
  return { ...result, property: safeProperty as Property };
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
 * ساخت پاسخ جزئیات ملک بر اساس تصمیم‌های Authorization Core.
 * Controller فقط نتیجه این Use Case را به HTTP response تبدیل می‌کند.
 */
export async function getPropertyDetailsForActor(id: string, actor: AuthorizationActor) {
  if (actor.role === "HASHTI") await requireAdminServicePermission(actor.id, "PROPERTIES_MANAGE");
  const property = await getPropertyById(id);
  const canReadPrivate = await authorizePropertyAction(actor, "READ_PRIVATE", property);
  if (!canReadPrivate) throw new Error("PROPERTY_ACCESS_FORBIDDEN");
  const visibility = await getPropertyVisibility(actor, property);
  if (actor.role === "HASHTI" && visibility.canViewExactLocation && visibility.canViewOwnerDetails) {
    return property;
  }
  const owners = property.owners ?? [];
  const agents = property.agents ?? [];

  const ownOwner = owners.find((relation) => relation.owner.userId === actor.id) ?? null;
  const approvedAgent = agents.find((relation) =>
    relation.status === "ACTIVE" &&
    relation.approvedByOwner &&
    relation.agent.userId === actor.id
  ) ?? null;
  const approvedOwnerRelation = approvedAgent?.approvedByOwnerId
    ? owners.find((relation) => relation.ownerId === approvedAgent.approvedByOwnerId) ?? null
    : null;
  const isApprovedAgent = Boolean(
    approvedAgent &&
    approvedOwnerRelation &&
    visibility.canViewOwnerDetails
  );

  const primaryOwner = owners.find((relation) => relation.isPrimary) ?? owners[0] ?? null;
  const visibleOwner = actor.role === "OWNER"
    ? (visibility.canViewOwnerDetails ? ownOwner : null)
    : isApprovedAgent
      ? approvedOwnerRelation
      : visibility.canViewOwnerDetails
        ? primaryOwner
        : null;

  const {
    owners: _owners,
    agents: _agents,
    createdByUser,
    creatorMobile: _creatorMobile,
    createdByUserId: _createdByUserId,
    ...baseProperty
  } = property;

  const visibleApprovedAgent = property.registrationSource === "OWNER"
    ? approvedAgent?.agent ?? null
    : null;
  const creatorIsVerifiedAndActive = createdByUser?.isActive === true &&
    createdByUser.agent?.verificationStatus === "VERIFIED";
  const registrant = property.registrationSource === "AGENT" && creatorIsVerifiedAndActive
    ? createdByUser?.agent ?? null
    : null;

  const ownerDetails = actor.role === "OWNER"
    ? ownOwner?.owner
    : isApprovedAgent
      ? approvedOwnerRelation?.owner
      : visibleOwner?.owner;

  const safeProperty = projectPropertyForActor(baseProperty, visibility, {
    owner: ownerDetails ? {
      firstName: ownerDetails.firstName,
      lastName: ownerDetails.lastName,
      mobile: ownerDetails.user.mobile,
    } : null,
    exposeCreatorContact: visibility.canViewRegistrantDetails && creatorIsVerifiedAndActive,
    creatorMobile: creatorIsVerifiedAndActive ? createdByUser?.mobile ?? null : null,
  });

  return {
    ...safeProperty,
    registrantFirstName: visibility.canViewRegistrantDetails && creatorIsVerifiedAndActive ? registrant?.firstName ?? null : null,
    registrantLastName: visibility.canViewRegistrantDetails && creatorIsVerifiedAndActive ? registrant?.lastName ?? null : null,
    registrantMobile: visibility.canViewRegistrantDetails && creatorIsVerifiedAndActive && property.registrationSource === "AGENT"
      ? createdByUser?.mobile ?? null
      : null,
    approvedAgentFirstName: visibility.canViewOwnerDetails ? visibleApprovedAgent?.firstName ?? null : null,
    approvedAgentLastName: visibility.canViewOwnerDetails ? visibleApprovedAgent?.lastName ?? null : null,
    approvedAgentMobile: visibility.canViewOwnerDetails ? visibleApprovedAgent?.user.mobile ?? null : null,
  };
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
  data: UpdatePropertyInput,
  actor: AuthorizationActor
) {
  if (actor.role === "HASHTI") await requireAdminServicePermission(actor.id, "PROPERTIES_MANAGE");
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
      data.longitudeExact !== property.longitudeExact);

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
  await prisma.$transaction(async (tx) => {
    const authorizationContext = await findPropertyAuthorizationContextById(propertyId, tx);
    if (!authorizationContext) throw new Error("ملک مورد نظر پیدا نشد.");
    const allowed = await authorizePropertyAction(actor, "MANAGE", authorizationContext);
    if (!allowed) throw new Error("شما اجازه ویرایش این ملک را ندارید.");

    /**
     * ----------------------------------------------------------
     * Update Property
     * ----------------------------------------------------------
     */
    const updateData: UpdatePropertyInput = { ...data };
    const updatedProperty = await updateProperty(
      propertyId,
      updateData,
      tx
    );

    // مختصات عمومی متعلق به همین آگهی است؛ فقط با تغییر مختصات دقیق ملک بازتولید می‌شود.
    const previousListing = locationChanged
      ? await tx.propertyListing.findUnique({ where: { propertyId } })
      : null;
    const publicCoordinates = previousListing
      ? getPublicCoordinates(
          previousListing.id,
          updatedProperty.latitudeExact,
          updatedProperty.longitudeExact
        )
      : null;
    const updatedListing = previousListing && publicCoordinates
      ? await updatePropertyListing(
          previousListing.id,
          {
            latitudePublic: publicCoordinates.latitude,
            longitudePublic: publicCoordinates.longitude,
          },
          tx
        )
      : null;

    // انتشار قبلی تا بررسی مجدد هشتی متوقف می‌شود؛ تأیید مالک/مشاور مستقل باقی می‌ماند.
    await queuePropertyListingForHashtiReview(propertyId, tx);

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
            latitudePublic: property.listing?.latitudePublic ?? null,
            longitudePublic: property.listing?.longitudePublic ?? null,
          }),
          newValue: JSON.stringify({
            latitudeExact: updatedProperty.latitudeExact,
            longitudeExact: updatedProperty.longitudeExact,
            latitudePublic: updatedListing?.latitudePublic ?? null,
            longitudePublic: updatedListing?.longitudePublic ?? null,
          }),
          reason: "تغییر موقعیت ملک",
        },
        tx
      );
    }

    return updatedProperty;
  }, { isolationLevel: "Serializable" });

  // پاسخ ویرایش از همان projection مجاز جزئیات ملک عبور می‌کند؛ خروجی خام Prisma افشا نمی‌شود.
  return getPropertyDetailsForActor(propertyId, actor);
}

