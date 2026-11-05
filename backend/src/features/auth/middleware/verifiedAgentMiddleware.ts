import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthenticatedRequest } from "./authMiddleware";

/** Verified-agent operational access is decided by the shared agent Policy. */
export async function requireVerifiedAgent(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return res.status(401).json({ code: "AUTHENTICATION_REQUIRED", message: "Authentication required" });

  // Routes may intentionally allow owners or Hashti staff as well as agents.
  if (user.role !== "AGENT") return next();

  try {
    const agent = await prisma.agent.findUnique({
      where: { userId: user.id },
      select: { id: true, verificationStatus: true },
    });
    if (!agent) {
      return res.status(403).json({ code: "AGENT_PROFILE_REQUIRED", message: "An agent profile is required before using this feature" });
    }

    const allowed = await authorize("agent", "OPERATE", {
      actor: { id: user.id, role: user.role, isActive: user.isActive },
      resource: { id: agent.id, data: { isVerified: agent.verificationStatus === "VERIFIED" } },
    });
    if (!allowed) {
      return res.status(403).json({ code: "AGENT_NOT_VERIFIED", message: "Your agent account must be verified by Hashti before using this feature" });
    }
    return next();
  } catch (error) {
    console.error("Agent verification authorization failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
