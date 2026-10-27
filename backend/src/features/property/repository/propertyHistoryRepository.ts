import { prisma } from "../../../lib/prisma";

import type {
  Prisma,
  PropertyHistory,
} from "@prisma/client";

type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * ثبت یک رویداد در تاریخچه ملک.
 *
 * Repository فقط مسئول ارتباط با دیتابیس است
 * و هیچ Business Logic ندارد.
 */
export const createPropertyHistory = async (
  data: Parameters<
    typeof prisma.propertyHistory.create
  >[0]["data"],
  db: DatabaseClient = prisma
): Promise<PropertyHistory> => {
  return db.propertyHistory.create({
    data,
  });
};
