"use client";

import { useState } from "react";
import { ownerApiRequest } from "../api/ownerApi";

export function useOwnerAgentAccess() {
  const [propertyId, setPropertyId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [relationshipMessage, setRelationshipMessage] = useState<string | null>(null);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);

  async function setAgentRelationship(decision: "approval" | "revoke") {
    if (!propertyId.trim() || !agentId.trim()) {
      setRelationshipError("شناسهٔ ملک و شناسهٔ پروفایل مشاور را وارد کنید.");
      return;
    }
    setRelationshipBusy(true);
    setRelationshipError(null);
    setRelationshipMessage(null);
    try {
      await ownerApiRequest(
        `/properties/${encodeURIComponent(propertyId.trim())}/agents/${encodeURIComponent(agentId.trim())}/${decision}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
      );
      setRelationshipMessage(decision === "approval" ? "اجازهٔ فعالیت مشاور روی ملک ثبت شد." : "اجازهٔ فعالیت مشاور روی ملک لغو شد.");
    } catch (cause) {
      setRelationshipError(cause instanceof Error ? cause.message : "تغییر دسترسی مشاور انجام نشد.");
    } finally {
      setRelationshipBusy(false);
    }
  }

  return {
    propertyId, setPropertyId, agentId, setAgentId, relationshipBusy,
    relationshipMessage, relationshipError, setAgentRelationship,
  };
}
