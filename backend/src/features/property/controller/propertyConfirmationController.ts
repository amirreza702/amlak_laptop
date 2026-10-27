import { Request, Response } from "express";

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
  try {
    const result =
      await checkPropertyConfirmation(
        req.params.id
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