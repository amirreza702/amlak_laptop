"use client";

import { useMemo, useState } from "react";

export interface FilterableAgentRequest {
  id: string;
  transactionType: string;
  propertyType: string;
  city: string;
  budget: string | number | null;
  description: string | null;
  hashtiVerified: boolean;
  createdAt: string;
}

/** فیلترهای رابط درخواست‌های مشتری در پنل مشاور؛ بدون وابستگی به JSX. */
export function useAgentRequestFilters(requests: FilterableAgentRequest[]) {
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState("all");
  const [requestTransaction, setRequestTransaction] = useState("all");
  const [requestPropertyType, setRequestPropertyType] = useState("all");
  const [requestCity, setRequestCity] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [requestFrom, setRequestFrom] = useState("");
  const [requestTo, setRequestTo] = useState("");

  const visibleRequests = useMemo(() => requests.filter((request) => {
    const text = `${request.city} ${request.transactionType} ${request.propertyType} ${request.description ?? ""} ${request.id}`.toLocaleLowerCase();
    const budget = request.budget === null ? null : Number(request.budget);
    const createdAt = new Date(request.createdAt).getTime();
    return text.includes(requestSearch.trim().toLocaleLowerCase()) &&
      (requestFilter === "all" || (requestFilter === "verified" ? request.hashtiVerified : !request.hashtiVerified)) &&
      (requestTransaction === "all" || request.transactionType === requestTransaction) &&
      (requestPropertyType === "all" || request.propertyType === requestPropertyType) &&
      (!requestCity.trim() || request.city.toLocaleLowerCase().includes(requestCity.trim().toLocaleLowerCase())) &&
      (budgetMin === "" || (budget !== null && Number.isFinite(budget) && budget >= Number(budgetMin))) &&
      (budgetMax === "" || (budget !== null && Number.isFinite(budget) && budget <= Number(budgetMax))) &&
      (!requestFrom || createdAt >= new Date(`${requestFrom}T00:00:00`).getTime()) &&
      (!requestTo || createdAt <= new Date(`${requestTo}T23:59:59`).getTime());
  }), [requests, requestSearch, requestFilter, requestTransaction, requestPropertyType, requestCity, budgetMin, budgetMax, requestFrom, requestTo]);

  const resetRequestFilters = () => {
    setRequestSearch("");
    setRequestFilter("all");
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
    requestFilter, setRequestFilter,
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
