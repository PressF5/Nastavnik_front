"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeft, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import {
  DashboardShellProvider,
  useDashboardShell,
} from "@/components/dashboard/dashboard-shell-context";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

function DashboardShellContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } =
    useDashboardShell();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await apiFetch<void>("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Не удалось завершить сессию на сервере.", error);
    } finally {
      clearAuth();
      router.replace("/login");
    }
  }

  const pageTitle = pathname.includes("/profile")
    ? "Мой профиль"
    : pathname.includes("/msus/")
      ? "Муниципальное управление"
      : "Панель управления";

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] text-slate-900">
      <DashboardSidebar onLogout={handleLogout} isLoggingOut={isLoggingOut} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileOpen(true);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              aria-label="Открыть или свернуть меню"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            >
              {collapsed ? <PanelLeft size={20} /> : <Menu size={20} />}
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1D3557]">
                НАСТАВНИК+
              </p>
              <p className="truncate text-xs text-slate-500">{pageTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/profile")}
            className="flex shrink-0 items-center gap-2 rounded-lg p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Открыть профиль"
          >
            <UserRound size={19} />
            <span className="hidden max-w-40 truncate text-sm sm:block">
              {user ? `${user.lastName} ${user.firstName}` : "Профиль"}
            </span>
          </button>
        </header>

        {children}
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardShellProvider>
      <DashboardShellContent>{children}</DashboardShellContent>
    </DashboardShellProvider>
  );
}
