import { findPublishedPublicPropertyById } from "../repository/publicPropertyRepository";

type PropertyViewer = { id: string; role: string } | undefined;

/**
 * جزئیات عمومی آگهی با استثنای محرمانگی برای مالک، مشاور تأییدشده
 * همان ملک و مشاور ثبت‌کننده ملک‌های مشاورمحور.
 */
export async function getPublishedPublicPropertyById(id: string, viewer?: PropertyViewer) {
  const property = await findPublishedPublicPropertyById(id);
  if (!property) throw new Error("آگهی عمومی موردنظر پیدا نشد.");

  const {
    owners,
    agents,
    ownerAgentRequests,
    registrationSource,
    createdByUserId,
    ownerFirstName,
    ownerLastName,
    ownerMobile,
    confirmUntil,
    ...publicProperty
  } = property;

  const firstRegistrantRelation = agents.find((relation) => relation.isFirstRegistrant);
  const firstRegistrant = firstRegistrantRelation?.status === "ACTIVE"
    ? firstRegistrantRelation.agent
    : null;
  const approvedAgentRelation = agents.find(
    (relation) => relation.status === "ACTIVE" && relation.approvedByOwner
  );
  const approvedAgent = approvedAgentRelation?.agent ?? null;
  const approvedOwnerIds = approvedAgent
    ? Array.from(new Set(ownerAgentRequests
        .filter((request) => request.responses.some((response) => response.agentId === approvedAgent.id))
        .map((request) => request.ownerId)))
    : [];
  const approvedOwnerRelation = approvedOwnerIds.length === 1
    ? owners.find((relation) => relation.ownerId === approvedOwnerIds[0]) ?? null
    : null;
  const primaryOwnerRelation = owners[0] ?? null;
  const primaryOwner = primaryOwnerRelation?.owner ?? null;
  const viewerOwnerRelation = viewer?.role === "OWNER"
    ? owners.find((relation) => relation.owner.userId === viewer.id) ?? null
    : null;
  const isApprovedAgent = viewer?.role === "AGENT" &&
    approvedAgent?.userId === viewer.id;
  // نمایش جزئیات هویتی مالک علاوه بر تأیید مشاور، به اتصال همان مالک به درخواست تأییدشده نیاز دارد.
  const isApprovedAgentForOwnerDetails = isApprovedAgent && Boolean(approvedOwnerRelation);
  const isAgentCreator = viewer?.role === "AGENT" &&
    registrationSource === "AGENT" &&
    createdByUserId === viewer.id;
  // پس از تأیید مشاور، فقط مالکی که همان مشاور را تأیید کرده است، به همراه آن مشاور،
  // به اطلاعات مالک دسترسی دارد. پیش از تأیید، مالکِ واردشده فقط اطلاعات خودش را می‌بیند.
  const viewerIsAuthorizedOwner = Boolean(
    registrationSource === "OWNER" && viewerOwnerRelation && (!approvedAgent || approvedOwnerIds.includes(viewerOwnerRelation.ownerId))
  );
  const mayViewOwnerDetails = Boolean(
    viewerIsAuthorizedOwner || isApprovedAgentForOwnerDetails || isAgentCreator || viewer?.role === "HASHTI"
  );

  const isExpired = publicProperty.listing?.status === "EXPIRED" || (publicProperty.listing?.status === "PUBLISHED" && (!confirmUntil || confirmUntil <= new Date()));
  if (isExpired && !(viewer?.role === "HASHTI" || Boolean(viewerOwnerRelation) || isApprovedAgent)) {
    throw new Error("آگهی عمومی موردنظر پیدا نشد.");
  }

  let contact: {
    type: "OWNER" | "AGENT";
    label: "مالک" | "مشاور ثبت‌کننده" | "مشاور تأییدشده";
    firstName: string;
    lastName: string;
    mobile: string;
  } | null = null;

  if (registrationSource === "AGENT") {
    if (firstRegistrant) {
      contact = {
        type: "AGENT",
        label: "مشاور ثبت‌کننده",
        firstName: firstRegistrant.firstName,
        lastName: firstRegistrant.lastName,
        mobile: firstRegistrant.user.mobile,
      };
    }
  } else if (approvedAgent) {
    contact = {
      type: "AGENT",
      label: "مشاور تأییدشده",
      firstName: approvedAgent.firstName,
      lastName: approvedAgent.lastName,
      mobile: approvedAgent.user.mobile,
    };
  } else if (primaryOwner) {
    contact = {
      type: "OWNER",
      label: "مالک",
      firstName: primaryOwner.firstName,
      lastName: primaryOwner.lastName,
      mobile: primaryOwner.user.mobile,
    };
  }

  const ownerForViewer = (viewerIsAuthorizedOwner ? viewerOwnerRelation?.owner : null) ??
    (isApprovedAgentForOwnerDetails ? approvedOwnerRelation?.owner : null) ??
    (isAgentCreator || viewer?.role === "HASHTI" ? primaryOwner : null);
  const ownerDetails = mayViewOwnerDetails
    ? {
        firstName: isAgentCreator || viewer?.role === "HASHTI" ? ownerFirstName ?? ownerForViewer?.firstName ?? null : ownerForViewer?.firstName ?? null,
        lastName: isAgentCreator || viewer?.role === "HASHTI" ? ownerLastName ?? ownerForViewer?.lastName ?? null : ownerForViewer?.lastName ?? null,
        mobile: isAgentCreator || viewer?.role === "HASHTI" ? ownerMobile ?? ownerForViewer?.user.mobile ?? null : ownerForViewer?.user.mobile ?? null,
      }
    : null;

  return { ...publicProperty, contact, ownerDetails };
}
