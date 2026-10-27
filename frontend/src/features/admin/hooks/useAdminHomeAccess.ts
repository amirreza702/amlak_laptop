"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/api/authApi";

export function useAdminHomeAccess() {
  const [error, setError] = useState("");
  useEffect(() => {
    getCurrentUser()
      .then(user => { if (user.role !== "HASHTI") setError("دسترسی کارکنان هشتی لازم است."); })
      .catch(() => setError("ابتدا وارد حساب مدیریتی شوید."));
  }, []);
  return error;
}
