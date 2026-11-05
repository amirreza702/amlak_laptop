import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { findPropertyAuthorizationContextById } from "../../property/repository/propertyRepository";
import { authorizePropertyAction } from "../../property/service/propertyAuthorizationService";
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

type FavoriteActor = AuthorizationActor;
type Tx = Prisma.TransactionClient;

async function requireCustomerFavoriteAccess(
  tx: Tx,
  customerId: string,
  actor: FavoriteActor,
  action: "READ" | "UPDATE",
) {
  const [user, customer] = await Promise.all([
    tx.user.findUnique({ where: { id: actor.id }, select: { id: true, role: true, isActive: true } }),
    tx.customer.findUnique({ where: { id: customerId }, select: { id: true, userId: true } }),
  ]);
  if (!user || user.isActive !== true || user.role !== "CUSTOMER" ||
      actor.role !== "CUSTOMER" || !customer || customer.userId !== user.id) {
    throw new Error("FAVORITE_ACCESS_FORBIDDEN");
  }
  const freshActor = { id: user.id, role: user.role, isActive: user.isActive };
  const allowed = await authorize("customer", action, {
    actor: freshActor,
    resource: { id: customer.id, data: { isSelf: customer.userId === user.id } },
  });
  if (!allowed) throw new Error("FAVORITE_ACCESS_FORBIDDEN");
  return { customer, actor: freshActor };
}

/** افزودن ملک به علاقه‌مندی؛ مالکیت مشتری، وضعیت انتشار و درج در یک تراکنش بررسی می‌شوند. */
export async function addPropertyToFavoritesService(customerId: string, propertyId: string, actor: FavoriteActor) {
  if (!customerId || !propertyId) throw new Error("شناسه مشتری و ملک الزامی است.");
  return prisma.$transaction(async (tx) => {
    const access = await requireCustomerFavoriteAccess(tx, customerId, actor, "UPDATE");
    const property = await findPropertyAuthorizationContextById(propertyId, tx);
    if (!property) throw new Error("ملک مورد نظر پیدا نشد.");
    const canFavorite = await authorizePropertyAction(access.actor, "FAVORITE", property);
    if (!canFavorite) throw new Error("این ملک در حال حاضر برای علاقه‌مندی قابل دسترسی نیست.");
    if (await findCustomerPropertyFavorite(customerId, propertyId, tx)) {
      throw new Error("این ملک قبلاً به علاقه‌مندی‌ها اضافه شده است.");
    }
    return createCustomerPropertyFavorite({
      customer: { connect: { id: customerId } },
      property: { connect: { id: propertyId } },
    }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** حذف علاقه‌مندی ملک؛ شناسه مشتری از نشست احراز و در تراکنش دوباره بررسی می‌شود. */
export async function removePropertyFromFavoritesService(customerId: string, propertyId: string, actor: FavoriteActor) {
  if (!customerId || !propertyId) throw new Error("شناسه مشتری و ملک الزامی است.");
  return prisma.$transaction(async (tx) => {
    await requireCustomerFavoriteAccess(tx, customerId, actor, "UPDATE");
    const favorite = await findCustomerPropertyFavorite(customerId, propertyId, tx);
    if (!favorite) throw new Error("این ملک در علاقه‌مندی‌های مشتری وجود ندارد.");
    return deleteCustomerPropertyFavorite(customerId, propertyId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** بررسی علاقه‌مندی یک ملک توسط مشتری. */
export async function isPropertyFavoriteService(customerId: string, propertyId: string, actor: FavoriteActor) {
  if (!customerId || !propertyId) throw new Error("شناسه مشتری و ملک الزامی است.");
  return prisma.$transaction(async (tx) => {
    const access = await requireCustomerFavoriteAccess(tx, customerId, actor, "READ");
    const property = await findPropertyAuthorizationContextById(propertyId, tx);
    if (!property || !(await authorizePropertyAction(access.actor, "FAVORITE", property))) return false;
    return Boolean(await findCustomerPropertyFavorite(customerId, propertyId, tx));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** دریافت علاقه‌مندی‌های ملک مشتری جاری. */
export async function getCustomerFavoritesService(customerId: string, actor: FavoriteActor) {
  if (!customerId) throw new Error("شناسه مشتری الزامی است.");
  return prisma.$transaction(async (tx) => {
    await requireCustomerFavoriteAccess(tx, customerId, actor, "READ");
    return findCustomerPropertyFavorites(customerId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** جست‌وجوی مشاوران فعال و تأییدشده برای علاقه‌مندی مشتری. */
export async function searchAgentsForCustomerFavoritesService(customerId: string, rawQuery: string, actor: FavoriteActor) {
  if (!customerId) throw new Error("شناسه مشتری الزامی است.");
  const query = rawQuery.trim();
  if (query.length < 2) throw new Error("برای جست‌وجوی مشاور حداقل دو نویسه وارد کنید.");
  return prisma.$transaction(async (tx) => {
    await requireCustomerFavoriteAccess(tx, customerId, actor, "READ");
    return searchAgentsForCustomerFavorites(customerId, query, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** افزودن مشاور به علاقه‌مندی؛ تأیید و فعال‌بودن مشاور در Policy مرکزی بررسی می‌شود. */
export async function addAgentToFavoritesService(customerId: string, agentId: string, actor: FavoriteActor) {
  if (!customerId || !agentId) throw new Error("شناسه مشتری و مشاور الزامی است.");
  return prisma.$transaction(async (tx) => {
    const access = await requireCustomerFavoriteAccess(tx, customerId, actor, "UPDATE");
    const agent = await tx.agent.findUnique({
      where: { id: agentId },
      select: { id: true, userId: true, verificationStatus: true, user: { select: { isActive: true } } },
    });
    if (!agent) throw new Error("مشاور مورد نظر پیدا نشد.");
    const agentCanBeFavorited = await authorize("agent", "FAVORITE", {
      actor: access.actor,
      resource: { id: agent.id, data: { isVerified: agent.verificationStatus === "VERIFIED", isActive: agent.user.isActive } },
    });
    if (!agentCanBeFavorited) throw new Error("فقط مشاور فعال و تأییدشده را می‌توان به علاقه‌مندی اضافه کرد.");
    if (agent.userId === access.customer.userId) throw new Error("امکان افزودن حساب خودتان به علاقه‌مندی وجود ندارد.");
    if (await findCustomerAgentFavorite(customerId, agentId, tx)) throw new Error("این مشاور قبلاً به علاقه‌مندی‌ها اضافه شده است.");
    return createCustomerAgentFavorite(customerId, agentId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** حذف مشاور از علاقه‌مندی مشتری. */
export async function removeAgentFromFavoritesService(customerId: string, agentId: string, actor: FavoriteActor) {
  if (!customerId || !agentId) throw new Error("شناسه مشتری و مشاور الزامی است.");
  return prisma.$transaction(async (tx) => {
    await requireCustomerFavoriteAccess(tx, customerId, actor, "UPDATE");
    if (!(await findCustomerAgentFavorite(customerId, agentId, tx))) throw new Error("این مشاور در علاقه‌مندی‌های مشتری وجود ندارد.");
    return deleteCustomerAgentFavorite(customerId, agentId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** دریافت مشاوران علاقه‌مندی‌شده مشتری. */
export async function getCustomerFavoriteAgentsService(customerId: string, actor: FavoriteActor) {
  if (!customerId) throw new Error("شناسه مشتری الزامی است.");
  return prisma.$transaction(async (tx) => {
    await requireCustomerFavoriteAccess(tx, customerId, actor, "READ");
    return findCustomerAgentFavorites(customerId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
