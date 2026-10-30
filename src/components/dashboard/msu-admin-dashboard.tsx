"use client";

import { useState } from "react";
import {
  Building2,
  Check,
  ClipboardCheck,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardShell } from "@/components/dashboard/dashboard-shell-context";

type Msu = {
  id: number;
  code: number;
  name: string;
  regionId: number;
};

type EducationalOrganization = {
  id: number;
  code: number;
  name: string;
  msuId: number;
};

type AdminUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  isBlock: boolean;
  role: string;
  accountStatus: "PENDING" | "ACCEPTED" | "REJECTED";
};

type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D3557] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#27476f] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20";

function errorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Произошла непредвиденная ошибка.";
}

function fullName(user: AdminUser) {
  return [user.lastName, user.firstName, user.middleName]
    .filter(Boolean)
    .join(" ");
}

function StatusBadge({ status }: { status: AdminUser["accountStatus"] }) {
  const styles = {
    PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
    ACCEPTED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    REJECTED: "bg-red-50 text-red-800 ring-red-200",
  };
  const labels = {
    PENDING: "Ожидает подтверждения",
    ACCEPTED: "Подтверждена",
    REJECTED: "Отклонена",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1D3557]">
            {value}
          </p>
        </div>
        <div className="rounded-xl bg-[#E8F0F5] p-3 text-[#457B9D]">{icon}</div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

export function MsuAdminDashboard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { section, setSection } = useDashboardShell();
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [organizationPage, setOrganizationPage] = useState(0);

  const msuQuery = useQuery({
    queryKey: ["msu-admin", user?.id, "current-msu"],
    queryFn: () => apiFetch<Msu>("/api/admin/msus/current"),
    enabled: user?.role === "MSU_ADMIN",
  });

  const organizationsQuery = useQuery({
    queryKey: [
      "msu-admin",
      user?.id,
      "organizations",
      organizationSearch,
      organizationPage,
    ],
    queryFn: () =>
      apiFetch<SpringPage<EducationalOrganization>>(
        "/api/admin/msus/current/educational-organizations",
        {
          params: {
            search: organizationSearch,
            page: organizationPage,
            size: 10,
          },
        },
      ),
    enabled: user?.role === "MSU_ADMIN",
  });

  const pendingAdminsQuery = useQuery({
    queryKey: ["msu-admin", user?.id, "pending-oo-admins"],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: { role: "OO_ADMIN", status: "PENDING", page: 0, size: 100 },
      }),
    enabled: user?.role === "MSU_ADMIN",
  });

  const accountsQuery = useQuery({
    queryKey: ["msu-admin", user?.id, "oo-admins"],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: { role: "OO_ADMIN", page: 0, size: 100 },
      }),
    enabled: user?.role === "MSU_ADMIN",
  });

  const invalidateDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["msu-admin", user?.id, "current-msu"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["msu-admin", user?.id, "organizations"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["msu-admin", user?.id, "pending-oo-admins"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["msu-admin", user?.id, "oo-admins"],
      }),
    ]);
  };

  const decisionMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: number;
      action: "approve" | "reject";
    }) =>
      apiFetch<AdminUser>(`/api/admin/users/${id}/${action}`, {
        method: "PATCH",
      }),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.action === "approve"
          ? "Учётная запись администратора ОО подтверждена."
          : "Заявка администратора ОО отклонена.",
      );
      await invalidateDashboard();
    },
    onError: (error) =>
      toast.error("Не удалось обработать заявку", {
        description: errorMessage(error),
      }),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "block" | "unblock" }) =>
      apiFetch<AdminUser>(`/api/admin/users/${id}/${action}`, {
        method: "PATCH",
      }),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.action === "block"
          ? "Учётная запись заблокирована."
          : "Учётная запись разблокирована.",
      );
      await invalidateDashboard();
    },
    onError: (error) =>
      toast.error("Не удалось изменить блокировку", {
        description: errorMessage(error),
      }),
  });

  const pendingAdmins = pendingAdminsQuery.data?.content ?? [];
  const organizations = organizationsQuery.data?.content ?? [];
  const accounts = accountsQuery.data?.content ?? [];
  const isRefreshing =
    msuQuery.isFetching ||
    organizationsQuery.isFetching ||
    pendingAdminsQuery.isFetching ||
    accountsQuery.isFetching;
  const hasError =
    msuQuery.isError ||
    organizationsQuery.isError ||
    pendingAdminsQuery.isError ||
    accountsQuery.isError;

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#1D3557]">
              Кабинет администратора МСУ
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Управление образовательными организациями и заявками
              администраторов ОО.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void invalidateDashboard()}
            disabled={isRefreshing}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
            />
            Обновить
          </button>
        </div>

        {hasError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>
              Не удалось загрузить часть данных. Проверь доступность backend и
              права доступа.
            </p>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void invalidateDashboard()}
            >
              Повторить
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Моё МСУ"
            value={
              msuQuery.isPending ? "—" : (msuQuery.data?.name ?? "Нет данных")
            }
            description={
              msuQuery.data
                ? `Код: ${msuQuery.data.code}`
                : "Текущее муниципальное управление"
            }
            icon={<Building2 size={21} />}
          />
          <StatCard
            title="Образовательные организации"
            value={
              organizationsQuery.isPending
                ? "—"
                : (organizationsQuery.data?.totalElements ?? 0)
            }
            description="Организации, относящиеся к вашему МСУ"
            icon={<Building2 size={21} />}
          />
          <StatCard
            title="Заявки на подтверждение"
            value={
              pendingAdminsQuery.isPending
                ? "—"
                : (pendingAdminsQuery.data?.totalElements ?? 0)
            }
            description="Регистрации администраторов ОО, ожидающие решения"
            icon={<ClipboardCheck size={21} />}
          />
        </section>

        {section === "overview" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#1D3557]">
                  Требуют внимания
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Заявки администраторов образовательных организаций
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSection("requests")}
                className="text-sm font-semibold text-[#457B9D] hover:underline"
              >
                Все заявки
              </button>
            </div>
            {pendingAdminsQuery.isPending ? (
              <p className="py-8 text-sm text-slate-500">Загружаем заявки...</p>
            ) : pendingAdmins.length === 0 ? (
              <p className="py-8 text-sm text-slate-500">
                Нет заявок, ожидающих подтверждения.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {pendingAdmins.slice(0, 5).map((admin) => (
                  <div
                    key={admin.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {fullName(admin)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {admin.email}
                      </p>
                    </div>
                    <StatusBadge status={admin.accountStatus} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {section === "organizations" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#1D3557]">
                  Образовательные организации
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Список организаций вашего МСУ
                </p>
              </div>
              <form
                className="flex w-full gap-2 sm:w-auto"
                onSubmit={(event) => {
                  event.preventDefault();
                  setOrganizationPage(0);
                  void organizationsQuery.refetch();
                }}
              >
                <div className="relative min-w-0 flex-1 sm:w-72">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    aria-label="Поиск образовательных организаций"
                    value={organizationSearch}
                    onChange={(event) => {
                      setOrganizationSearch(event.target.value);
                      setOrganizationPage(0);
                    }}
                    placeholder="Поиск по названию или коду"
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <button type="submit" className={secondaryButton}>
                  Найти
                </button>
              </form>
            </div>

            {organizationsQuery.isPending ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Загружаем организации...
              </p>
            ) : organizations.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Образовательные организации не найдены.
              </p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-135 text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-3 font-semibold">Код</th>
                        <th className="px-3 py-3 font-semibold">Название</th>
                        <th className="px-3 py-3 font-semibold">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {organizations.map((organization) => (
                        <tr key={organization.id}>
                          <td className="px-3 py-4 text-slate-600">
                            {organization.code}
                          </td>
                          <td className="px-3 py-4 font-medium text-slate-900">
                            {organization.name}
                          </td>
                          <td className="px-3 py-4 text-slate-600">
                            {organization.id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <span>
                    Всего: {organizationsQuery.data?.totalElements ?? 0}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={organizationsQuery.data?.first ?? true}
                      onClick={() =>
                        setOrganizationPage((page) => Math.max(0, page - 1))
                      }
                    >
                      Назад
                    </button>
                    <span>
                      Страница {organizationPage + 1} из{" "}
                      {Math.max(1, organizationsQuery.data?.totalPages ?? 0)}
                    </span>
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={organizationsQuery.data?.last ?? true}
                      onClick={() => setOrganizationPage((page) => page + 1)}
                    >
                      Вперёд
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {section === "requests" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-[#1D3557]">
              Заявки администраторов ОО
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Подтверждение или отклонение регистрации
            </p>
            {pendingAdminsQuery.isPending ? (
              <p className="py-10 text-sm text-slate-500">
                Загружаем заявки...
              </p>
            ) : pendingAdmins.length === 0 ? (
              <p className="py-10 text-sm text-slate-500">
                Нет заявок, ожидающих подтверждения.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pendingAdmins.map((admin) => (
                  <article
                    key={admin.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#457B9D]/50 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#457B9D]/10 text-[#457B9D]">
                          <Users size={22} />
                        </div>

                        <StatusBadge status={admin.accountStatus} />
                      </div>

                      <h3 className="mt-4 font-semibold leading-6 text-[#1D3557]">
                        {fullName(admin)}
                      </h3>

                      <p className="mt-1 break-all text-sm text-slate-500">
                        {admin.email}
                      </p>

                      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                        Тип учётной записи
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-700">
                        Администратор образовательной организации
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={decisionMutation.isPending}
                        onClick={() =>
                          decisionMutation.mutate({
                            id: admin.id,
                            action: "approve",
                          })
                        }
                      >
                        <Check size={15} />
                        Подтвердить
                      </button>

                      <button
                        type="button"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={decisionMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Отклонить заявку ${fullName(admin)}?`,
                            )
                          ) {
                            decisionMutation.mutate({
                              id: admin.id,
                              action: "reject",
                            });
                          }
                        }}
                      >
                        <X size={15} />
                        Отклонить
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {section === "oo-accounts" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-[#1D3557]">Администраторы ОО</h2>
            <p className="mt-1 text-sm text-slate-500">
              Учётные записи образовательных организаций вашего МСУ
            </p>
            {accountsQuery.isPending ? (
              <p className="py-10 text-sm text-slate-500">
                Загружаем учётные записи...
              </p>
            ) : accounts.length === 0 ? (
              <p className="py-10 text-sm text-slate-500">
                Учётные записи не найдены.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-180 text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">ФИО</th>
                      <th className="px-3 py-3 font-semibold">Email</th>
                      <th className="px-3 py-3 font-semibold">Статус</th>
                      <th className="px-3 py-3 font-semibold">Блокировка</th>
                      <th className="px-3 py-3 font-semibold">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((admin) => (
                      <tr key={admin.id}>
                        <td className="px-3 py-4 font-medium text-slate-900">
                          {fullName(admin)}
                        </td>
                        <td className="px-3 py-4 text-slate-600">
                          {admin.email}
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge status={admin.accountStatus} />
                        </td>
                        <td className="px-3 py-4">
                          {admin.isBlock ? (
                            <span className="font-medium text-red-700">
                              Заблокирован
                            </span>
                          ) : (
                            <span className="text-slate-600">Нет</span>
                          )}
                        </td>
                        <td className="px-3 py-4">
                          {admin.accountStatus === "ACCEPTED" && (
                            <button
                              type="button"
                              disabled={blockMutation.isPending}
                              onClick={() => {
                                const action = admin.isBlock
                                  ? "unblock"
                                  : "block";
                                const verb = admin.isBlock
                                  ? "Разблокировать"
                                  : "Заблокировать";
                                if (
                                  window.confirm(
                                    `${verb} учётную запись ${fullName(admin)}?`,
                                  )
                                )
                                  blockMutation.mutate({
                                    id: admin.id,
                                    action,
                                  });
                              }}
                              className={
                                admin.isBlock
                                  ? "rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                  : "rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              }
                            >
                              {admin.isBlock
                                ? "Разблокировать"
                                : "Заблокировать"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users size={14} />
          Данные отображаются в пределах вашего МСУ согласно правам доступа.
        </div>
      </div>
    </main>
  );
}
