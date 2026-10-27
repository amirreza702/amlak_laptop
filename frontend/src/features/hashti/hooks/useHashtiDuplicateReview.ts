"use client";

import { useState, type FormEvent } from "react";
import { createHashtiDuplicateReview, decideHashtiDuplicateReview, getHashtiDuplicateMatches, getHashtiDuplicateReviews } from "@/features/hashti/api/hashtiApi";
import type { DuplicateMatch, DuplicateReview } from "@/features/hashti/types/hashti";

export function useHashtiDuplicateReview() {
  const [propertyId, setPropertyId] = useState("");
  const [candidateMatches, setCandidateMatches] = useState<DuplicateMatch[]>([]);
  const [reviews, setReviews] = useState<DuplicateReview[]>([]);
  const [matchingBusy, setMatchingBusy] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);
  const [matchingMessage, setMatchingMessage] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);

  const loadDuplicateWork = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!propertyId.trim()) { setMatchingError("شناسهٔ ملک اصلی را وارد کنید."); return; }
    setMatchingBusy(true);
    setMatchingError(null);
    setMatchingMessage(null);
    try {
      const [matchResponse, reviewResponse] = await Promise.all([
        getHashtiDuplicateMatches(propertyId.trim()),
        getHashtiDuplicateReviews(propertyId.trim()),
      ]);
      setCandidateMatches(matchResponse.matches);
      setReviews(reviewResponse.duplicateReviews);
      setMatchingMessage("نتایج مشابهت و سوابق بررسی به‌روز شد.");
    } catch (error: unknown) {
      setMatchingError(error instanceof Error ? error.message : "بررسی مغایرت انجام نشد.");
      setCandidateMatches([]);
      setReviews([]);
    } finally { setMatchingBusy(false); }
  };

  const createReview = async (candidatePropertyId: string) => {
    if (!propertyId.trim()) return;
    setBusyReviewId(candidatePropertyId);
    setMatchingError(null);
    setMatchingMessage(null);
    try {
      await createHashtiDuplicateReview(propertyId.trim(), candidatePropertyId);
      setMatchingMessage("پروندهٔ بررسی تشابه ایجاد شد.");
      await loadDuplicateWork();
    } catch (error: unknown) {
      setMatchingError(error instanceof Error ? error.message : "ایجاد پروندهٔ بررسی انجام نشد.");
    } finally { setBusyReviewId(null); }
  };

  const decideReview = async (reviewId: string, decision: "SAME_PROPERTY" | "DIFFERENT_PROPERTY") => {
    setBusyReviewId(reviewId);
    setMatchingError(null);
    setMatchingMessage(null);
    try {
      await decideHashtiDuplicateReview(reviewId, { decision, notes: reviewNotes.trim() || null });
      setMatchingMessage(decision === "SAME_PROPERTY" ? "دو رکورد به‌عنوان یک ملک ثبت شدند." : "دو رکورد به‌عنوان املاک متفاوت ثبت شدند.");
      await loadDuplicateWork();
    } catch (error: unknown) {
      setMatchingError(error instanceof Error ? error.message : "ثبت تصمیم انجام نشد.");
    } finally { setBusyReviewId(null); }
  };

  return { propertyId, setPropertyId, candidateMatches, reviews, matchingBusy, matchingError, matchingMessage, reviewNotes, setReviewNotes, busyReviewId, loadDuplicateWork, createReview, decideReview };
}
