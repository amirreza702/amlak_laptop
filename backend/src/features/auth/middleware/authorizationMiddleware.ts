import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import type { AuthenticatedRequest } from "./authMiddleware";

type ProfileKind = "customer" | "owner" | "agent";

function currentUser(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  return user;
}

/**
 * اجازه دسترسی به شناسه پروفایل فقط وقتی داده می‌شود که آن پروفایل
 * متعلق به کاربر نشست جاری باشد. role باید پیش از این middleware بررسی شود.
 */
export function requireOwnProfile(kind: ProfileKind, paramName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req, res);
    if (!user) return;

    const id = req.params[paramName];
    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({ message: "Invalid profile ID" });
    }

    try {
      let found = false;
      if (kind === "customer") {
        found = Boolean(await prisma.customer.findFirst({
          where: { id, userId: user.id }, select: { id: true },
        }));
      } else if (kind === "owner") {
        found = Boolean(await prisma.owner.findFirst({
          where: { id, userId: user.id }, select: { id: true },
        }));
      } else {
        found = Boolean(await prisma.agent.findFirst({
          where: { id, userId: user.id }, select: { id: true },
        }));
      }

      if (!found) {
        return res.status(403).json({ message: "You cannot access another user's profile" });
      }
      return next();
    } catch (error) {
      console.error("Profile authorization failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/**
 * شناسه پروفایل را از نشست استخراج و در body جایگزین می‌کند؛
 * شناسه‌ای که Client ارسال کرده هرگز مبنای هویت قرار نمی‌گیرد.
 */
export function bindOwnProfileIdToBody(kind: ProfileKind, bodyField: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req, res);
    if (!user) return;

    try {
      let profile: { id: string } | null = null;
      if (kind === "customer") {
        profile = await prisma.customer.findUnique({
          where: { userId: user.id }, select: { id: true },
        });
      } else if (kind === "owner") {
        profile = await prisma.owner.findUnique({
          where: { userId: user.id }, select: { id: true },
        });
      } else {
        profile = await prisma.agent.findUnique({
          where: { userId: user.id }, select: { id: true },
        });
      }

      if (!profile) {
        return res.status(403).json({ message: "The account profile has not been created" });
      }
      req.body = { ...(req.body ?? {}), [bodyField]: profile.id };
      return next();
    } catch (error) {
      console.error("Profile binding failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/**
 * فقط مالک مرتبط یا مشاور فعالِ تأییدشده برای همان ملک، یا کارمند هشتی،
 * می‌تواند از مسیرهای خصوصی ملک عبور کند. role باید قبل از این guard محدود شود.
 */
export function requirePropertyAccess(paramName = "id", requireVerifiedOwner = true, requireApprovedAgent = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req, res);
    if (!user) return;

    const propertyId = req.params[paramName];
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    if (user.role === "HASHTI") return next();

    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          owners: {
            where: {
              owner: { is: { userId: user.id } },
              ...(requireVerifiedOwner
                ? { verificationStatus: "VERIFIED" }
                : {}),
            },
            select: { ownerId: true },
            take: 1,
          },
          agents: {
            where: {
              agent: { is: { userId: user.id } },
              status: "ACTIVE",
              ...(requireApprovedAgent ? { approvedByOwner: true } : {}),
            },
            select: { agentId: true },
            take: 1,
          },
        },
      });

      const allowed = Boolean(
        property &&
        ((user.role === "OWNER" && property.owners.length > 0) ||
         (user.role === "AGENT" && property.agents.length > 0))
      );

      if (!allowed) {
        return res.status(403).json({ message: "You do not have access to this property" });
      }
      return next();
    } catch (error) {
      console.error("Property authorization failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/** کنترل مالکیت اعلان از روی User جاری، نه userId دریافتی از Client. */
export function requireOwnNotification(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req, res);
    if (!user) return;

    const id = req.params[paramName];
    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    try {
      const notification = await prisma.notification.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      return next();
    } catch (error) {
      console.error("Notification authorization failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/** اطمینان از تعلق درخواست جست‌وجو به مشتری صاحب نشست. */
export function requireOwnSearchRequest() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req, res);
    if (!user) return;

    const customerId = req.params.customerId;
    const requestId = req.params.requestId;
    if (typeof customerId !== "string" || typeof requestId !== "string") {
      return res.status(400).json({ message: "Invalid search request ID" });
    }

    try {
      const request = await prisma.propertySearchRequest.findFirst({
        where: {
          id: requestId,
          customerId,
          customer: { is: { userId: user.id } },
        },
        select: { id: true },
      });
      if (!request) {
        return res.status(404).json({ message: "Search request not found" });
      }
      return next();
    } catch (error) {
      console.error("Search request authorization failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

// Access to a verification case is limited to Hashti staff or a verified
// owner/agent relationship with the property under review.
export function requireVerificationCaseAccess(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req, res);
    if (!user) return;

    const caseId = req.params[paramName];
    if (typeof caseId !== "string" || !caseId.trim()) {
      return res.status(400).json({ message: "Invalid verification case ID" });
    }
    if (user.role === "HASHTI") return next();

    try {
      const verificationCase = await prisma.verificationCase.findUnique({
        where: { id: caseId },
        select: {
          property: {
            select: {
              owners: {
                where: { owner: { is: { userId: user.id } } },
                select: { ownerId: true },
                take: 1,
              },
              agents: {
                where: {
                  agent: { is: { userId: user.id } },
                  status: "ACTIVE",
                  approvedByOwner: true,
                },
                select: { agentId: true },
                take: 1,
              },
            },
          },
        },
      });
      const allowed = Boolean(
        verificationCase &&
        ((user.role === "OWNER" && verificationCase.property.owners.length > 0) ||
         (user.role === "AGENT" && verificationCase.property.agents.length > 0))
      );
      if (!allowed) {
        return res.status(403).json({ message: "You cannot access this verification case" });
      }
      return next();
    } catch (error) {
      console.error("Verification case authorization failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

