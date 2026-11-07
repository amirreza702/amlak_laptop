import type { ReactNode } from "react";

type HashtiPanelWorkspaceProps = {
  children: ReactNode;
  className?: string;
};

/** لایه دوم مشترک پنل‌ها؛ ابزارها و محتوای اصلی را در یک قاب واحد نگه می‌دارد. */
export function HashtiPanelWorkspace({ children, className = "" }: HashtiPanelWorkspaceProps) {
  return <div className={`hashti-panel-workspace ${className}`}>{children}</div>;
}
