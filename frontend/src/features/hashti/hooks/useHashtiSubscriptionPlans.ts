"use client";

import { useEffect, useState } from "react";
import { getHashtiSubscriptionPlans } from "@/features/hashti/api/hashtiApi";
import type { AdminSubscriptionPlan } from "@/features/hashti/types/hashti";

export function useHashtiSubscriptionPlans() {
  const [adminSubscriptionPlans, setAdminSubscriptionPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [subscriptionPlansError, setSubscriptionPlansError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getHashtiSubscriptionPlans()
      .then((result) => {
        if (active) setAdminSubscriptionPlans(result.plans);
      })
      .catch((error: unknown) => {
        if (active) {
          setSubscriptionPlansError(
            error instanceof Error ? error.message : "دریافت پلن‌های اشتراک انجام نشد."
          );
        }
      });
    return () => { active = false; };
  }, []);

  return { adminSubscriptionPlans, subscriptionPlansError };
}
