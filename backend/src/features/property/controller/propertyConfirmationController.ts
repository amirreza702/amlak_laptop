import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  checkPropertyConfirmation,
} from "../service/propertyConfirmationService";

/**
 * بررسی وضعیت اعتبار تأیید ملک
 */
export async function checkPropertyConfirmationController(
  req: Request<{ id: string }>,
  res: Response
) {
  const actor = (req as AuthenticatedRequest).user;
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  try {
    const result =
      await checkPropertyConfirmation(
        req.params.id,
        actor
      );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(404).json({
      message:
        error.message ||
        "خطا در بررسی اعتبار ملک",
    });
  }
}