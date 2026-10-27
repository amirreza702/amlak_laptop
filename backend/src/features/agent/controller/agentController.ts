
/**
 * Agent Controller
 *
 * مسئول دریافت درخواست HTTP و ارسال پاسخ.
 */

import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  getAgentProfile,
  getCurrentAgentProfile,
  updateAgentProfile,
} from "../service/agentService";

type AgentRouteParams = {
  agentId: string;
};

function getAuthenticatedUserId(req: Request): string | undefined {
  return (req as AuthenticatedRequest).user?.id;
}

/**
 * دریافت پروفایل مشاور از روی نشست جاری.
 * برای حساب‌هایی که شناسه پروفایلشان قبلاً در مرورگر ذخیره نشده است.
 */
export async function getCurrentAgentProfileController(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const result = await getCurrentAgentProfile(userId);
    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "AGENT_PROFILE_NOT_FOUND") {
      return res.status(404).json({ message: "Agent profile not found" });
    }

    console.error("Error getting current agent profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * دریافت پروفایل مشاور.
 */
export async function getAgentProfileController(
  req: Request<AgentRouteParams>,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const result = await getAgentProfile(
      req.params.agentId,
      userId
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "مشاور مورد نظر پیدا نشد.") {
        return res.status(404).json({
          message: error.message,
        });
      }

      if (error.message === "AGENT_PROFILE_FORBIDDEN") {
        return res.status(403).json({
          message: "You do not have permission to access this profile",
        });
      }
    }

    console.error("Error getting agent profile:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * ویرایش پروفایل مشاور.
 */
export async function updateAgentProfileController(
  req: Request<AgentRouteParams>,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const result = await updateAgentProfile(
      req.params.agentId,
      userId,
      req.body
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "مشاور مورد نظر پیدا نشد.") {
        return res.status(404).json({
          message: error.message,
        });
      }

      if (error.message === "AGENT_PROFILE_FORBIDDEN") {
        return res.status(403).json({
          message: "You do not have permission to edit this profile",
        });
      }

      if (
        error.message === "نام مشاور نمی‌تواند خالی باشد." ||
        error.message === "نام خانوادگی مشاور نمی‌تواند خالی باشد." ||
        error.message === "حداقل یک فیلد برای ویرایش ارسال کنید."
      ) {
        return res.status(400).json({
          message: error.message,
        });
      }
    }

    console.error("Error updating agent profile:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
