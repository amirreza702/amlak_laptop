import { MediaType } from "@prisma/client";

import {
  createPropertyMedia,
  findPropertyMedia,
} from "../repository/propertyMediaRepository";

import { findPropertyById } from "../repository/propertyRepository";

import type { PropertyMedia } from "@prisma/client";

/**
 * ============================================================
 * Create Property Media Service
 * ============================================================
 *
 * ثبت یک رسانه برای ملک.
 *
 * مسئولیت Service:
 * 1. بررسی وجود ملک
 * 2. بررسی اطلاعات Business
 * 3. فراخوانی Repository
 *
 * ارتباط:
 *
 * Controller
 *      ↓
 *    Service
 *      ↓
 *   Repository
 *      ↓
 *      DB
 */

export interface CreatePropertyMediaInput {
  propertyId: string;
  type: MediaType;
  url: string;
  sortOrder?: number;
}

export const createPropertyMediaService = async (
  data: CreatePropertyMediaInput
): Promise<PropertyMedia> => {
  /**
   * ----------------------------------------------------------
   * 1. بررسی وجود ملک
   * ----------------------------------------------------------
   */

  const property = await findPropertyById(data.propertyId);

  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  /**
   * ----------------------------------------------------------
   * 2. بررسی URL
   * ----------------------------------------------------------
   *
   * فعلاً فقط خالی نبودن URL را بررسی می‌کنیم.
   * اعتبارسنجی واقعی فایل و Storage بعداً در لایه مناسب
   * اضافه خواهد شد.
   */

  if (!data.url || data.url.trim() === "") {
    throw new Error("آدرس رسانه الزامی است.");
  }

  /**
   * ----------------------------------------------------------
   * 3. بررسی sortOrder
   * ----------------------------------------------------------
   */

  if (data.sortOrder !== undefined && data.sortOrder < 0) {
    throw new Error("ترتیب نمایش رسانه نمی‌تواند منفی باشد.");
  }

  /**
   * ----------------------------------------------------------
   * 4. ثبت در Repository
   * ----------------------------------------------------------
   */

  return createPropertyMedia(
    data.propertyId,
    data.type,
    data.url,
    data.sortOrder ?? 0
  );
};

/**
 * ============================================================
 * Get Property Media Service
 * ============================================================
 *
 * دریافت رسانه‌های فعال یک ملک.
 */

export const getPropertyMediaService = async (
  propertyId: string
): Promise<PropertyMedia[]> => {
  /**
   * ابتدا بررسی می‌کنیم ملک وجود دارد.
   */

  const property = await findPropertyById(propertyId);

  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  /**
   * سپس رسانه‌های فعال ملک را دریافت می‌کنیم.
   */

  return findPropertyMedia(propertyId);
};