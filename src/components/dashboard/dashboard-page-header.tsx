import type { ReactNode } from "react";

type DashboardPageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function DashboardPageHeader({
  title,
  description,
  action,
}: DashboardPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-[#1D3557]">{title}</h1>

        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  );
}
