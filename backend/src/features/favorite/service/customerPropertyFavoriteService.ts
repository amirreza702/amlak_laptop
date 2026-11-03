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
import { findAgentById } from "../../agent/repository/agentRepository";
import { findPropertyById } from "../../property/repository/propertyRepository";

import {
  createCustomerPropertyFavorite,
  deleteCustomerPropertyFavorite,
  findCustomerPropertyFavorite,
  findCustomerPropertyFavorites,
  createCustomerAgentFavorite,
  findCustomerAgentFavorite,
  deleteCustomerAgentFavorite,
  findCustomerAgentFavorites,
  searchAgentsForCustomerFavorites,
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

/** جست‌وجوی مشاوران قابل افزودن به علاقه‌مندی مشتری */
export async function searchAgentsForCustomerFavoritesService(customerId: string, rawQuery: string) {
  if (!customerId) throw new Error("شناسه مشتری الزامی است.");
  const customer = await findCustomerById(customerId);
  if (!customer) throw new Error("مشتری مورد نظر پیدا نشد.");
  const query = rawQuery.trim();
  if (query.length < 2) throw new Error("برای جست‌وجوی مشاور حداقل دو نویسه وارد کنید.");
  return searchAgentsForCustomerFavorites(customerId, query);
}


/** افزودن مشاور به علاقه‌مندی مشتری */
export async function addAgentToFavoritesService(customerId: string, agentId: string) {
  if (!customerId || !agentId) throw new Error("شناسه مشتری و مشاور الزامی است.");
  const customer = await findCustomerById(customerId);
  if (!customer) throw new Error("مشتری مورد نظر پیدا نشد.");
  const agent = await findAgentById(agentId);
  if (!agent) throw new Error("مشاور مورد نظر پیدا نشد.");
  if (agent.userId === customer.userId) throw new Error("امکان افزودن حساب خودتان به علاقه‌مندی وجود ندارد.");
  if (await findCustomerAgentFavorite(customerId, agentId)) throw new Error("این مشاور قبلاً به علاقه‌مندی‌ها اضافه شده است.");
  return createCustomerAgentFavorite(customerId, agentId);
}

/** حذف مشاور از علاقه‌مندی مشتری */
export async function removeAgentFromFavoritesService(customerId: string, agentId: string) {
  if (!customerId || !agentId) throw new Error("شناسه مشتری و مشاور الزامی است.");
  if (!(await findCustomerAgentFavorite(customerId, agentId))) throw new Error("این مشاور در علاقه‌مندی‌های مشتری وجود ندارد.");
  return deleteCustomerAgentFavorite(customerId, agentId);
}

/** دریافت مشاوران علاقه‌مندی‌شده مشتری */
export async function getCustomerFavoriteAgentsService(customerId: string) {
  const customer = await findCustomerById(customerId);
  if (!customer) throw new Error("مشتری مورد نظر پیدا نشد.");
  return findCustomerAgentFavorites(customerId);
}
