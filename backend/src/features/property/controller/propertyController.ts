/**
 * ============================================================
 * Property Controller
 * ============================================================
 *
 * Controller مسئول دریافت Request و ارسال Response است.
 *
 * منطق Business در Service قرار دارد و Controller نباید
 * منطق مربوط به Property را خودش انجام دهد.
 * ============================================================
 */

import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  getPropertyById,
  registerProperty,
} from "../service/propertyService";

/**
 * ============================================================
 * ثبت ملک
 * ============================================================
 */
export async function registerPropertyController(
  req: Request,
  res: Response
) {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // نقش و مشخصات ثبت‌کننده فقط از نشست معتبر پذیرفته می‌شوند.
  if (user.role !== "OWNER" && user.role !== "AGENT") {
    return res.status(403).json({ message: "نقش ثبت‌کننده مجاز نیست." });
  }

  try {
    // شناسه پروفایل مخالف نقش سشن را از ورودی حذف می‌کنیم.
    const { ownerId, agentId, ...propertyData } = req.body ?? {};
    const registrationData = {
      ...propertyData,
      ...(user.role === "OWNER" ? { ownerId } : { agentId }),
    };

    const result = await registerProperty(registrationData, {
      id: user.id,
      mobile: user.mobile,
      role: user.role,
    });

    if (user.role === "AGENT") {
      const { ownerMobile: _ownerMobile, ...agentVisibleProperty } = result.property;
      return res.status(201).json({ ...result, property: agentVisibleProperty });
    }

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || "خطای ناشناخته در ثبت ملک",
    });
  }
}

/**
 * ============================================================
 * دریافت جزئیات یک ملک
 * ============================================================
 *
 * GET /properties/:id
 *
 * نکته:
 *
 * در این Route می‌دانیم که id یک string است.
 * بنابراین نوع Params را به Request اعلام می‌کنیم.
 */
export async function getPropertyByIdController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const property = await getPropertyById(req.params.id);
    const user = (req as AuthenticatedRequest).user;
    if (!user) return res.status(401).json({ message: "Authentication required" });

    // استثنای مدیریتی هشتی حفظ می‌شود.
    if (user.role === "HASHTI") return res.status(200).json(property);

    const {
      owners,
      agents,
      ownerAgentRequests,
      createdByUser,
      creatorMobile: _creatorMobile,
      createdByUserId: _createdByUserId,
      ...baseProperty
    } = property;
    const ownOwner = owners.find((relation) => relation.owner.userId === user.id) ?? null;
    const approvedAgent = agents.find(
      (relation) => relation.status === "ACTIVE" && relation.approvedByOwner
    ) ?? null;
    const approvedOwnerRequest = approvedAgent
      ? ownerAgentRequests.find((request) =>
          request.responses.some((response) => response.agentId === approvedAgent.agentId)
        ) ?? null
      : null;
    const approvedOwnerRelation = approvedOwnerRequest
      ? owners.find((relation) => relation.ownerId === approvedOwnerRequest.ownerId) ?? null
      : null;
    const isAgentCreator = property.registrationSource === "AGENT" &&
      property.createdByRole === "AGENT" && property.createdByUserId === user.id;
    const isApprovedAgent = user.role === "AGENT" &&
      property.registrationSource === "OWNER" &&
      approvedAgent?.agent.userId === user.id &&
      Boolean(approvedOwnerRelation);
    const canViewOwner = (user.role === "OWNER" && Boolean(ownOwner)) ||
      (user.role === "AGENT" && (isAgentCreator || isApprovedAgent));

    const primaryOwner = owners.find((relation) => relation.isPrimary) ?? owners[0] ?? null;
    const visibleOwner = user.role === "OWNER"
      ? ownOwner
      : isApprovedAgent ? approvedOwnerRelation : primaryOwner;
    const ownerFirstName = user.role === "OWNER"
      ? ownOwner?.owner.firstName ?? null
      : isApprovedAgent
        ? approvedOwnerRelation?.owner.firstName ?? null
        : canViewOwner ? property.ownerFirstName ?? visibleOwner?.owner.firstName ?? null : null;
    const ownerLastName = user.role === "OWNER"
      ? ownOwner?.owner.lastName ?? null
      : isApprovedAgent
        ? approvedOwnerRelation?.owner.lastName ?? null
        : canViewOwner ? property.ownerLastName ?? visibleOwner?.owner.lastName ?? null : null;
    const ownerMobile = user.role === "OWNER"
      ? ownOwner?.owner.user.mobile ?? null
      : isApprovedAgent
        ? approvedOwnerRelation?.owner.user.mobile ?? null
        : canViewOwner ? property.ownerMobile ?? visibleOwner?.owner.user.mobile ?? null : null;

    const ownerIsApprover = Boolean(ownOwner && approvedOwnerRelation?.ownerId === ownOwner.ownerId);
    const visibleApprovedAgent = property.registrationSource === "OWNER" &&
      (ownerIsApprover || isApprovedAgent)
      ? approvedAgent?.agent ?? null
      : null;
    const registrant = property.registrationSource === "AGENT" ? createdByUser?.agent ?? null : null;

    return res.status(200).json({
      ...baseProperty,
      ownerFirstName,
      ownerLastName,
      ownerMobile,
      registrantFirstName: registrant?.firstName ?? null,
      registrantLastName: registrant?.lastName ?? null,
      registrantMobile: property.registrationSource === "AGENT" ? property.creatorMobile : null,
      approvedAgentFirstName: visibleApprovedAgent?.firstName ?? null,
      approvedAgentLastName: visibleApprovedAgent?.lastName ?? null,
      approvedAgentMobile: visibleApprovedAgent?.user.mobile ?? null,
    });
  } catch (error: any) {
    return res.status(404).json({
      message: error.message || "ملک مورد نظر پیدا نشد.",
    });
  }
}
