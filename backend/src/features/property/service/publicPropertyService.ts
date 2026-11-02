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
  const verifiedPrimaryOwner = owners.find((relation) => relation.verificationStatus === "VERIFIED")?.owner ?? null;
  const viewerOwnerRelation = viewer?.role === "OWNER"
    ? owners.find((relation) => relation.owner.userId === viewer.id) ?? null
    : null;
  const isApprovedAgent = viewer?.role === "AGENT" &&
    registrationSource === "OWNER" &&
    approvedAgent?.userId === viewer.id &&
    Boolean(approvedOwnerRelation);
  const isAgentCreator = viewer?.role === "AGENT" &&
    registrationSource === "AGENT" &&
    createdByUserId === viewer.id;
  // پس از تأیید مشاور، فقط مالکی که همان مشاور را تأیید کرده است، به همراه آن مشاور،
  // به اطلاعات مالک دسترسی دارد. پیش از تأیید، مالکِ واردشده فقط اطلاعات خودش را می‌بیند.
  const viewerIsAuthorizedOwner = Boolean(
    viewerOwnerRelation && (!approvedAgent || approvedOwnerIds.includes(viewerOwnerRelation.ownerId))
  );
  const mayViewOwnerDetails = Boolean(
    viewerIsAuthorizedOwner || isApprovedAgent || isAgentCreator || viewer?.role === "HASHTI"
  );

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
  } else if (verifiedPrimaryOwner) {
    contact = {
      type: "OWNER",
      label: "مالک",
      firstName: verifiedPrimaryOwner.firstName,
      lastName: verifiedPrimaryOwner.lastName,
      mobile: verifiedPrimaryOwner.user.mobile,
    };
  }

  const ownerForViewer = (viewerIsAuthorizedOwner ? viewerOwnerRelation?.owner : null) ??
    (isApprovedAgent ? approvedOwnerRelation?.owner : null) ??
    (isAgentCreator || viewer?.role === "HASHTI" ? primaryOwner : null);
  const ownerDetails = mayViewOwnerDetails
    ? {
        firstName: isAgentCreator ? ownerFirstName ?? ownerForViewer?.firstName ?? null : ownerForViewer?.firstName ?? null,
        lastName: isAgentCreator ? ownerLastName ?? ownerForViewer?.lastName ?? null : ownerForViewer?.lastName ?? null,
        mobile: isAgentCreator ? ownerMobile ?? ownerForViewer?.user.mobile ?? null : ownerForViewer?.user.mobile ?? null,
      }
    : null;

  return { ...publicProperty, contact, ownerDetails };
}
