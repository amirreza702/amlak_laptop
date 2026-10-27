"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTH_STATE_CHANGE_EVENT, getCurrentUser, type UserPublic } from "@/features/auth/api/authApi";
import { getCurrentCustomerProfile } from "../api/customerSearchRequestApi";
import type {
  CustomerProfileForRequest,
  CustomerRequestPropertyType,
  CustomerRequestTransactionType,
} from "../types/customerSearchRequest";
import {
  getCustomerFavorites,
  getCustomerSearchRequests,
  getPublicProperty,
  type CustomerFavoriteRecord,
  type CustomerSearchRequestRecord,
  type PublicPropertyRecord,
} from "../api/customerDashboardApi";
import { getUserNotifications, type UserNotification } from "@/features/notification/api/notificationApi";

/** وضعیت، بارگذاری و تازه‌سازی داده‌های خصوصی داشبورد مشتری. */
export function useCustomerDashboardData() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [profile, setProfile] = useState<CustomerProfileForRequest | null>(null);
  const [requests, setRequests] = useState<CustomerSearchRequestRecord[]>([]);
  const [favorites, setFavorites] = useState<Array<CustomerFavoriteRecord & { property: PublicPropertyRecord | null }>>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ city: "", budget: "", description: "", transactionType: "SALE" as CustomerRequestTransactionType, propertyType: "APARTMENT" as CustomerRequestPropertyType });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const refreshData = useCallback(async (customer: CustomerProfileForRequest, authenticatedUser: UserPublic) => {
    const [requestsResult, favoritesResult, notificationsResult] = await Promise.allSettled([
      getCustomerSearchRequests(customer.id),
      getCustomerFavorites(customer.id),
      getUserNotifications(authenticatedUser.id),
    ]);

    if (requestsResult.status === "fulfilled") setRequests(requestsResult.value);
    else setActionError(requestsResult.reason instanceof Error ? requestsResult.reason.message : "دریافت درخواست‌ها انجام نشد.");

    if (favoritesResult.status === "fulfilled") {
      const favoriteRecords = favoritesResult.value;
      const enriched = await Promise.all(favoriteRecords.map(async (favorite) => {
        try {
          return { ...favorite, property: await getPublicProperty(favorite.propertyId) };
        } catch {
          return { ...favorite, property: null };
        }
      }));
      setFavorites(enriched);
    } else {
      setActionError(favoritesResult.reason instanceof Error ? favoritesResult.reason.message : "دریافت علاقه‌مندی‌ها انجام نشد.");
    }

    if (notificationsResult.status === "fulfilled") setNotifications(notificationsResult.value);
    else setNotifications([]);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const authenticatedUser = await getCurrentUser();
        if (authenticatedUser.role !== "CUSTOMER") {
          throw new Error("این صفحه فقط برای حساب مشتری در دسترس است.");
        }
        const customerProfile = await getCurrentCustomerProfile();
        if (!active) return;
        setUser(authenticatedUser);
        setProfile(customerProfile);
        setFirstName(customerProfile.firstName);
        setLastName(customerProfile.lastName);
        await refreshData(customerProfile, authenticatedUser);
      } catch (error: unknown) {
        if (active) setPageError(error instanceof Error ? error.message : "دریافت پنل مشتری انجام نشد.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [refreshData]);

  // پاک‌سازی اطلاعات خصوصی صفحه وقتی نشست سراسری خروج کند یا نقش عوض شود.
  useEffect(() => {
    let active = true;

    const handleAuthStateChange = async () => {
      try {
        const authenticatedUser = await getCurrentUser();
        if (authenticatedUser.role !== "CUSTOMER") {
          throw new Error("این صفحه فقط برای حساب مشتری در دسترس است.");
        }
        const customerProfile = await getCurrentCustomerProfile();
        if (!active) return;
        setUser(authenticatedUser);
        setProfile(customerProfile);
        setFirstName(customerProfile.firstName);
        setLastName(customerProfile.lastName);
        setPageError(null);
        await refreshData(customerProfile, authenticatedUser);
      } catch {
        if (!active) return;
        setUser(null);
        setProfile(null);
        setRequests([]);
        setFavorites([]);
        setNotifications([]);
        setEditingId(null);
        setPageError("برای مشاهدهٔ پنل، با حساب مشتری وارد شوید.");
        setLoading(false);
      }
    };

    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);
    return () => {
      active = false;
      window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);
    };
  }, [refreshData]);


  return {
    user, setUser, profile, setProfile, requests, setRequests, favorites, setFavorites,
    notifications, setNotifications, loading, setLoading, pageError, setPageError,
    actionMessage, setActionMessage, actionError, setActionError, busyId, setBusyId,
    editingId, setEditingId, editValues, setEditValues, firstName, setFirstName,
    lastName, setLastName, refreshData,
  };
}
