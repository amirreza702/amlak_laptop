"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "xl" | "full";
}

export function Modal({ open, title, description, onClose, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === "full" ? "max-w-6xl" : size === "xl" ? "max-w-4xl" : "max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-[#071a32]/60 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      role="presentation"
    >
      <section role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-xl border border-[#d9c8a7]/70 bg-white shadow-[0_28px_90px_rgba(3,24,49,.3)]`}
        dir="rtl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e8edf2] bg-[#fbfcfd]/95 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-black text-[#062a5b]">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="بستن پنجره" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#b89650] hover:bg-[#f7f4ef] hover:text-[#062a5b]">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
      </section>
    </div>
  );
}
