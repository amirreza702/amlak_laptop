"use client";

import { useMemo, useState } from "react";

type SearchablePrivateNote = { entityType: string; entityId: string; note: string };

export interface FilterableAgentRequest {
  id: string;
  customerId?: string | null;
  transactionType: string;
  propertyType: string;
  city: string;
  budget: string | number | null;
  description: string | null;
  createdByRole: "CUSTOMER" | "AGENT" | null;
  /** فقط درخواست‌هایی که توسط همین مشاور ثبت شده‌اند قابل ویرایش/حذف هستند. */
  isCreatedByMe?: boolean;
  createdAt: string;
}

/** فیلترهای رابط درخواست‌های مشتری در پنل مشاور؛ بدون وابستگی به JSX. */
export function useAgentRequestFilters(requests: FilterableAgentRequest[], privateNotes: SearchablePrivateNote[] = []) {
  const [requestSearch, setRequestSearch] = useState("");
  const [requestTransaction, setRequestTransaction] = useState("all");
  const [requestPropertyType, setRequestPropertyType] = useState("all");
  const [requestCity, setRequestCity] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [requestFrom, setRequestFrom] = useState("");
  const [requestTo, setRequestTo] = useState("");

  const visibleRequests = useMemo(() => requests.filter((request) => {
    const privateNote = request.isCreatedByMe
      ? privateNotes.find((note) => note.entityType === "request" && note.entityId === request.id)?.note
      : request.customerId
        ? privateNotes.find((note) => note.entityType === "customer" && note.entityId === request.customerId)?.note
        : "";
    const text = `${request.city} ${request.transactionType} ${request.propertyType} ${request.description ?? ""} ${request.id} ${request.budget ?? ""} ${request.createdByRole ?? ""} ${request.createdAt} ${request.isCreatedByMe ? "ثبت‌شده توسط من" : ""} ${privateNote ?? ""}`.toLocaleLowerCase();
    const budget = request.budget === null ? null : Number(request.budget);
    const createdAt = new Date(request.createdAt).getTime();
    return text.includes(requestSearch.trim().toLocaleLowerCase()) &&
      (requestTransaction === "all" || request.transactionType === requestTransaction) &&
      (requestPropertyType === "all" || request.propertyType === requestPropertyType) &&
      (!requestCity.trim() || request.city.toLocaleLowerCase().includes(requestCity.trim().toLocaleLowerCase())) &&
      (budgetMin === "" || (budget !== null && Number.isFinite(budget) && budget >= Number(budgetMin))) &&
      (budgetMax === "" || (budget !== null && Number.isFinite(budget) && budget <= Number(budgetMax))) &&
      (!requestFrom || createdAt >= new Date(requestFrom).getTime()) &&
      (!requestTo || createdAt <= new Date(requestTo).getTime());
  }), [requests, privateNotes, requestSearch, requestTransaction, requestPropertyType, requestCity, budgetMin, budgetMax, requestFrom, requestTo]);

  const resetRequestFilters = () => {
    setRequestSearch("");
    setRequestTransaction("all");
    setRequestPropertyType("all");
    setRequestCity("");
    setBudgetMin("");
    setBudgetMax("");
    setRequestFrom("");
    setRequestTo("");
  };

  return {
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
  };
}
