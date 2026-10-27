
/**
 * Agent Repository
 *
 * مسئول ارتباط مستقیم با دیتابیس.
 */

import { prisma } from "../../../lib/prisma";

/**
 * دریافت شناسه مالک پروفایل مشاور.
 *
 * userId شناسه حساب User است، نه Agent.id.
 */
export const findAgentById = async (agentId: string) => {
  return prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      userId: true,
    },
  });
};

/**
 * دریافت پروفایل حساب جاری از روی شناسه User نشست.
 * برای ورودهای قدیمی که profileId در sessionStorage ندارند.
 */
export const findAgentProfileByUserId = async (userId: string) => {
  return prisma.agent.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      agencyName: true,
      address: true,
      isVerified: true,
      verificationStatus: true,
      verificationReviewedAt: true,
      verificationNotes: true,
      user: { select: { mobile: true } },
    },
  });
};

/**
 * دریافت پروفایل مشاور همراه با userId
 * برای بررسی مالکیت در Service.
 */
export const findAgentProfileById = async (id: string) => {
  return prisma.agent.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      agencyName: true,
      address: true,
      isVerified: true,
      verificationStatus: true,
      verificationReviewedAt: true,
      verificationNotes: true,
      user: {
        select: {
          mobile: true,
        },
      },
    },
  });
};

/**
 * ویرایش پروفایل.
 *
 * userId و isVerified از طریق این تابع قابل تغییر نیستند.
 * پاسخ نیز فقط فیلدهای مجاز پروفایل را برمی‌گرداند.
 */
export const updateAgentProfile = async (
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    agencyName?: string | null;
    address?: string | null;
  }
) => {
  return prisma.agent.update({
    where: { id },
    data,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      agencyName: true,
      address: true,
      isVerified: true,
      verificationStatus: true,
      verificationReviewedAt: true,
      verificationNotes: true,
    },
  });
};
