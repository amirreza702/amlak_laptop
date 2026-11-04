"use client";

import { useEffect, useState } from "react";
import { searchProperties } from "../api/propertySearchApi";
import type { PropertySearchState, PropertySearchResult } from "../types/search";

const INITIAL_SEARCH_STATE: PropertySearchState = {
  transactionType: "",
  propertyType: "",
  city: "شاهرود",
  district: "",
  minSalePrice: "", maxSalePrice: "",
  minDepositAmount: "", maxDepositAmount: "",
  minRentAmount: "", maxRentAmount: "",
  minArea: "", maxArea: "",
  minRooms: "", maxRooms: "",
  minYearBuilt: "", maxYearBuilt: "",
  minFloor: "", maxFloor: "",
  minTotalUnits: "", maxTotalUnits: "",
  minParkingCount: "", maxParkingCount: "",
  documentType: "", ownershipType: "", landTenure: "",
  parkingType: "",
  hasElevator: "", hasStorage: "", hasBalcony: "", hasYard: "",
  heatingSystem: "", coolingSystem: "",
  renovationStatus: "", minRenovationYear: "", maxRenovationYear: "",
  occupancyStatus: "",
};

export function usePropertySearch() {
  const [filters, setFilters] = useState<PropertySearchState>(INITIAL_SEARCH_STATE);
  const [appliedFilters, setAppliedFilters] = useState<PropertySearchState>(INITIAL_SEARCH_STATE);
  const [results, setResults] = useState<PropertySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  function setFilter<K extends keyof PropertySearchState>(key: K, value: PropertySearchState[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  function setQuickFilter<K extends keyof PropertySearchState>(key: K, value: PropertySearchState[K]) {
    setFilters((previous) => {
      const nextFilters = { ...previous, [key]: value };
      setAppliedFilters(nextFilters);
      return nextFilters;
    });
  }

  function resetFilters() {
    const initialState = { ...INITIAL_SEARCH_STATE };
    setFilters(initialState);
    setAppliedFilters(initialState);
  }

  function getActiveFilterCount() {
    return Object.entries(filters).filter(([key, value]) =>
      key === "city" ? value !== "شاهرود" && Boolean(value) : value !== ""
    ).length;
  }

  async function search() {
    setIsSearching(true);
    try {
      const items = await searchProperties(filters);
      setResults(items);
      setAppliedFilters({ ...filters });
    } catch (error) {
      console.error("Property search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => search());
    // عمداً فقط یک بار در زمان Mount اجرا می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { filters, appliedFilters, results, setFilter, setQuickFilter, resetFilters, getActiveFilterCount, search, isSearching };
}