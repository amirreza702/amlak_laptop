"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ownerApiRequest, type OwnerProfile } from "../api/ownerApi";

/** منطق دریافت و ویرایش پروفایل مالک، مستقل از رابط کاربری پنل. */
export function useOwnerProfile(mobile: string) {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const result = await ownerApiRequest<OwnerProfile>("/owners/me/profile");
      setProfile(result);
      setFirstName(result.firstName);
      setLastName(result.lastName);
    } catch (error: unknown) {
      setProfile(null);
      setProfileError(error instanceof Error ? error.message : "دریافت پروفایل مالک انجام نشد.");
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile, mobile]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setMessage(null);
    try {
      const result = await ownerApiRequest<OwnerProfile>("/owners/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      setProfile((current) => current ? { ...current, firstName: result.firstName, lastName: result.lastName } : current);
      setFirstName(result.firstName);
      setLastName(result.lastName);
      setMessage("اطلاعات پروفایل ذخیره شد.");
    } catch (error: unknown) {
      setProfileError(error instanceof Error ? error.message : "ذخیرهٔ پروفایل انجام نشد.");
    } finally {
      setSavingProfile(false);
    }
  };

  return {
    profile,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    loadingProfile,
    savingProfile,
    profileError,
    message,
    saveProfile,
    reloadProfile: loadProfile,
  };
}
