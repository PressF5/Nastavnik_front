"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";

import { useAuthStore } from "@/store/auth-store";

const roleLabels: Record<string, string> = {
  REGION_ADMIN: "Администратор региона",
  MSU_ADMIN: "Администратор МСУ",
  OO_ADMIN: "Администратор образовательной организации",
  MENTOR: "Наставник",
  MENTEE: "Наставляемый",
};

const statusLabels: Record<string, string> = {
  PENDING: "Ожидает подтверждения",
  ACCEPTED: "Подтверждена",
  REJECTED: "Отклонена",
};

export default function ProfilePage() {
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
      <main className="flex min-h-64 items-center justify-center p-6">
        <p className="text-sm text-slate-600">Проверяем авторизацию...</p>
      </main>
    );
  }

  const fullName = [user.lastName, user.firstName, user.middleName]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-w-0 bg-[#F8F9FA] p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Вернуться в кабинет
        </button>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#E8F0F5] text-[#457B9D]">
              <UserRound size={28} />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-[#1D3557]">Профиль</h1>
              <p className="mt-1 wrap-break-word text-sm text-slate-500">
                {user.email}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Фамилия</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {user.lastName}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Имя</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {user.firstName}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Отчество</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {user.middleName || "Не указано"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Полное имя</dt>
              <dd className="mt-1 font-medium text-slate-900">{fullName}</dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Электронная почта</dt>
              <dd className="mt-1 wrap-break-word font-medium text-slate-900">
                {user.email}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Роль</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {roleLabels[user.role] ?? user.role}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Статус учётной записи</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {statusLabels[user.accountStatus] ?? user.accountStatus}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
