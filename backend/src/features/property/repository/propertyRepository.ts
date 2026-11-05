
import { prisma } from "../../../lib/prisma";

import type {
  Property,
  PropertyWithListing,
} from "../types/property";

import  { Prisma } from "@prisma/client";

/**
 * ============================================================
 * DatabaseClient
 * ============================================================
 *
 * نوع Client دیتابیس.
 *
 * می‌تواند:
 *
 * 1. Prisma Client معمولی باشد
 * 2. Transaction Client باشد
 *
 * این امکان باعث می‌شود Repository
 * هم به‌صورت مستقل و هم داخل Transaction
 * قابل استفاده باشد.
 */
type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * ============================================================
 * findPropertyByPostalCode
 * ============================================================
 *
 * پیدا کردن ملک بر اساس کد پستی.
 */
export const findPropertyByPostalCode = async (
  postalCode: string
): Promise<Property | null> => {
  return prisma.property.findFirst({
    where: {
      postalCode,
      isActive: true,
      deletedAt: null,
    },
  });
};

/**
 * ============================================================
 * findPropertyById
 * ============================================================
 *
 * پیدا کردن ملک بر اساس شناسه.
 *
 * اطلاعات Listing نیز همراه ملک دریافت می‌شود.
 */
export const findPropertyById = async (
  id: string
): Promise<PropertyWithListing | null> => {
  return prisma.property.findUnique({
    where: {
      id,
    },
    include: {
      listing: true,
    },
  });
};

/** حداقل Context لازم برای تصمیم‌گیری مرکزی درباره تغییر وضعیت آگهی. */
export const findPropertyAuthorizationContextById = async (
  id: string,
  db: DatabaseClient = prisma,
) => {
  return db.property.findUnique({
    where: { id },
    select: {
      id: true,
      isActive: true,
      registrationSource: true,
      createdByUserId: true,
      deletedAt: true,
      listing: { select: { status: true, confirmUntil: true } },
      owners: {
        select: {
          ownerId: true,
          owner: { select: { userId: true } },
        },
      },
      agents: {
        where: { status: "ACTIVE" },
        select: {
          agentId: true,
          status: true,
          approvedByOwner: true,
          approvedByOwnerId: true,
          agent: { select: { userId: true } },
        },
      },
    },
  });
};

