"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardPage() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

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

  if (!isInitialized || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-slate-600">Проверяем авторизацию...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-6">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#1D3557]">Наставник+</h1>

        <p className="mt-4 text-slate-700">Вы вошли в систему.</p>

        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Пользователь</dt>
            <dd className="font-medium text-slate-900">
              {user.lastName} {user.firstName} {user.middleName ?? ""}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900">{user.email}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Роль</dt>
            <dd className="text-slate-900">{user.role}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Статус учётной записи</dt>
            <dd className="text-slate-900">{user.accountStatus}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-8 rounded-lg bg-[#1D3557] px-5 py-3 text-sm font-semibold text-white hover:bg-[#27476f] disabled:opacity-60"
        >
          {isLoggingOut ? "Выходим..." : "Выйти"}
        </button>
      </section>
    </main>
  );
}
