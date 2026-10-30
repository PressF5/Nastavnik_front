"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type DashboardSection =
  | "overview"
  | "msus"
  | "region-organizations"
  | "organizations"
  | "requests"
  | "accounts"
  | "oo-accounts";

type DashboardShellContextValue = {
  section: DashboardSection;
  setSection: (section: DashboardSection) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(
  null,
);

export function DashboardShellProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<DashboardSection>("overview");

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardShellContext.Provider
      value={{
        section,
        setSection,
        collapsed,
        setCollapsed,
        mobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell() {
  const context = useContext(DashboardShellContext);

  if (!context) {
    throw new Error(
      "useDashboardShell должен использоваться внутри DashboardShellProvider.",
    );
  }

  return context;
}
