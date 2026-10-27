"use client";

import { createPortal } from "react-dom";
import { useAuthForm } from "../hooks/useAuthForm";
import type { AuthRole } from "../types";

export type { AuthRole } from "../types";

export interface AuthModalProps {
  isOpen: boolean;
  role: AuthRole;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({
  isOpen,
  role,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const {
    mounted,
    mobile,
    password,
    isLoading,
    errorMessage,
    isAgent,
    roleLabel,
    handleMobileChange,
    handlePasswordChange,
    handleSubmit,
  } = useAuthForm({ isOpen, role, onClose, onSuccess });

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن پنجره ورود"
          className="absolute left-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          ✕
        </button>

        <h3 className="mb-6 text-center text-xl font-bold text-gray-800">
          ورود {isAgent ? "مشاور املاک" : "مالک"} به هشتی
        </h3>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              شماره موبایل
            </label>
            <input
              type="text"
              autoComplete="username"
              placeholder="09123456789"
              value={mobile}
              onChange={(event) => handleMobileChange(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              رمز عبور
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => handlePasswordChange(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white shadow-md hover:bg-emerald-700 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? "در حال ورود..." : `ورود به حساب ${roleLabel}`}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
