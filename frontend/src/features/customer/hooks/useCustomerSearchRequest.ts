"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AUTH_STATE_CHANGE_EVENT,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type UserPublic,
} from "@/features/auth/api/authApi";
import {
  createCustomerSearchRequest,
  getCurrentCustomerProfile,
} from "../api/customerSearchRequestApi";
import type {
  CreateCustomerSearchRequestInput,
  CustomerProfileForRequest,
  CustomerRequestPropertyType,
  CustomerRequestTransactionType,
  CustomerSearchRequestFormValues,
  CustomerSearchRequestResult,
} from "../types/customerSearchRequest";

export type CustomerRequestAuthStatus =
  | "checking"
  | "anonymous"
  | "customer"
  | "wrong-role"
  | "profile-error";

export type CustomerRequestAuthMode = "login" | "register";

const initialRequestValues: CustomerSearchRequestFormValues = {
  transactionType: "SALE",
  propertyType: "APARTMENT",
  city: "",
  budget: "",
  description: "",
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function translateAuthError(message: string): string {
  if (message.includes("already registered")) {
    return "این شماره موبایل قبلاً ثبت‌نام شده است؛ حالت ورود را انتخاب کنید.";
  }
  if (message.includes("Invalid Iranian mobile number")) {
    return "شماره موبایل باید با 09 شروع شود و ۱۱ رقم داشته باشد.";
  }
  if (message.includes("at least 8 characters")) {
    return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  }
  if (message.includes("incorrect")) {
    return "شماره موبایل یا رمز عبور صحیح نیست.";
  }
  if (message.includes("inactive")) {
    return "این حساب کاربری غیرفعال است.";
  }
  if (message.includes("Customer profile not found") || message.includes("پروفایل مشتری")) {
    return "پروفایل مشتری این حساب در دسترس نیست. اطلاعات نشست و نقش حساب را بررسی کنید.";
  }
  return message;
}

export function useCustomerSearchRequest() {
  const [authStatus, setAuthStatus] = useState<CustomerRequestAuthStatus>("checking");
  const [authMode, setAuthMode] = useState<CustomerRequestAuthMode>("login");
  const [user, setUser] = useState<UserPublic | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfileForRequest | null>(null);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // فقط در ثبت‌نام موفق فعال می‌شود؛ ورود عادی پیام ثبت‌نام نشان نمی‌دهد.
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const [requestValues, setRequestValues] =
    useState<CustomerSearchRequestFormValues>(initialRequestValues);
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] =
    useState<CustomerSearchRequestResult | null>(null);

  const loadCustomerProfile = useCallback(async (): Promise<CustomerProfileForRequest> => {
    const profile = await getCurrentCustomerProfile();
    setCustomerProfile(profile);
    setAuthStatus("customer");
    setAuthError(null);
    return profile;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      let authenticated = false;
      try {
        const currentUser = await getCurrentUser();
        authenticated = true;
        if (!isMounted) return;

        setUser(currentUser);
        if (currentUser.role !== "CUSTOMER") {
          setAuthStatus("wrong-role");
          return;
        }

        const profile = await getCurrentCustomerProfile();
        if (!isMounted) return;
        setCustomerProfile(profile);
        setAuthStatus("customer");
      } catch (error: unknown) {
        if (!isMounted) return;
        if (authenticated) {
          setAuthStatus("profile-error");
          setAuthError(getErrorMessage(error, "دریافت پروفایل مشتری انجام نشد."));
        } else {
          // نشست نامعتبر/منقضی یا نبود نشست: فرم ورود نمایش داده می‌شود.
          setUser(null);
          setCustomerProfile(null);
          setAuthStatus("anonymous");
        }
      }
    }

    void initializeSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // هماهنگ‌سازی فرم درخواست با خروج سراسری و تغییر نقش حساب.
  useEffect(() => {
    let active = true;

    const handleAuthStateChange = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!active) return;
        setUser(currentUser);

        if (currentUser.role !== "CUSTOMER") {
          setCustomerProfile(null);
          setCreatedRequest(null);
          setRegistrationSuccess(false);
          setAuthStatus("wrong-role");
          setAuthError("این بخش فقط برای حساب مشتری در دسترس است.");
          return;
        }

        try {
          const profile = await getCurrentCustomerProfile();
          if (!active) return;
          setCustomerProfile(profile);
          setAuthStatus("customer");
          setAuthError(null);
        } catch (error: unknown) {
          if (!active) return;
          setCustomerProfile(null);
          setAuthStatus("profile-error");
          setAuthError(getErrorMessage(error, "دریافت پروفایل مشتری انجام نشد."));
        }
      } catch {
        if (!active) return;
        setUser(null);
        setCustomerProfile(null);
        setCreatedRequest(null);
        setRegistrationSuccess(false);
        setAuthStatus("anonymous");
        setAuthError(null);
      }
    };

    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);
    return () => {
      active = false;
      window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);
    };
  }, []);

  const changeAuthMode = useCallback((mode: CustomerRequestAuthMode) => {
    setAuthMode(mode);
    setAuthError(null);
    setRegistrationSuccess(false);
  }, []);

  const submitAuthentication = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthError(null);
      setRegistrationSuccess(false);

      const normalizedMobile = mobile.trim();
      if (!normalizedMobile || !password) {
        setAuthError("شماره موبایل و رمز عبور را وارد کنید.");
        return;
      }

      if (authMode === "register") {
        if (!firstName.trim() || !lastName.trim()) {
          setAuthError("نام و نام خانوادگی را وارد کنید.");
          return;
        }
        if (!/^09\d{9}$/.test(normalizedMobile)) {
          setAuthError("شماره موبایل باید با 09 شروع شود و ۱۱ رقم داشته باشد.");
          return;
        }
        if (password.length < 8) {
          setAuthError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
          return;
        }
      }

      setIsAuthSubmitting(true);
      let authenticatedCustomer: UserPublic | null = null;
      try {
        if (authMode === "register") {
          await registerUser({
            mobile: normalizedMobile,
            password,
            role: "CUSTOMER",
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          });
        }

        // ثبت‌نام Session نمی‌سازد؛ پس بعد از ثبت‌نام همان حساب وارد می‌شود.
        const result = await loginUser(normalizedMobile, password, "CUSTOMER");
        if (result.user.role !== "CUSTOMER") {
          try {
            await logoutUser();
            setAuthStatus("anonymous");
          } catch {
            setAuthStatus("wrong-role");
          }
          setUser(null);
          setCustomerProfile(null);
          setAuthError("این شماره به حساب مشتری تعلق ندارد. با حساب مشتری وارد شوید.");
          return;
        }

        authenticatedCustomer = result.user;
        setUser(result.user);
        await loadCustomerProfile();
        if (authMode === "register") {
          setRegistrationSuccess(true);
        }
        setPassword("");
      } catch (error: unknown) {
        if (authenticatedCustomer) {
          // ورود موفق بوده اما دریافت پروفایل خطا داده است؛ علت را شفاف نمایش می‌دهیم.
          setAuthStatus("profile-error");
          setUser(authenticatedCustomer);
        }
        const message = getErrorMessage(
          error,
          "ورود یا ثبت‌نام انجام نشد. دوباره تلاش کنید."
        );
        if (message.includes("already registered")) {
          setAuthMode("login");
        }
        setAuthError(translateAuthError(message));
      } finally {
        setIsAuthSubmitting(false);
      }
    }, [authMode, firstName, lastName, loadCustomerProfile, mobile, password]
  );

  const retryLoadCustomerProfile = useCallback(async () => {
    setAuthError(null);
    setIsAuthSubmitting(true);
    try {
      const currentUser = await getCurrentUser();
      if (currentUser.role !== "CUSTOMER") {
        setUser(currentUser);
        setAuthStatus("wrong-role");
        setAuthError("این بخش مخصوص حساب مشتری است.");
        return;
      }
      setUser(currentUser);
      await loadCustomerProfile();
    } catch (error: unknown) {
      setAuthStatus("profile-error");
      setAuthError(getErrorMessage(error, "دریافت پروفایل مشتری انجام نشد."));
    } finally {
      setIsAuthSubmitting(false);
    }
  }, [loadCustomerProfile]);

  const setRequestField = useCallback(
    <K extends keyof CustomerSearchRequestFormValues>(
      field: K,
      value: CustomerSearchRequestFormValues[K]
    ) => {
      setRequestValues((current) => ({ ...current, [field]: value }));
      setRequestError(null);
    },
    []
  );

  const submitRequest = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setRequestError(null);

      if (authStatus !== "customer" || user?.role !== "CUSTOMER" || !customerProfile?.id) {
        setRequestError("برای ثبت درخواست باید با حساب مشتری وارد شوید.");
        return;
      }

      const city = requestValues.city.trim();
      if (!city) {
        setRequestError("شهر موردنظر را وارد کنید.");
        return;
      }

      let budget: number | undefined;
      if (requestValues.budget.trim()) {
        budget = Number(requestValues.budget);
        if (!Number.isFinite(budget) || budget < 0) {
          setRequestError("بودجه باید عددی معتبر و صفر یا بیشتر باشد.");
          return;
        }
      }

      const payload: CreateCustomerSearchRequestInput = {
        transactionType: requestValues.transactionType as CustomerRequestTransactionType,
        propertyType: requestValues.propertyType as CustomerRequestPropertyType,
        city,
        ...(budget !== undefined ? { budget } : {}),
        ...(requestValues.description.trim()
          ? { description: requestValues.description.trim() }
          : {}),
      };

      setIsRequestSubmitting(true);
      try {
        const result = await createCustomerSearchRequest(customerProfile.id, payload);
        setCreatedRequest(result);
      } catch (error: unknown) {
        setRequestError(
          getErrorMessage(error, "ثبت درخواست انجام نشد. لطفاً دوباره تلاش کنید.")
        );
      } finally {
        setIsRequestSubmitting(false);
      }
    }, [authStatus, customerProfile, requestValues, user]
  );

  const startAnotherRequest = useCallback(() => {
    setRequestValues(initialRequestValues);
    setRequestError(null);
    setCreatedRequest(null);
    setRegistrationSuccess(false);
  }, []);

  return {
    authStatus,
    authMode,
    changeAuthMode,
    user,
    mobile,
    setMobile,
    password,
    setPassword,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    isAuthSubmitting,
    authError,
    registrationSuccess,
    submitAuthentication,
    retryLoadCustomerProfile,
    requestValues,
    setRequestField,
    isRequestSubmitting,
    requestError,
    submitRequest,
    createdRequest,
    startAnotherRequest,
  };
}
