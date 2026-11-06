"use client";

import { useCallback, useState } from "react";

/** وضعیت باز/بسته برای مدال‌ها و پنجره‌های مشترک رابط کاربری */
export function useDisclosure(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);
  return { isOpen, setIsOpen, open, close, toggle };
}
