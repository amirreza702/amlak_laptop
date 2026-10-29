import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

const allowedEntityTypes = new Set(["property", "owner", "customer"]);

function currentUserId(req: Request): string | undefined {
  return (req as AuthenticatedRequest).user?.id;
}

/** هر مشاور فقط یادداشت‌های خودش را دریافت می‌کند. */
export async function getMyPrivateNotesController(req: Request, res: Response) {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const agent = await prisma.agent.findUnique({ where: { userId }, select: { id: true } });
    if (!agent) return res.status(404).json({ message: "Agent profile not found" });

    const notes = await prisma.agentPrivateNote.findMany({
      where: { agentId: agent.id },
      orderBy: { updatedAt: "desc" },
    });
    return res.status(200).json({ notes });
  } catch (error) {
    console.error("Could not load agent private notes:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** ایجاد یا به‌روزرسانی یادداشت فقط برای مشاور صاحب نشست. */
export async function upsertMyPrivateNoteController(req: Request, res: Response) {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { entityType, entityId, note } = req.body ?? {};
    if (
      typeof entityType !== "string" ||
      !allowedEntityTypes.has(entityType) ||
      typeof entityId !== "string" ||
      !entityId.trim() ||
      typeof note !== "string" ||
      note.length > 10000
    ) {
      return res.status(400).json({ message: "Invalid private note data" });
    }

    const agent = await prisma.agent.findUnique({ where: { userId }, select: { id: true } });
    if (!agent) return res.status(404).json({ message: "Agent profile not found" });

    const key = {
      agentId_entityType_entityId: {
        agentId: agent.id,
        entityType,
        entityId: entityId.trim(),
      },
    };
    const saved = note.trim()
      ? await prisma.agentPrivateNote.upsert({
          where: key,
          create: { ...key.agentId_entityType_entityId, note: note.trim() },
          update: { note: note.trim() },
        })
      : await prisma.agentPrivateNote.deleteMany({ where: key.agentId_entityType_entityId }).then(() => null);

    return res.status(200).json({ note: saved });
  } catch (error) {
    console.error("Could not save agent private note:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** فقط مدیر ارشد هشتی می‌تواند یادداشت‌های همه مشاوران را بخواند. */
export async function getAllAgentPrivateNotesController(req: Request, res: Response) {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true, isSuperAdmin: true },
    });
    if (
      !admin ||
      admin.role !== UserRole.HASHTI ||
      !admin.isActive ||
      !admin.isSuperAdmin
    ) {
      return res.status(403).json({ message: "Super admin access required" });
    }

    const notes = await prisma.agentPrivateNote.findMany({
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { mobile: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return res.status(200).json({ notes });
  } catch (error) {
    console.error("Could not load all agent private notes:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
