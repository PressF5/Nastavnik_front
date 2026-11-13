"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, UserRound, CheckCircle2 } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  OrganizationHierarchyCard,
  type OrganizationContext,
} from "@/components/dashboard/organization-hierarchy-card";

type ProfileFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN"
  | "SELECT"
  | "MULTISELECT";

type ProfileFormField = {
  field: {
    id: number;
    name: string;
    fieldType: ProfileFieldType;
    roles: {
      roleCode: string;
      required: boolean;
      sortOrder: number;
    }[];
  };
  savedValue: {
    valueText: string | null;
    valueNumber: number | null;
    valueBoolean: boolean | null;
    valueDate: string | null;
    selectedOptions: {
      id: number;
      value: string;
      label: string;
    }[];
  } | null;
};

function hasValue(item: ProfileFormField): boolean {
  const saved = item.savedValue;

  if (!saved) {
    return false;
  }

  switch (item.field.fieldType) {
    case "TEXT":
    case "TEXTAREA":
      return Boolean(saved.valueText?.trim());

    case "NUMBER":
      return saved.valueNumber !== null;

    case "BOOLEAN":
      return saved.valueBoolean !== null;

    case "DATE":
      return Boolean(saved.valueDate);

    case "SELECT":
    case "MULTISELECT":
      return saved.selectedOptions.length > 0;
  }
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-[#1D3557]">{value}</p>
        </div>

        <div className="rounded-xl bg-[#E8F0F5] p-3 text-[#457B9D]">{icon}</div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

export function MenteeDashboard() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);

  const organizationContextQuery = useQuery({
    queryKey: ["organization-context", user?.id],
    queryFn: () =>
      apiFetch<OrganizationContext>("/api/organization-context/current"),
    enabled: user?.role === "MENTEE",
  });

  const profileQuery = useQuery({
    queryKey: ["profile", "my-form", user?.id],
    queryFn: () => apiFetch<ProfileFormField[]>("/api/profile-values/my-form"),
    enabled: user?.role === "MENTEE",
  });

  const fields = profileQuery.data ?? [];

  const requiredFields = fields.filter((item) =>
    item.field.roles.some(
      (role) => role.roleCode === "MENTEE" && role.required,
    ),
  );

  const completedRequiredFields = requiredFields.filter(hasValue).length;

  const completedFields = fields.filter(hasValue).length;

  const profileStatus = profileQuery.isPending
    ? "Загружаем анкету"
    : profileQuery.isError
      ? "Не удалось загрузить"
      : fields.length === 0
        ? "Поля не настроены"
        : requiredFields.length === 0
          ? "Можно заполнить"
          : completedRequiredFields === requiredFields.length
            ? "Обязательные поля заполнены"
            : "Требуется заполнение";

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        <DashboardPageHeader
          title="Кабинет наставляемого"
          description="Личный кабинет молодого специалиста."
          action={
            <button
              type="button"
              onClick={() => router.push("/dashboard/profile")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D3557] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#27476f]"
            >
              <UserRound size={17} />
              Моя анкета
            </button>
          }
        />

        <OrganizationHierarchyCard
          context={organizationContextQuery.data}
          isLoading={organizationContextQuery.isPending}
          isError={organizationContextQuery.isError}
        />

        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#1D3557]">
            Мой профиль
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Всего полей"
              value={profileQuery.isPending ? "—" : fields.length}
              description="Активные поля анкеты, настроенные администратором региона."
              icon={<ClipboardList size={21} />}
            />

            <StatCard
              title="Обязательные поля"
              value={
                profileQuery.isPending
                  ? "—"
                  : `${completedRequiredFields} / ${requiredFields.length}`
              }
              description="Количество обязательных полей, которые уже заполнены."
              icon={<CheckCircle2 size={21} />}
            />

            <StatCard
              title="Заполнено полей"
              value={
                profileQuery.isPending
                  ? "—"
                  : `${completedFields} / ${fields.length}`
              }
              description="Все заполненные поля анкеты."
              icon={<UserRound size={21} />}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-[#1D3557]">Состояние анкеты</h2>

          <p className="mt-2 text-sm text-slate-600">{profileStatus}</p>

          {profileQuery.isError && (
            <button
              type="button"
              onClick={() => void profileQuery.refetch()}
              className="mt-3 text-sm font-medium text-[#457B9D] hover:underline"
            >
              Повторить загрузку
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/dashboard/profile")}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ClipboardList size={17} />
            Перейти к заполнению анкеты
          </button>
        </section>
      </div>
    </main>
  );
}
