/**
 * ============================================================
 * Customer Property Favorite Service
 * ============================================================
 *
 * منطق Business مربوط به علاقه‌مندی مشتری به ملک.
 *
 * جریان:
 *
 * Controller
 *     ↓
 * Favorite Service
 *     ↓
 * ┌───────────────────────────────┐
 * │ Customer Repository           │
 * │ Property Repository           │
 * │ Favorite Repository           │
 * └───────────────────────────────┘
 *     ↓
 * Prisma
 *
 * ============================================================
 */

import { findCustomerById } from "../../customer/repository/customerRepository";
import { findPropertyById } from "../../property/repository/propertyRepository";

import {
  createCustomerPropertyFavorite,
  deleteCustomerPropertyFavorite,
  findCustomerPropertyFavorite,
  findCustomerPropertyFavorites,
} from "../repository/customerPropertyFavoriteRepository";

/**
 * افزودن ملک به علاقه‌مندی مشتری
 */
export async function addPropertyToFavoritesService(
  customerId: string,
  propertyId: string
) {
  if (!customerId) {
    throw new Error("شناسه مشتری الزامی است.");
  }

  if (!propertyId) {
    throw new Error("شناسه ملک الزامی است.");
  }

  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new Error("مشتری مورد نظر پیدا نشد.");
  }

  const property = await findPropertyById(propertyId);

  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  const existingFavorite =
    await findCustomerPropertyFavorite(
      customerId,
      propertyId
    );

  if (existingFavorite) {
    throw new Error(
      "این ملک قبلاً به علاقه‌مندی‌ها اضافه شده است."
    );
  }

  return createCustomerPropertyFavorite({
    customer: {
      connect: {
        id: customerId,
      },
    },
    property: {
      connect: {
        id: propertyId,
      },
    },
  });
}

/**
 * حذف ملک از علاقه‌مندی مشتری
 */
export async function removePropertyFromFavoritesService(
  customerId: string,
  propertyId: string
) {
  if (!customerId) {
    throw new Error("شناسه مشتری الزامی است.");
  }

  if (!propertyId) {
    throw new Error("شناسه ملک الزامی است.");
  }

  const favorite =
    await findCustomerPropertyFavorite(
      customerId,
      propertyId
    );

  if (!favorite) {
    throw new Error(
      "این ملک در علاقه‌مندی‌های مشتری وجود ندارد."
    );
  }

  return deleteCustomerPropertyFavorite(
    customerId,
    propertyId
  );
}

/**
 * بررسی علاقه‌مندی یک ملک توسط مشتری
 */
export async function isPropertyFavoriteService(
  customerId: string,
  propertyId: string
) {
  if (!customerId) {
    throw new Error("شناسه مشتری الزامی است.");
  }

  if (!propertyId) {
    throw new Error("شناسه ملک الزامی است.");
  }

  const favorite =
    await findCustomerPropertyFavorite(
      customerId,
      propertyId
    );

  return Boolean(favorite);
}

/**
 * دریافت علاقه‌مندی‌های مشتری
 */
export async function getCustomerFavoritesService(
  customerId: string
) {
  if (!customerId) {
    throw new Error("شناسه مشتری الزامی است.");
  }

  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new Error("مشتری مورد نظر پیدا نشد.");
  }

  return findCustomerPropertyFavorites(customerId);
}