/**
 * ============================================================
 * Customer Property Favorite Service
 * ============================================================
 *
 * منطق Business مربوط به علاقه‌مندی مشتری به ملک
 * در این Service قرار دارد.
 *
 * این Service مستقیماً با Prisma کار نمی‌کند.
 *
 * جریان:
 *
 * Customer
 *    ↓
 * Favorite Service
 *    ↓
 * Repositoryها
 *    ├── Customer Repository
 *    ├── Property Repository
 *    └── Favorite Repository
 *    ↓
 * Database
 *
 * ============================================================
 */

import { findCustomerById } from "../repository/customerRepository";

import {
  createCustomerPropertyFavorite,
  deleteCustomerPropertyFavorite,
  findCustomerPropertyFavorite,
  findCustomerPropertyFavorites,
} from "../repository/customerPropertyFavoriteRepository";

import { findPropertyById } from "../../property/repository/propertyRepository";

/**
 * ------------------------------------------------------------
 * افزودن ملک به علاقه‌مندی
 * ------------------------------------------------------------
 */
export const addPropertyToFavorite = async (
  customerId: string,
  propertyId: string
) => {
  /**
   * ----------------------------------------------------------
   * 1. بررسی وجود مشتری
   * ----------------------------------------------------------
   */
  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  /**
   * ----------------------------------------------------------
   * 2. بررسی وجود ملک
   * ----------------------------------------------------------
   */
  const property = await findPropertyById(propertyId);

  if (!property) {
    throw new Error("Property not found");
  }

  /**
   * ----------------------------------------------------------
   * 3. بررسی فعال بودن ملک
   * ----------------------------------------------------------
   */
  if (!property.isActive) {
    throw new Error("Property is not active");
  }

  /**
   * ----------------------------------------------------------
   * 4. بررسی تکراری نبودن علاقه‌مندی
   * ----------------------------------------------------------
   */
  const existingFavorite =
    await findCustomerPropertyFavorite(
      customerId,
      propertyId
    );

  if (existingFavorite) {
    throw new Error(
      "Property is already in favorites"
    );
  }

  /**
   * ----------------------------------------------------------
   * 5. ایجاد علاقه‌مندی
   * ----------------------------------------------------------
   */
  return createCustomerPropertyFavorite(
    customerId,
    propertyId
  );
};

/**
 * ------------------------------------------------------------
 * حذف ملک از علاقه‌مندی
 * ------------------------------------------------------------
 */
export const removePropertyFromFavorite = async (
  customerId: string,
  propertyId: string
) => {
  /**
   * بررسی وجود علاقه‌مندی
   */
  const favorite =
    await findCustomerPropertyFavorite(
      customerId,
      propertyId
    );

  if (!favorite) {
    throw new Error(
      "Property is not in favorites"
    );
  }

  /**
   * حذف علاقه‌مندی
   */
  return deleteCustomerPropertyFavorite(
    customerId,
    propertyId
  );
};

/**
 * ------------------------------------------------------------
 * دریافت علاقه‌مندی‌های مشتری
 * ------------------------------------------------------------
 */
export const getCustomerFavorites = async (
  customerId: string
) => {
  /**
   * بررسی وجود مشتری
   */
  const customer = await findCustomerById(
    customerId
  );

  if (!customer) {
    throw new Error("Customer not found");
  }

  /**
   * دریافت علاقه‌مندی‌ها
   */
  return findCustomerPropertyFavorites(
    customerId
  );
};