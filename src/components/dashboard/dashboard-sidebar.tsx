"use client";

import {
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  useDashboardShell,
  type DashboardSection,
} from "@/components/dashboard/dashboard-shell-context";
import { useAuthStore } from "@/store/auth-store";

type DashboardSidebarProps = {
  onLogout: () => void;
  isLoggingOut: boolean;
};

const navigation: {
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "msus", label: "Мой регион: МСУ", icon: Building2 },
  { id: "requests", label: "Заявки", icon: ClipboardCheck },
  { id: "accounts", label: "Администраторы МСУ", icon: UserRound },
];

export function DashboardSidebar({
  onLogout,
  isLoggingOut,
}: DashboardSidebarProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const {
    section,
    setSection,
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
  } = useDashboardShell();

  function navigateToSection(nextSection: DashboardSection) {
    setSection(nextSection);
    setMobileOpen(false);
  }

  function openProfile() {
    setMobileOpen(false);
    router.push("/dashboard/profile");
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white",
          "transition-[width,transform] duration-200",
          "lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
          collapsed ? "lg:w-19" : "lg:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex min-h-20 items-center justify-between border-b border-slate-200 px-4">
          {!collapsed && (
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#457B9D]">
                НАСТАВНИК+
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1D3557]">
                Управление регионом
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Закрыть боковую панель"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
            title={collapsed ? "Развернуть панель" : "Свернуть панель"}
            className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToSection(item.id)}
                title={collapsed ? item.label : undefined}
                className={[
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition",
                  collapsed ? "lg:justify-center lg:px-2" : "",
                  active
                    ? "bg-[#E8F0F5] font-semibold text-[#1D3557]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                <Icon size={19} className="shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={openProfile}
            title={collapsed ? "Профиль пользователя" : undefined}
            className={[
              "flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50",
              collapsed ? "lg:justify-center" : "",
            ].join(" ")}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E8F0F5] font-semibold text-[#1D3557]">
              {user?.firstName?.charAt(0) ?? "П"}
            </div>

            <div
              className={
                collapsed ? "min-w-0 flex-1 lg:hidden" : "min-w-0 flex-1"
              }
            >
              <p className="truncate text-sm font-medium text-slate-800">
                {user ? `${user.lastName} ${user.firstName}` : "Пользователь"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {user?.email ?? ""}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            title={collapsed ? "Выйти" : undefined}
            className={[
              "mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50",
              collapsed ? "lg:justify-center lg:px-2" : "",
            ].join(" ")}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>
              {isLoggingOut ? "Выходим..." : "Выйти"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
