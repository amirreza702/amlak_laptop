"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { UserPublic } from "@/features/auth/api/authApi";
import { getActiveSearchRequests, getAgentContact, getAgentProfile, updateAgentProfile } from "../api/agentApi";
import type { ActiveRequest, ContactResult } from "../types/agent";
import { useAgentRequestFilters } from "./useAgentRequestFilters";
import { useAgentPrivateNotes } from "./useAgentPrivateNotes";

/** مدیریت وضعیت پروفایل، درخواست‌ها و دسترسی تماس مشاور. */
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
  const { notes: privateNotes, savingNoteKey, saveNote, noteError, noteMessage } = useAgentPrivateNotes(profileState === "verified");
  const {
    visibleRequests,
    requestSearch, setRequestSearch,
    requestTransaction, setRequestTransaction,
    requestPropertyType, setRequestPropertyType,
    requestCity, setRequestCity,
    budgetMin, setBudgetMin,
    budgetMax, setBudgetMax,
    requestFrom, setRequestFrom,
    requestTo, setRequestTo,
    resetRequestFilters,
  } = useAgentRequestFilters(requests, privateNotes);
  const [contacts, setContacts] = useState<Record<string, ContactResult["customer"]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setProfileId(null);
      setProfileState("checking");
      setProfileError(null);
    });

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

    return () => { active = false; };
  }, [user.mobile]);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    setRequestsError(null);
    try {
      setRequests(await getActiveSearchRequests());
    } catch (error: unknown) {
      setRequestsError(error instanceof Error ? error.message : "دریافت درخواست‌ها انجام نشد.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (profileState === "verified") void Promise.resolve().then(() => loadRequests());
  }, [profileState, loadRequests]);

  const openContact = async (requestId: string) => {
    if (!profileId) {
      setRequestsError("شناسهٔ پروفایل مشاور در دسترس نیست؛ دریافت آن به API سمت سرور نیاز دارد.");
      return;
    }
    setBusyId(requestId);
    setRequestsError(null);
    setActionMessage(null);
    try {
      const result = await getAgentContact(profileId, requestId);
      setContacts((current) => ({ ...current, [requestId]: result.customer }));
      setActionMessage("دسترسی به اطلاعات تماس از سرور دریافت شد.");
    } catch (error: unknown) {
      setRequestsError(error instanceof Error ? error.message : "دسترسی به اطلاعات تماس انجام نشد.");
    } finally {
      setBusyId(null);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileId) return;
    setIsSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveMessage(null);
    try {
      const updated = await updateAgentProfile(profileId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        agencyName: agencyName.trim() || null,
        address: address.trim() || null,
      });
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setAgencyName(updated.agencyName ?? "");
      setAddress(updated.address ?? "");
      setProfileSaveMessage("اطلاعات پروفایل مشاور ذخیره شد.");
    } catch (error: unknown) {
      setProfileSaveError(error instanceof Error ? error.message : "ذخیرهٔ پروفایل مشاور انجام نشد.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return {
    selectedTool, setSelectedTool,
    profileId, profileState, profileError, profileReviewNotes,
    firstName, setFirstName, lastName, setLastName,
    agencyName, setAgencyName, address, setAddress,
    isSavingProfile, profileSaveMessage, profileSaveError,
    requests, loadingRequests, requestsError,
    privateNotes, savingNoteKey, saveNote, noteError, noteMessage,
    visibleRequests,
    requestSearch, setRequestSearch,
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
