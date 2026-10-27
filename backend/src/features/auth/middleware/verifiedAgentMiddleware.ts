import type { NextFunction, Request, Response } from "express";

import { prisma } from "../../../lib/prisma";
import type { AuthenticatedRequest } from "./authMiddleware";

/**
 * Blocks unverified agents from operational endpoints.
 *
 * Owners and Hashti staff pass through unchanged. The agent identity is
 * always derived from the authenticated session, never from a URL/body ID.
 */
export async function requireVerifiedAgent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return res.status(401).json({
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required",
    });
  }

  // This guard is shared by routes that also serve owners and Hashti staff.
  if (user.role !== "AGENT") {
    return next();
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        isVerified: true,
        verificationStatus: true,
      },
    });

    if (!agent) {
      return res.status(403).json({
        code: "AGENT_PROFILE_REQUIRED",
        message: "An agent profile is required before using this feature",
      });
    }

    // هر دو فیلد هم‌زمان حفظ شده‌اند؛ Boolean قدیمی نباید وضعیت ردشده را دور بزند.
    if (!agent.isVerified || agent.verificationStatus !== "VERIFIED") {
      return res.status(403).json({
        code: "AGENT_NOT_VERIFIED",
        message: "Your agent account must be verified by Hashti before using this feature",
      });
    }

    return next();
  } catch (error) {
    console.error("Agent verification authorization failed:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
