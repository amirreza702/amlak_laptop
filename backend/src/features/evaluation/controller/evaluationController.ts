import { Request, Response } from "express";

import {
  createEvaluationService,
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
    const result =
      await createEvaluationService(req.body);

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