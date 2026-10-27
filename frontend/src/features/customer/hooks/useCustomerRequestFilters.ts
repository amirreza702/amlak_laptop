"use client";

import { useMemo, useState } from "react";
import type { CustomerSearchRequestRecord } from "../api/customerDashboardApi";

/** مدیریت مستقل فیلترهای درخواست‌های جست‌وجوی مشتری. */
export function useCustomerRequestFilters(requests: CustomerSearchRequestRecord[]) {
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [requestTransactionFilter, setRequestTransactionFilter] = useState("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState("all");
  const [requestCityFilter, setRequestCityFilter] = useState("");
  const [requestBudgetMin, setRequestBudgetMin] = useState("");
  const [requestBudgetMax, setRequestBudgetMax] = useState("");

  const filteredRequests = useMemo(() => requests.filter((request) => {
    const budget = request.budget === null ? null : Number(request.budget);
    const text = `${request.id} ${request.city} ${request.description ?? ""}`.toLocaleLowerCase();
    return text.includes(requestSearch.trim().toLocaleLowerCase()) &&
      (requestStatusFilter === "all" || request.status === requestStatusFilter) &&
      (requestTransactionFilter === "all" || request.transactionType === requestTransactionFilter) &&
      (requestTypeFilter === "all" || request.propertyType === requestTypeFilter) &&
      (!requestCityFilter.trim() || request.city.toLocaleLowerCase().includes(requestCityFilter.trim().toLocaleLowerCase())) &&
      (requestBudgetMin === "" || (budget !== null && Number.isFinite(budget) && budget >= Number(requestBudgetMin))) &&
      (requestBudgetMax === "" || (budget !== null && Number.isFinite(budget) && budget <= Number(requestBudgetMax)));
  }), [requests, requestSearch, requestStatusFilter, requestTransactionFilter, requestTypeFilter, requestCityFilter, requestBudgetMin, requestBudgetMax]);

  const resetRequestFilters = () => {
    setRequestSearch("");
    setRequestStatusFilter("all");
    setRequestTransactionFilter("all");
    setRequestTypeFilter("all");
    setRequestCityFilter("");
    setRequestBudgetMin("");
    setRequestBudgetMax("");
  };

  return {
    filteredRequests,
    requestSearch, setRequestSearch,
    requestStatusFilter, setRequestStatusFilter,
    requestTransactionFilter, setRequestTransactionFilter,
    requestTypeFilter, setRequestTypeFilter,
    requestCityFilter, setRequestCityFilter,
    requestBudgetMin, setRequestBudgetMin,
    requestBudgetMax, setRequestBudgetMax,
    resetRequestFilters,
  };
}
