import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { writeAdminAuditLogBestEffort } from "../../hashti/service/adminAuditLogService";

import {
  createAgentSubscriptionService,
  upgradeAgentSubscriptionService,
  getActiveSubscriptionPlansService,
  getAgentCurrentSubscriptionService,
  getAgentContactUsageService,
} from "../service/agentSubscriptionService";
import {
  createManagedAgentSubscriptionService,
  upgradeManagedAgentSubscriptionService,
} from "../../hashti/service/agentSubscriptionManagementService";

/**
 * ایجاد Subscription
 */
export const createAgentSubscriptionController = async (
  req: Request,
  res: Response
) => {
  try {
    const agentId =
      req.params.agentId as string;

    const {
      planId,
      startsAt,
      expiresAt,
    } = req.body;

    if (!agentId) {
      return res.status(400).json({
        message: "agentId is required",
      });
    }

    if (
      !planId ||
      !startsAt
    ) {
      return res.status(400).json({
        message:
          "planId and startsAt are required",
      });
    }

    const parsedStartsAt = new Date(startsAt);
    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
    if (
      typeof startsAt !== "string" ||
      Number.isNaN(parsedStartsAt.getTime()) ||
      (expiresAt !== undefined &&
        (typeof expiresAt !== "string" || !parsedExpiresAt || Number.isNaN(parsedExpiresAt.getTime())))
    ) {
      return res.status(400).json({ message: "Invalid subscription dates" });
    }

    const hashtiActor = (req as AuthenticatedRequest).user;
    if (hashtiActor?.role === UserRole.HASHTI) {
      const subscription = await createManagedAgentSubscriptionService({
        agentId,
        planId,
        startsAt: parsedStartsAt,
        expiresAt: parsedExpiresAt,
        actorUserId: hashtiActor.id,
        actorMobile: hashtiActor.mobile,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(201).json(subscription);
    }

    const subscription =
      await createAgentSubscriptionService(
        agentId,
        planId,
        parsedStartsAt,
        parsedExpiresAt
      );

    const actor = (req as AuthenticatedRequest).user;
    if (actor?.role === UserRole.HASHTI) {
      await writeAdminAuditLogBestEffort({
        actorUserId: actor.id,
        actorMobile: actor.mobile,
        actorRole: UserRole.HASHTI,
        action: "AGENT_SUBSCRIPTION_CREATED",
        targetType: "AGENT",
        targetId: agentId,
        details: {
          subscriptionId: subscription.id,
          planId: subscription.planId,
          planCode: subscription.subscriptionPlan.code,
          planName: subscription.subscriptionPlan.name,
          startsAt: subscription.startsAt.toISOString(),
          expiresAt: subscription.expiresAt?.toISOString() ?? null,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    return res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof Error && error.message === "Agent not found") {
      return res.status(404).json({ message: error.message });
    }

    if (
      error instanceof Error &&
      error.message ===
        "Agent already has an active subscription"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "Subscription plan not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "Subscription plan is not active"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "Subscription expiration cannot be before start"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Error creating agent subscription:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * ارتقای Subscription
 */
export const upgradeAgentSubscriptionController = async (
  req: Request,
  res: Response
) => {
  try {
    const agentId =
      req.params.agentId as string;

    const {
      planId,
    } = req.body;

    if (!agentId) {
      return res.status(400).json({
        message: "agentId is required",
      });
    }

    if (!planId) {
      return res.status(400).json({
        message: "planId is required",
      });
    }

    const hashtiActor = (req as AuthenticatedRequest).user;
    if (hashtiActor?.role === UserRole.HASHTI) {
      const subscription = await upgradeManagedAgentSubscriptionService({
        agentId,
        planId,
        actorUserId: hashtiActor.id,
        actorMobile: hashtiActor.mobile,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(200).json(subscription);
    }

    const subscription =
      await upgradeAgentSubscriptionService(
        agentId,
        planId
      );

    const actor = (req as AuthenticatedRequest).user;
    if (actor?.role === UserRole.HASHTI) {
      await writeAdminAuditLogBestEffort({
        actorUserId: actor.id,
        actorMobile: actor.mobile,
        actorRole: UserRole.HASHTI,
        action: "AGENT_SUBSCRIPTION_UPGRADED",
        targetType: "AGENT",
        targetId: agentId,
        details: {
          subscriptionId: subscription.id,
          newPlanId: subscription.planId,
          newPlanCode: subscription.subscriptionPlan.code,
          newPlanName: subscription.subscriptionPlan.name,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    return res.status(200).json(subscription);
  } catch (error) {
    if (error instanceof Error && error.message === "Agent not found") {
      return res.status(404).json({ message: error.message });
    }

    if (
      error instanceof Error &&
      error.message ===
        "Active subscription not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "Subscription plan not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "Subscription plan is not active"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "New subscription plan must be higher than current plan"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Error upgrading agent subscription:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * GET /subscription-plans
 * فهرست پلن‌های فعال و اطلاعات لازم برای مقایسه آن‌ها.
 */
export const getSubscriptionPlansController = async (
  _req: Request,
  res: Response
) => {
  try {
    const plans = await getActiveSubscriptionPlansService();
    return res.status(200).json({ plans });
  } catch (error) {
    console.error("Error getting subscription plans:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /agents/:agentId/subscriptions/current
 * اشتراک فعال مشاور واردشده؛ اگر اشتراکی فعال نباشد، مقدار null است.
 */
export const getAgentCurrentSubscriptionController = async (
  req: Request,
  res: Response
) => {
  try {
    const subscription = await getAgentCurrentSubscriptionService(
      req.params.agentId as string
    );
    return res.status(200).json({ subscription });
  } catch (error) {
    console.error("Error getting agent subscription:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /agents/:agentId/subscriptions/usage
 * میزان مصرف سهمیه دسترسی به اطلاعات تماس در ماه UTC جاری.
 */
export const getAgentContactUsageController = async (
  req: Request,
  res: Response
) => {
  try {
    const usage = await getAgentContactUsageService(
      req.params.agentId as string
    );
    return res.status(200).json({ usage });
  } catch (error) {
    console.error("Error getting agent contact usage:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
