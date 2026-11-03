import { Router } from "express";
import { UserRole } from "@prisma/client";
import { createEvaluationController } from "../controller/evaluationController";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireVerifiedAgent } from "../../auth/middleware/verifiedAgentMiddleware";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

const router = Router();

// evaluatorUserId از نشست استخراج می‌شود؛ Client اجازه جعل ارزیاب را ندارد.
router.post(
  "/evaluations",
  authMiddleware,
  requireRole(UserRole.CUSTOMER, UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI),
  requireVerifiedAgent,
  (req, res, next) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return res.status(401).json({ message: "Authentication required" });
    req.body = { ...(req.body ?? {}), evaluatorUserId: user.id };
    return next();
  },
  createEvaluationController
);

export default router;
