"use client";

import { useEffect, useMemo, useState } from "react";
import { ownerApiRequest } from "../api/ownerApi";
import type { OwnerProperty } from "../types/owner";

export function useOwnerProperties(userMobile: string, mode: "properties" | "agents" = "properties") {
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [minRooms, setMinRooms] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState("all");
  const [listingFilter, setListingFilter] = useState("all");
  const [busyAgent, setBusyAgent] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleProperties = useMemo(() => properties.filter((item) => {
    const text = `${item.property.city} ${item.property.district} ${item.property.address} ${item.property.propertyType} ${item.propertyId} ${item.property.agents.map((a) => `${a.agent.firstName} ${a.agent.lastName} ${a.agent.agencyName ?? ""}`).join(" ")}`.toLocaleLowerCase();
    const matchesSearch = text.includes(search.trim().toLocaleLowerCase());
    const listing = item.property.listing;
    const price = listing ? Number(listing.transactionType === "SALE" ? listing.salePrice : listing.transactionType === "RENT" ? listing.rentAmount : listing.depositAmount) : null;
    const area = item.property.area;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? item.property.isActive : statusFilter === "inactive" ? !item.property.isActive : item.verificationStatus === statusFilter);
    return matchesSearch && matchesStatus && (!cityFilter.trim() || item.property.city.toLocaleLowerCase().includes(cityFilter.trim().toLocaleLowerCase())) && (!districtFilter.trim() || item.property.district.toLocaleLowerCase().includes(districtFilter.trim().toLocaleLowerCase())) && (transactionFilter === "all" || listing?.transactionType === transactionFilter) && (propertyTypeFilter === "all" || item.property.propertyType === propertyTypeFilter) && (minPrice === "" || (price !== null && Number.isFinite(price) && price >= Number(minPrice))) && (maxPrice === "" || (price !== null && Number.isFinite(price) && price <= Number(maxPrice))) && (minArea === "" || (area !== null && area >= Number(minArea))) && (maxArea === "" || (area !== null && area <= Number(maxArea))) && (minRooms === "" || (item.property.rooms !== null && item.property.rooms >= Number(minRooms))) && (occupancyFilter === "all" || item.property.occupancyStatus === occupancyFilter) && (listingFilter === "all" || listing?.status === listingFilter) && (mode !== "agents" || item.property.agents.length > 0);
  }), [properties, search, statusFilter, cityFilter, districtFilter, transactionFilter, propertyTypeFilter, minPrice, maxPrice, minArea, maxArea, minRooms, occupancyFilter, listingFilter, mode]);

  async function updateAgentAccess(propertyId: string, agentId: string, action: "approval" | "revoke") {
    setBusyAgent(`${propertyId}:${agentId}`);
    setActionMessage(null);
    setActionError(null);
    try {
      await ownerApiRequest<{ message?: string }>(`/properties/${encodeURIComponent(propertyId)}/agents/${encodeURIComponent(agentId)}/${action}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      setActionMessage(action === "approval" ? "دسترسی مشاور تأیید شد." : "دسترسی مشاور لغو شد.");
      setReload((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "تغییر دسترسی مشاور انجام نشد.");
    } finally {
      setBusyAgent(null);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const body = await ownerApiRequest<{ properties?: OwnerProperty[] }>("/owners/me/properties");
        if (active) setProperties(body.properties ?? []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "دریافت املاک مالک ناموفق بود.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [userMobile, reload]);

  return {
    properties, loading, error, reload, setReload, search, setSearch, statusFilter, setStatusFilter,
    cityFilter, setCityFilter, districtFilter, setDistrictFilter, transactionFilter, setTransactionFilter,
    propertyTypeFilter, setPropertyTypeFilter, minPrice, setMinPrice, maxPrice, setMaxPrice,
    minArea, setMinArea, maxArea, setMaxArea, minRooms, setMinRooms, occupancyFilter, setOccupancyFilter,
    listingFilter, setListingFilter, busyAgent, actionMessage, actionError, visibleProperties, updateAgentAccess,
  };
}
