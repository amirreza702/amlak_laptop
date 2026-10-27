/**
 * Repository خواندن پروفایل مشتری از روی شناسه User نشست.
 * فقط فیلدهای لازم برای شناسه پروفایل و مشخصات محدود برگردانده می‌شود.
 */
import { prisma } from "../../../lib/prisma";

export async function findCustomerProfileByUserId(userId: string) {
  return prisma.customer.findUnique({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      user: {
        select: {
          mobile: true,
        },
      },
    },
  });
}
