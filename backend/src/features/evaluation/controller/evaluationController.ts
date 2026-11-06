import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import type { EvaluationType } from "@prisma/client";

import {
  createEvaluationService,
  getEvaluationStatusService,
} from "../service/evaluationService";

/**
 * ============================================================
 * ایجاد Evaluation
 * ============================================================
 */
export async function createEvaluationController(
  req: Request,
  res: Response
) {
  try {
    const actor = (req as AuthenticatedRequest).user;
    if (!actor) return res.status(401).json({ message: "Authentication required" });
    const result = await createEvaluationService({
      ...req.body,
      // ارزیاب فقط از نشست احراز هویت‌شده تعیین می‌شود؛ مقدار ارسالی کلاینت قابل اعتماد نیست.
      evaluatorUserId: actor.id,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (
      error.message ===
      "Evaluator user not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (error.message === "Evaluation authorization denied") {
      return res.status(403).json({ message: "Evaluation access is not allowed" });
    }
    if (error.message === "AGENT_VERIFICATION_REQUIRED" || error.message === "ADMIN_PERMISSION_FORBIDDEN") {
      return res.status(403).json({ message: "You do not have permission to submit this evaluation" });
    }

    if (
      error.message ===
      "Evaluator user is inactive"
    ) {
      return res.status(403).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Evaluator role is not allowed for this evaluation type"
    ) {
      return res.status(403).json({
        message: error.message,
      });
    }

    if (
      error.message ===
        "Agent is required for this evaluation" ||
      error.message ===
        "Customer is required for this evaluation" ||
      error.message ===
        "Owner is required for this evaluation" ||
      error.message ===
        "Property is required for this evaluation" ||
      error.message ===
        "Score must be a number between 0 and 5 with up to 2 decimal places"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.message === "You have already evaluated this target") {
      return res.status(409).json({ message: error.message });
    }

    if (
      error.message === "Agent must be in customer favorites before evaluation" ||
      error.message === "Property must be in customer favorites before evaluation" ||
      error.message === "Agent is not the owner-approved agent for this property" ||
      error.message === "Agent can evaluate only properties they registered or were approved to represent"
    ) {
      return res.status(403).json({ message: error.message });
    }

    if (
      error.message ===
        "Evaluator customer not found" ||
      error.message ===
        "Evaluator owner not found" ||
      error.message ===
        "Evaluator agent not found" ||
      error.message ===
        "Evaluation target not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "User cannot evaluate themselves"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Unsupported evaluation type"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Error creating evaluation:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getEvaluationStatusController(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return res.status(401).json({ message: "Authentication required" });
  const type = typeof req.query.type === "string" ? req.query.type as EvaluationType : null;
  const agentId = typeof req.query.agentId === "string" ? req.query.agentId : undefined;
  const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId : undefined;
  if (!type || (!agentId && !propertyId)) {
    return res.status(400).json({ message: "Evaluation type and target are required" });
  }
  try {
    const evaluation = await getEvaluationStatusService(user.id, type, { agentId, propertyId });
    return res.status(200).json({ evaluated: Boolean(evaluation), evaluation });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Could not read evaluation status" });
  }
}
