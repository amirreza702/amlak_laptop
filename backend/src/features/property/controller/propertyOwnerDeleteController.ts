import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { deleteOwnPropertyService, deleteAgentManagedOwnerPropertyService, reactivateOwnPropertyService } from "../service/propertyOwnerDeleteService";

export async function deleteOwnPropertyController(req: Request, res: Response) {
  const actor = (req as AuthenticatedRequest).user;
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  try {
    const property = await deleteOwnPropertyService(String(req.params.id), actor);
    return res.status(200).json({ property, message: "ملک، آگهی و همکاری‌های فعال حذف شدند؛ سوابق مدیریتی و حسابرسی حفظ شده‌اند." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PROPERTY_NOT_OWNED_BY_USER") return res.status(403).json({ message: "این ملک به حساب شما تعلق ندارد." });
    if (code === "PROPERTY_NOT_FOUND") return res.status(404).json({ message: "ملک پیدا نشد." });
    if (code === "PROPERTY_ALREADY_DELETED") return res.status(409).json({ message: "این ملک قبلاً حذف شده است." });
    console.error("Error deleting owner's property:", error);
    return res.status(500).json({ message: "حذف ملک ناموفق بود." });
  }
}


export async function deleteAgentManagedOwnerPropertyController(req: Request, res: Response) {
  const actor = (req as AuthenticatedRequest).user;
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  try {
    const property = await deleteAgentManagedOwnerPropertyService(String(req.params.id), actor);
    return res.status(200).json({ property, message: "ملک، آگهی و همکاری‌های فعال حذف شدند؛ سوابق مدیریتی و حسابرسی حفظ شده‌اند." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PROPERTY_NOT_REGISTERED_BY_AGENT") return res.status(403).json({ message: "فقط ملکی را می‌توانید حذف کنید که خودتان ثبت کرده‌اید." });
    if (code === "PROPERTY_AGENT_RELATION_NOT_FOUND") return res.status(403).json({ message: "ارتباط فعالی با این ملک ندارید." });
    if (code === "PROPERTY_NOT_FOUND") return res.status(404).json({ message: "ملک پیدا نشد." });
    if (code === "PROPERTY_ALREADY_DELETED") return res.status(409).json({ message: "این ملک قبلاً از فهرست فعال خارج شده است." });
    console.error("Error deleting agent-managed owner property:", error);
    return res.status(500).json({ message: "حذف ملک ناموفق بود." });
  }
}


export async function reactivateOwnPropertyController(req: Request, res: Response) {
  const actor = (req as AuthenticatedRequest).user;
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  try {
    const property = await reactivateOwnPropertyService(String(req.params.id), actor);
    return res.status(200).json({ property, message: "ملک دوباره به فهرست فعال بازگردانده شد." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PROPERTY_NOT_OWNED_BY_USER") return res.status(403).json({ message: "این ملک به حساب شما تعلق ندارد." });
    if (code === "PROPERTY_NOT_FOUND") return res.status(404).json({ message: "ملک پیدا نشد." });
    if (code === "PROPERTY_ALREADY_ACTIVE") return res.status(409).json({ message: "این ملک هم‌اکنون فعال است." });
    if (code === "PROPERTY_PERMANENTLY_DELETED") return res.status(409).json({ message: "ملک حذف‌شده قابل فعال‌سازی مجدد نیست." });
    console.error("Error reactivating owner's property:", error);
    return res.status(500).json({ message: "فعال‌سازی مجدد ملک ناموفق بود." });
  }
}
