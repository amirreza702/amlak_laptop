import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  addPropertyToFavoritesController,
  removePropertyFromFavoritesController,
  isPropertyFavoriteController,
  getCustomerFavoritesController,
  addAgentToFavoritesController,
  removeAgentFromFavoritesController,
  getCustomerFavoriteAgentsController,
} from "../controller/customerPropertyFavoriteController";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireOwnProfile } from "../../auth/middleware/authorizationMiddleware";

const router = Router();

router.post(
  "/customers/:customerId/favorite-agents/:agentId",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  addAgentToFavoritesController
);
router.delete(
  "/customers/:customerId/favorite-agents/:agentId",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  removeAgentFromFavoritesController
);
router.get(
  "/customers/:customerId/favorite-agents",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  getCustomerFavoriteAgentsController
);

router.post(
  "/customers/:customerId/favorites/:propertyId",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  addPropertyToFavoritesController
);
router.delete(
  "/customers/:customerId/favorites/:propertyId",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  removePropertyFromFavoritesController
);
router.get(
  "/customers/:customerId/favorites/:propertyId",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  isPropertyFavoriteController
);
router.get(
  "/customers/:customerId/favorites",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  getCustomerFavoritesController
);

export default router;
