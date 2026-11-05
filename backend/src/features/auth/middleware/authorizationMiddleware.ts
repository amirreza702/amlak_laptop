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
export function requirePropertyAccess(paramName = "id", _requireVerifiedOwner = true, requireApprovedAgent = true, allowAgentCreator = false) {
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
          registrationSource: true,
          createdByUserId: true,
          deletedAt: true,
          owners: {
            where: { owner: { is: { userId: user.id } } },
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

      if (property?.deletedAt) return res.status(403).json({ message: "This property has been deleted" });

      const allowed = Boolean(
        property &&
        ((user.role === "OWNER" && property.owners.length > 0) ||
         (user.role === "AGENT" && (
           property.agents.length > 0 ||
           (allowAgentCreator && property.registrationSource === "AGENT" && property.createdByUserId === user.id)
         )))
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

/**
 * مدیریت ملک برای ایجادکننده و مالک مرتبط مستقل و هم‌زمان مجاز است.
 * ارتباط مالک از PropertyOwner احراز می‌شود؛ انتخاب مشاور به‌تنهایی مجوز ویرایش نیست.
 */
export function requirePropertyCreator(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req, res);
    if (!user) return;
    if (user.role === "HASHTI") return next();

    const propertyId = req.params[paramName];
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      return res.status(400).json({ message: "Invalid property ID" });
    }
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          createdByUserId: true,
          deletedAt: true,
          owners: {
            where: { owner: { is: { userId: user.id } } },
            select: { ownerId: true },
            take: 1,
          },
        },
      });
      const isCreator = property?.createdByUserId === user.id;
      const isRelatedOwner = user.role === "OWNER" && Boolean(property?.owners.length);
      if (!property || property.deletedAt || (!isCreator && !isRelatedOwner)) {
        return res.status(403).json({ message: "Only the property creator or a related owner can manage this property" });
      }
      return next();
    } catch (error) {
      console.error("Property creator authorization failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/**
 * برای مشاهده اطلاعات خصوصی ملک، ایجادکننده یا طرفی که طبق قواعد موجود
 * به ملک دسترسی دارد مجاز است؛ این استثنا مجوز ویرایش ایجاد نمی‌کند.
 */
/**
 * مشاهده جزئیات خصوصی و رسانه ملک:
 * در حالت عادی ایجادکننده یا طرف مرتبط مجاز است؛
 * اما پس از انقضا فقط مالک مرتبط، مشاور دارای تأیید نهایی و هشتی دسترسی دارند.
 */
export function requirePropertyCreatorOrAccess(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req, res);
    if (!user) return;
    if (user.role === "HASHTI") return next();

    const propertyId = req.params[paramName];
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          createdByUserId: true,
          deletedAt: true,
          listing: { select: { status: true, confirmUntil: true } },
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
      });

      if (!property || property.deletedAt) {
        return res.status(403).json({ message: "You do not have access to this property" });
      }

      const isExpired =
        property.listing?.status === "EXPIRED" ||
        (property.listing?.status === "PUBLISHED" &&
          (!property.listing.confirmUntil || property.listing.confirmUntil <= new Date()));

      if (isExpired) {
        const isRelatedOwner = user.role === "OWNER" && property.owners.length > 0;
        const isFinalApprovedAgent = user.role === "AGENT" && property.agents.length > 0;
        if (isRelatedOwner || isFinalApprovedAgent) return next();
        return res.status(403).json({ message: "Expired properties are restricted to the owner, approved agent, and Hashti" });
      }

      if (property.createdByUserId === user.id) return next();
      return requirePropertyAccess(paramName, false)(req, res, next);
    } catch (error) {
      console.error("Property read authorization failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/** مشاور فقط می‌تواند اطلاعات پایهٔ ملکی را ویرایش کند که خودش ثبت کرده است. */
export function requireAgentOwnRegisteredProperty(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req, res);
    if (!user) return;
    if (user.role !== "AGENT") return next();

    const propertyId = req.params[paramName];
    if (typeof propertyId !== "string" || !propertyId.trim()) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    try {
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          registrationSource: "AGENT",
          createdByUserId: user.id,
        },
        select: { id: true },
      });
      if (!property) {
        return res.status(403).json({ message: "Agents may edit only properties they registered" });
      }
      return next();
    } catch (error) {
      console.error("Agent property edit authorization failed:", error);
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
          createdByUserId: user.id,
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
