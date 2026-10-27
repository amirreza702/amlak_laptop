/**
 * ============================================================
 * Property Types
 * ============================================================
 */

import type { Prisma } from "@prisma/client";

/**
 * موجودیت اصلی Property بدون relation
 */
export type Property = Prisma.PropertyGetPayload<{}>;

/**
 * Property به همراه Listing فعلی
 */
export type PropertyWithListing =
  Prisma.PropertyGetPayload<{
    include: {
      listing: true;
    };
  }>;