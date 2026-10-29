import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { deleteOwnPropertyService } from "../service/propertyOwnerDeleteService";

export async function deleteOwnPropertyController(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ message: "Authentication required" });
  try {
    const property = await deleteOwnPropertyService(String(req.params.id), userId);
    return res.status(200).json({ property, message: "ملک از فهرست فعال حذف شد؛ سوابق آن حفظ شده‌اند." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PROPERTY_NOT_OWNED_BY_USER") return res.status(403).json({ message: "این ملک به حساب شما تعلق ندارد." });
    if (code === "PROPERTY_NOT_FOUND") return res.status(404).json({ message: "ملک پیدا نشد." });
    if (code === "PROPERTY_ALREADY_DELETED") return res.status(409).json({ message: "این ملک قبلاً حذف شده است." });
    console.error("Error deleting owner's property:", error);
    return res.status(500).json({ message: "حذف ملک ناموفق بود." });
  }
}
