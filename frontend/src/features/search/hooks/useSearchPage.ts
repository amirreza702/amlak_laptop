"use client";

import { useState } from "react";
import { usePropertySearch } from "./usePropertySearch";

/** وضعیت سطح صفحه جستجو؛ منطق فیلترها و دریافت نتایج در usePropertySearch است. */
export function useSearchPage() {
  const searchState = usePropertySearch();
  const [activePanel, setActivePanel] = useState<"filters" | "smart" | null>(null);

  const closePanel = () => setActivePanel(null);

  return {
    ...searchState,
    activePanel,
    setActivePanel,
    closePanel,
  };
}
