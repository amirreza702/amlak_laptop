"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { UserPublic } from "@/features/auth/api/authApi";
import { getActiveSearchRequests, getAgentContact, getAgentProfile, updateAgentProfile } from "../api/agentApi";
import type { ActiveRequest, ContactResult } from "../types/agent";
import { useAgentRequestFilters } from "./useAgentRequestFilters";

/**
 * مدیریت وضعیت پروفایل، درخواست‌ها و دسترسی تماس مشاور.
 * این Hook منطق و ارتباط با API را از کامپوننت نمایشی جدا می‌کند.
 */
export function useAgentDashboard(user: UserPublic) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileState, setProfileState] = useState<"checking" | "verified" | "pending" | "rejected" | "unknown" | "error">("checking");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileReviewNotes, setProfileReviewNotes] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [address, setAddress] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [requests, setRequests] = useState<ActiveRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const {
    visibleRequests,
    requestSearch, setRequestSearch,
    requestFilter, setRequestFilter,
    requestTransaction, setRequestTransaction,
    requestPropertyType, setRequestPropertyType,
    requestCity, setRequestCity,
    budgetMin, setBudgetMin,
    budgetMax, setBudgetMax,
    requestFrom, setRequestFrom,
    requestTo, setRequestTo,
    resetRequestFilters,
  } = useAgentRequestFilters(requests);
  const [contacts, setContacts] = useState<Record<string, ContactResult["customer"]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setProfileId(null);
    setProfileState("checking");
    setProfileError(null);

    (async () => {
      try {
        // شناسه پروفایل همیشه از نشست معتبر سرور استخراج می‌شود، نه از مرورگر.
        const profile = await getAgentProfile();

        if (!active) return;
        setProfileId(profile.id);
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setAgencyName(profile.agencyName ?? "");
        setAddress(profile.address ?? "");
        setProfileReviewNotes(profile.verificationNotes ?? null);
        if (profile.verificationStatus === "VERIFIED" && profile.isVerified) {
          setProfileState("verified");
        } else if (profile.verificationStatus === "REJECTED") {
          setProfileState("rejected");
        } else {
          setProfileState("pending");
        }
      } catch (error: unknown) {
        if (active) {
          setProfileState("error");
          setProfileError(error instanceof Error ? error.message : "بررسی وضعیت حساب مشاور انجام نشد.");
        }
      }
    })();

  
  return {
    selectedTool, setSelectedTool,
    profileId, profileState, profileError, profileReviewNotes,
    firstName, setFirstName, lastName, setLastName,
    agencyName, setAgencyName, address, setAddress,
    isSavingProfile, profileSaveMessage, profileSaveError,
    requests, loadingRequests, requestsError,
    visibleRequests,
    requestSearch, setRequestSearch,
    requestFilter, setRequestFilter,
    requestTransaction, setRequestTransaction,
    requestPropertyType, setRequestPropertyType,
    requestCity, setRequestCity,
    budgetMin, setBudgetMin,
    budgetMax, setBudgetMax,
    requestFrom, setRequestFrom,
    requestTo, setRequestTo,
    resetRequestFilters,
    contacts, busyId, actionMessage,
    loadRequests, openContact, saveProfile,
  };
}
