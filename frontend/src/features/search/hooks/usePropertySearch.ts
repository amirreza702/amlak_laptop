
"use client";

import { useEffect, useState } from "react";
import { searchProperties } from "../api/propertySearchApi";

export type TransactionType =
  | "خرید"
  | "رهن"
  | "اجاره"
  | "رهن و اجاره";

export type PropertyType =
  | "آپارتمان"
  | "خانه"
  | "ویلا"
  | "زمین"
  | "مغازه"
  | "اداری"
  | "باغ";

/**
 * ------------------------------------------------------------
 * نتیجه‌ای که Backend برای هر ملک برمی‌گرداند
 * ------------------------------------------------------------
 */
export interface PropertySearchResult {
  id: string;

  propertyType: string;
  transactionType: string | null;

  city: string;
  district: string;

  area: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  floor: number | null;

  latitudePublic: number | null;
  longitudePublic: number | null;

  salePrice: string | null;
  depositAmount: string | null;
  rentAmount: string | null;

  mainImage: string | null;
  updatedAt: string;
}

/**
 * ------------------------------------------------------------
 * پاسخ کامل API جستجو
 * ------------------------------------------------------------
 */
interface PropertySearchResponse {
  count: number;
  items: PropertySearchResult[];
}

export interface PropertySearchState {
  transactionType: TransactionType | "";
  propertyType: PropertyType | "";
  city: string;
  district: string;

  minPrice: string;
  maxPrice: string;

  minArea: string;
  maxArea: string;

  rooms: string;
  bathrooms: string;

  minYearBuilt: string;
  maxYearBuilt: string;

  minFloor: string;
  maxFloor: string;

  hasParking: boolean;
  hasElevator: boolean;
  hasStorage: boolean;
  hasBalcony: boolean;
  hasYard: boolean;
  hasPool: boolean;

  singlePageDeed: boolean;
  documentsVerified: boolean;
  transactionAllowed: boolean;
  ownerVerified: boolean;
  propertyInfoVerified: boolean;
  locationVerified: boolean;

  updatedWithinDays: string;
  onlyActive: boolean;
}

const INITIAL_SEARCH_STATE: PropertySearchState = {
  transactionType: "",
  propertyType: "",

  city: "شاهرود",
  district: "",

  minPrice: "",
  maxPrice: "",

  minArea: "",
  maxArea: "",

  rooms: "",
  bathrooms: "",

  minYearBuilt: "",
  maxYearBuilt: "",

  minFloor: "",
  maxFloor: "",

  hasParking: false,
  hasElevator: false,
  hasStorage: false,
  hasBalcony: false,
  hasYard: false,
  hasPool: false,

  singlePageDeed: false,
  documentsVerified: false,
  transactionAllowed: false,
  ownerVerified: false,
  propertyInfoVerified: false,
  locationVerified: false,

  updatedWithinDays: "",
  onlyActive: true,
};

export function usePropertySearch() {
  const [filters, setFilters] =
    useState<PropertySearchState>(INITIAL_SEARCH_STATE);

  const [appliedFilters, setAppliedFilters] =
    useState<PropertySearchState>(INITIAL_SEARCH_STATE);

  /**
   * ----------------------------------------------------------
   * نتایج واقعی Backend
   * ----------------------------------------------------------
   */
  const [results, setResults] =
    useState<PropertySearchResult[]>([]);

  const [isSearching, setIsSearching] =
    useState(false);

  /**
   * ----------------------------------------------------------
   * تغییر یک فیلتر
   * ----------------------------------------------------------
   */
  function setFilter<K extends keyof PropertySearchState>(
    key: K,
    value: PropertySearchState[K]
  ) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /**
   * ----------------------------------------------------------
   * فیلترهای سریع
   *
   * این فیلترها همان لحظه روی نقشه اعمال می‌شوند.
   * ----------------------------------------------------------
   */
  function setQuickFilter<K extends keyof PropertySearchState>(
    key: K,
    value: PropertySearchState[K]
  ) {
    setFilters((previous) => {
      const nextFilters: PropertySearchState = {
        ...previous,
        [key]: value,
      };

      setAppliedFilters(nextFilters);

      return nextFilters;
    });
  }

  /**
   * ----------------------------------------------------------
   * پاک کردن فیلترها
   * ----------------------------------------------------------
   */
  function resetFilters() {
    const initialState: PropertySearchState = {
      ...INITIAL_SEARCH_STATE,
    };

    setFilters(initialState);
    setAppliedFilters(initialState);
  }

  /**
   * ----------------------------------------------------------
   * تعداد فیلترهای فعال
   * ----------------------------------------------------------
   */
  function getActiveFilterCount() {
    let count = 0;

    if (filters.transactionType) count++;
    if (filters.propertyType) count++;
    if (filters.district) count++;

    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;

    if (filters.minArea) count++;
    if (filters.maxArea) count++;

    if (filters.rooms) count++;
    if (filters.bathrooms) count++;

    if (filters.minYearBuilt) count++;
    if (filters.maxYearBuilt) count++;

    if (filters.minFloor) count++;
    if (filters.maxFloor) count++;

    if (filters.hasParking) count++;
    if (filters.hasElevator) count++;
    if (filters.hasStorage) count++;
    if (filters.hasBalcony) count++;
    if (filters.hasYard) count++;
    if (filters.hasPool) count++;

    if (filters.singlePageDeed) count++;
    if (filters.documentsVerified) count++;
    if (filters.transactionAllowed) count++;
    if (filters.ownerVerified) count++;
    if (filters.propertyInfoVerified) count++;
    if (filters.locationVerified) count++;

    if (filters.updatedWithinDays) count++;

    return count;
  }

  async function search() {
    setIsSearching(true);
    try {
      const items = await searchProperties(filters);
      setResults(items);
      setAppliedFilters({ ...filters });
    } catch (error) {
      console.error("Property search failed:", error);
      // نتیجهٔ قبلی در خطا حفظ می‌شود تا نقشه ناگهان خالی نشود.
    } finally {
      setIsSearching(false);
    }
  }

  /**
   * ----------------------------------------------------------
   * جستجوی اولیه
   *
   * هنگام ورود به صفحه Search، یک بار اطلاعات واقعی
   * Backend دریافت می‌شود تا املاک روی نقشه نمایش داده شوند.
   *
   * این Effect فقط در Mount اولیه اجرا می‌شود و با تغییر
   * فیلترها دوباره اجرا نخواهد شد.
   * ----------------------------------------------------------
   */
  useEffect(() => {
    void search();

    // عمداً فقط یک بار در زمان Mount اجرا می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    filters,
    appliedFilters,

    /**
     * نتایج واقعی جستجو
     */
    results,

    setFilter,
    setQuickFilter,
    resetFilters,
    getActiveFilterCount,

    /**
     * جستجوی واقعی Backend
     */
    search,

    isSearching,
  };
}
