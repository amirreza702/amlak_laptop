import type { ReactNode } from "react";

type HashtiPanelWorkspaceProps = {
  children: ReactNode;
  sidebar: ReactNode;
  sidebarLabel: string;
  className?: string;
  contentClassName?: string;
};

/**
 * قاب مرکزی و مشترک پنل‌های هشتی:
 * لایه دوم، نوار ابزار و سطح محتوای ابزار را یکپارچه مدیریت می‌کند.
 */
export function HashtiPanelWorkspace({
  children,
  sidebar,
  sidebarLabel,
  className = "",
  contentClassName = "",
}: HashtiPanelWorkspaceProps) {
  return (
    <div className={`hashti-panel-workspace ${className}`}>
      <aside aria-label={sidebarLabel} className="hashti-panel-sidebar">
        {sidebar}
      </aside>
      <main className={`hashti-panel-content ${contentClassName}`}>
        {children}
      </main>
    </div>
  );
}