/** جزئیات ملک همراه روابط لازم برای اعمال محرمانگی مالک و مشاور تأییدشده. */
export const findPropertyByIdWithContacts = async (id: string) => {
  return prisma.property.findUnique({
    where: { id },
    include: {
      listing: true,
      owners: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          ownerId: true,
          isPrimary: true,
          owner: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              user: { select: { mobile: true } },
            },
          },
        },
      },
      agents: {
        where: { status: "ACTIVE" },
        select: {
          agentId: true,
          status: true,
          approvedByOwner: true,
          approvedByOwnerId: true,
          isFirstRegistrant: true,
          agent: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              user: { select: { mobile: true } },
            },
          },
        },
      },
      createdByUser: {
        select: {
          mobile: true,
          agent: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
};

/**
 * ============================================================
 * createProperty
 * ============================================================
 *
 * ایجاد ملک.
 *
 * پارامتر db به‌صورت پیش‌فرض Prisma Client است،
 * اما در صورت نیاز می‌توان Transaction Client
 * را به آن ارسال کرد.
 *
 * بنابراین:
 *
 * createProperty(data)
 *
 * یا:
 *
 * createProperty(data, tx)
 *
 * هر دو امکان‌پذیر هستند.
 */
export const createProperty = async (
  data: Parameters<
    typeof prisma.property.create
  >[0]["data"],
  db: DatabaseClient = prisma
): Promise<Property> => {
  return db.property.create({
    data,
  });
};

/**
 * ============================================================
 * findAllProperties
 * ============================================================
 *
 * دریافت تمام ملک‌ها.
 *
 * جدیدترین ملک‌ها ابتدا برگردانده می‌شوند.
 */
export const findAllProperties = async (): Promise<
  Property[]
> => {
  return prisma.property.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};


 /**
 * ============================================================
 * findPropertiesWithinRadius
 * ============================================================
 *
 * پیدا کردن ملک‌های نزدیک به یک مختصات مشخص.
 *
 * این تابع علاوه بر خود Property،
 * فاصله واقعی آن تا نقطه اصلی را نیز برمی‌گرداند.
 *
 * Database Logic:
 *   PostgreSQL + Haversine
 *
 * خروجی:
 *
 * {
 *   property: Property,
 *   distanceMeters: number
 * }
 * ============================================================
 */

export const findPropertiesWithinRadius = async (
  latitude: number,
  longitude: number,
  radiusMeters: number,
  excludePropertyId?: string
): Promise<
  {
    property: Property;
    distanceMeters: number;
  }[]
> => {
  const rows = await prisma.$queryRaw<
    (Property & {
      distanceMeters: number;
    })[]
  >`
    SELECT
      p.*,

      (
        6371000 * 2 * ASIN(
          SQRT(
            POWER(
              SIN(
                RADIANS(
                  p."latitudeExact" - ${latitude}
                ) / 2
              ),
              2
            )
            +
            COS(RADIANS(${latitude}))
            *
            COS(RADIANS(p."latitudeExact"))
            *
            POWER(
              SIN(
                RADIANS(
                  p."longitudeExact" - ${longitude}
                ) / 2
              ),
              2
            )
          )
        )
      ) AS "distanceMeters"

    FROM "properties" p

    WHERE
      p."latitudeExact" IS NOT NULL
      AND p."longitudeExact" IS NOT NULL
      AND p."isActive" = TRUE
      AND p."deletedAt" IS NULL

      ${
        excludePropertyId
          ? Prisma.sql`
              AND p."id" <> ${excludePropertyId}
            `
          : Prisma.empty
      }

      AND (
        6371000 * 2 * ASIN(
          SQRT(
            POWER(
              SIN(
                RADIANS(
                  p."latitudeExact" - ${latitude}
                ) / 2
              ),
              2
            )
            +
            COS(RADIANS(${latitude}))
            *
            COS(RADIANS(p."latitudeExact"))
            *
            POWER(
              SIN(
                RADIANS(
                  p."longitudeExact" - ${longitude}
                ) / 2
              ),
              2
            )
          )
        )
      ) <= ${radiusMeters}

    ORDER BY
      "distanceMeters" ASC
  `;

  return rows.map((row) => ({
    property: row,
    distanceMeters: Number(row.distanceMeters),
  }));
};

/** 
 * ============================================================
 * updateProperty
 * ============================================================
 *
 * به‌روزرسانی اطلاعات ملک.
 *
 * پارامتر db به‌صورت پیش‌فرض Prisma Client است،
 * اما در صورت نیاز می‌توان Transaction Client
 * را به آن ارسال کرد.
 */
export const updateProperty = async (
  id: string,
  data: Parameters<
    typeof prisma.property.update
  >[0]["data"],
  db: DatabaseClient = prisma
): Promise<Property> => {
  return db.property.update({
    where: {
      id,
    },
    data,
  });
};

/**
 * ============================================================
 * findExpiredProperties
 * ============================================================
 *
 * پیدا کردن ملک‌هایی که مهلت تأیید آنها گذشته است.
 *
 * شرایط:
 *
 * confirmUntil <= now
 *
 * و:
 *
 * Listing باید هنوز PUBLISHED باشد.
 *
 * این تابع بعداً توسط سرویس انقضا و Job
 * برای پیدا کردن ملک‌های منقضی‌شده استفاده می‌شود.
 */
export const findExpiredProperties = async (
  now: Date = new Date(),
  propertyId?: string,
  force = false
) => {
  return prisma.property.findMany({
    where: {
      ...(propertyId ? { id: propertyId } : {}),
      isActive: true,
      deletedAt: null,
      listing: {
        is: {
          status: "PUBLISHED",
          ...(force ? {} : { confirmUntil: { lte: now } }),
        },
      },
    },
    include: {
      listing: true,
      agents: {
        where: { status: "ACTIVE", approvedByOwner: true },
        select: { agent: { select: { userId: true } } },
      },
    },
    orderBy: { listing: { confirmUntil: "asc" } },
  });
};
