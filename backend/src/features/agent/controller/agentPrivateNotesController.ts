import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import {
  getAllAgentPrivateNotesService,
  getMyPrivateNotesService,
  upsertAgentPrivateNoteAsAdminService,
  upsertMyPrivateNoteService,
} from "../service/agentPrivateNotesService";

function getActor(req: Request) {
  return (req as AuthenticatedRequest).user;
}

/** یادداشت‌های مشاور جاری؛ مالکیت و مجوز در Service بررسی می‌شود. */
export async function getMyPrivateNotesController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  try {
    const notes = await getMyPrivateNotesService(actor);
    return res.status(200).json({ notes });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AGENT_PROFILE_NOT_FOUND") return res.status(404).json({ message: "Agent profile not found" });
    if (code === "PRIVATE_NOTE_FORBIDDEN") return res.status(403).json({ message: "Private note access denied" });
    console.error("Could not load agent private notes:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** ایجاد، ویرایش یا حذف یادداشت شخصی مشاور جاری. */
export async function upsertMyPrivateNoteController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  const { entityType, entityId, note } = req.body ?? {};
  if (typeof entityType !== "string" || typeof entityId !== "string" ||
      typeof note !== "string" || note.length > 10000) {
    return res.status(400).json({ message: "Invalid private note data" });
  }
  try {
    const saved = await upsertMyPrivateNoteService(actor, entityType, entityId, note);
    return res.status(200).json({ note: saved });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_PRIVATE_NOTE_DATA") return res.status(400).json({ message: "Invalid private note data" });
    if (code === "AGENT_PROFILE_NOT_FOUND") return res.status(404).json({ message: "Agent profile not found" });
    if (code === "PRIVATE_NOTE_FORBIDDEN") return res.status(403).json({ message: "Private note access denied" });
    console.error("Could not save agent private note:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** فقط مدیر ارشد هشتی می‌تواند یادداشت‌های همه مشاوران را بخواند. */
export async function getAllAgentPrivateNotesController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  try {
    const notes = await getAllAgentPrivateNotesService(actor);
    return res.status(200).json({ notes });
  } catch (error) {
    if (error instanceof Error && error.message === "PRIVATE_NOTE_SUPER_ADMIN_REQUIRED") {
      return res.status(403).json({ message: "Super admin access required" });
    }
    console.error("Could not load all agent private notes:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** مدیر ارشد می‌تواند یادداشت مشاور مشخص را ایجاد، ویرایش یا حذف کند. */
export async function upsertAgentPrivateNoteAsAdminController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  const { agentId, entityType, entityId, note } = req.body ?? {};
  if (typeof agentId !== "string" || typeof entityType !== "string" ||
      typeof entityId !== "string" || typeof note !== "string" || note.length > 10000) {
    return res.status(400).json({ message: "Invalid private note data" });
  }
  try {
    const saved = await upsertAgentPrivateNoteAsAdminService(actor, agentId, entityType, entityId, note);
    return res.status(200).json({ note: saved });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_PRIVATE_NOTE_DATA") return res.status(400).json({ message: "Invalid private note data" });
    if (code === "AGENT_PROFILE_NOT_FOUND") return res.status(404).json({ message: "Agent profile not found" });
    if (code === "PRIVATE_NOTE_SUPER_ADMIN_REQUIRED") return res.status(403).json({ message: "Super admin access required" });
    console.error("Could not save agent private note as admin:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
