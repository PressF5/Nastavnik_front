"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";
import { RegionAdminDashboard } from "@/components/dashboard/region-admin-dashboard";
import { MsuAdminDashboard } from "@/components/dashboard/msu-admin-dashboard";
import { OoAdminDashboard } from "@/components/dashboard/oo-admin-dashboard";
import { MenteeDashboard } from "@/components/dashboard/mentee-dashboard";
import { MentorDashboard } from "@/components/dashboard/mentor-dashboard";

export default function DashboardPage() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-slate-600">Проверяем авторизацию...</p>
      </main>
    );
  }

  switch (user.role) {
    case "REGION_ADMIN":
      return <RegionAdminDashboard />;

    case "MSU_ADMIN":
      return <MsuAdminDashboard />;

    case "OO_ADMIN":
      return <OoAdminDashboard />;

    case "MENTEE":
      return <MenteeDashboard />;

    case "MENTOR":
      return <MentorDashboard />;

    default:
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
          <p className="text-sm text-slate-600">
            Кабинет для этой роли пока не реализован.
          </p>
        </main>
      );
  }
}
