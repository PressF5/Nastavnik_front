"use client";

import {
  Building2,
  ClipboardCheck,
  RefreshCw,
  UserRound,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardShell } from "@/components/dashboard/dashboard-shell-context";
import { UserAccountCard } from "@/components/dashboard/user-account-card";
import { UserRequestCard } from "@/components/dashboard/user-request-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  OrganizationHierarchyCard,
  type OrganizationContext,
} from "@/components/dashboard/organization-hierarchy-card";

import { useState } from "react";

type AdminUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  isBlock: boolean;
  role: string;
  accountStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  educationalOrganizationName: string | null;
  msuName: string | null;
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

const PAGE_SIZE = 9;

function errorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Произошла непредвиденная ошибка.";
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
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

export function OoAdminDashboard() {
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const { section, setSection } = useDashboardShell();

  const [requestSearchInput, setRequestSearchInput] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestPage, setRequestPage] = useState(0);

  const [menteeSearchInput, setMenteeSearchInput] = useState("");
  const [menteeSearch, setMenteeSearch] = useState("");
  const [menteePage, setMenteePage] = useState(0);

  const pendingMenteesQuery = useQuery({
    queryKey: [
      "oo-admin",
      user?.id,
      "pending-mentees",
      requestSearch,
      requestPage,
    ],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: {
          role: "MENTEE",
          status: "PENDING",
          search: requestSearch || undefined,
          page: requestPage,
          size: PAGE_SIZE,
        },
      }),
    enabled: user?.role === "OO_ADMIN",
  });

  const menteesQuery = useQuery({
    queryKey: ["oo-admin", user?.id, "mentees", menteeSearch, menteePage],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: {
          role: "MENTEE",
          search: menteeSearch || undefined,
          page: menteePage,
          size: PAGE_SIZE,
        },
      }),
    enabled: user?.role === "OO_ADMIN",
  });

  const organizationContextQuery = useQuery({
    queryKey: ["organization-context", user?.id],
    queryFn: () =>
      apiFetch<OrganizationContext>("/api/organization-context/current"),
    enabled: user?.role === "OO_ADMIN",
  });

  const acceptedMenteesQuery = useQuery({
    queryKey: ["oo-admin", user?.id, "accepted-mentees-count"],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: {
          role: "MENTEE",
          status: "ACCEPTED",
          page: 0,
          size: 1,
        },
      }),
    enabled: user?.role === "OO_ADMIN",
  });

  const invalidateDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["oo-admin", user?.id, "pending-mentees"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["oo-admin", user?.id, "mentees"],
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
          ? "Регистрация наставляемого подтверждена."
          : "Заявка наставляемого отклонена.",
      );

      await invalidateDashboard();
    },

    onError: (error) => {
      toast.error("Не удалось обработать заявку", {
        description: errorMessage(error),
      });
    },
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

    onError: (error) => {
      toast.error("Не удалось изменить блокировку", {
        description: errorMessage(error),
      });
    },
  });

  const pendingMentees = pendingMenteesQuery.data?.content ?? [];
  const mentees = menteesQuery.data?.content ?? [];

  const isRefreshing =
    pendingMenteesQuery.isFetching ||
    menteesQuery.isFetching ||
    acceptedMenteesQuery.isFetching;

  const hasError =
    pendingMenteesQuery.isError ||
    menteesQuery.isError ||
    acceptedMenteesQuery.isError;

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        <DashboardPageHeader
          title="Кабинет администратора ОО"
          description="Управление наставляемыми и организация наставничества."
          action={
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
          }
        />

        {hasError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>
              Не удалось загрузить часть данных. Проверь backend и права
              доступа.
            </p>

            <button
              type="button"
              onClick={() => void invalidateDashboard()}
              className="font-semibold underline"
            >
              Повторить
            </button>
          </div>
        )}

        {section === "overview" && (
          <>
            <OrganizationHierarchyCard
              context={organizationContextQuery.data}
              isLoading={organizationContextQuery.isPending}
              isError={organizationContextQuery.isError}
            />
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title="Наставляемые"
                value={
                  menteesQuery.isPending
                    ? "—"
                    : (menteesQuery.data?.totalElements ?? 0)
                }
                description="Все учётные записи вашей образовательной организации"
                icon={<Users size={21} />}
              />

              <StatCard
                title="Подтверждённые"
                value={
                  acceptedMenteesQuery.isPending
                    ? "—"
                    : (acceptedMenteesQuery.data?.totalElements ?? 0)
                }
                description="Наставляемые с подтверждённой учётной записью"
                icon={<UserRound size={21} />}
              />

              <StatCard
                title="Заявки"
                value={
                  pendingMenteesQuery.isPending
                    ? "—"
                    : (pendingMenteesQuery.data?.totalElements ?? 0)
                }
                description="Ожидают решения администратора"
                icon={<ClipboardCheck size={21} />}
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="font-semibold text-[#1D3557]">Требуют внимания</h2>

              <p className="mt-1 text-sm text-slate-500">
                Заявки наставляемых, ожидающие подтверждения
              </p>

              {pendingMenteesQuery.isPending ? (
                <p className="py-8 text-sm text-slate-500">
                  Загружаем заявки...
                </p>
              ) : pendingMentees.length === 0 ? (
                <p className="py-8 text-sm text-slate-500">
                  Нет заявок, ожидающих подтверждения.
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {pendingMentees.slice(0, 3).map((mentee) => (
                    <UserRequestCard
                      key={mentee.id}
                      user={mentee}
                      icon={<Users size={22} />}
                      roleLabel="Наставляемый"
                      details={[
                        {
                          label: "Образовательная организация",
                          value:
                            mentee.educationalOrganizationName ?? "Не указана",
                        },
                      ]}
                      pending={decisionMutation.isPending}
                      onApprove={() =>
                        decisionMutation.mutate({
                          id: mentee.id,
                          action: "approve",
                        })
                      }
                      onReject={() =>
                        decisionMutation.mutate({
                          id: mentee.id,
                          action: "reject",
                        })
                      }
                    />
                  ))}
                </div>
              )}

              {pendingMentees.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSection("mentee-requests")}
                  className="mt-5 text-sm font-semibold text-[#457B9D] hover:underline"
                >
                  Все заявки
                </button>
              )}
            </section>
          </>
        )}

        {section === "mentee-requests" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-[#1D3557]">
              Заявки наставляемых
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Подтверждение или отклонение регистрации
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setRequestPage(0);
                setRequestSearch(requestSearchInput.trim());
              }}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="search"
                value={requestSearchInput}
                onChange={(event) => setRequestSearchInput(event.target.value)}
                placeholder="Поиск по ФИО или электронной почте"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20"
              />

              <button type="submit" className={primaryButton}>
                Найти
              </button>

              <button
                type="button"
                className={secondaryButton}
                onClick={() => {
                  setRequestSearchInput("");
                  setRequestSearch("");
                  setRequestPage(0);
                }}
              >
                Сбросить
              </button>
            </form>

            {pendingMenteesQuery.isPending ? (
              <p className="py-10 text-sm text-slate-500">
                Загружаем заявки...
              </p>
            ) : pendingMentees.length === 0 ? (
              <p className="py-10 text-sm text-slate-500">
                Нет заявок, ожидающих подтверждения.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pendingMentees.map((mentee) => (
                  <UserRequestCard
                    key={mentee.id}
                    user={mentee}
                    icon={<Users size={22} />}
                    roleLabel="Наставляемый"
                    details={[
                      {
                        label: "Образовательная организация",
                        value:
                          mentee.educationalOrganizationName ?? "Не указана",
                      },
                    ]}
                    pending={decisionMutation.isPending}
                    onApprove={() =>
                      decisionMutation.mutate({
                        id: mentee.id,
                        action: "approve",
                      })
                    }
                    onReject={() =>
                      decisionMutation.mutate({
                        id: mentee.id,
                        action: "reject",
                      })
                    }
                  />
                ))}
              </div>
            )}
            {pendingMenteesQuery.data &&
              pendingMenteesQuery.data.totalPages > 0 && (
                <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                  <p className="text-sm text-slate-500">
                    Всего заявок: {pendingMenteesQuery.data.totalElements}
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={pendingMenteesQuery.data.first}
                      onClick={() =>
                        setRequestPage((page) => Math.max(0, page - 1))
                      }
                      className={secondaryButton}
                    >
                      Назад
                    </button>

                    <span className="text-sm text-slate-600">
                      Страница {pendingMenteesQuery.data.number + 1} из{" "}
                      {pendingMenteesQuery.data.totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={pendingMenteesQuery.data.last}
                      onClick={() => setRequestPage((page) => page + 1)}
                      className={secondaryButton}
                    >
                      Далее
                    </button>
                  </div>
                </div>
              )}
          </section>
        )}

        {section === "mentees" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-[#1D3557]">Наставляемые</h2>

            <p className="mt-1 text-sm text-slate-500">
              Учётные записи наставляемых вашей образовательной организации
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setMenteePage(0);
                setMenteeSearch(menteeSearchInput.trim());
              }}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="search"
                value={menteeSearchInput}
                onChange={(event) => setMenteeSearchInput(event.target.value)}
                placeholder="Поиск по ФИО или электронной почте"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20"
              />

              <button type="submit" className={primaryButton}>
                Найти
              </button>

              <button
                type="button"
                className={secondaryButton}
                onClick={() => {
                  setMenteeSearchInput("");
                  setMenteeSearch("");
                  setMenteePage(0);
                }}
              >
                Сбросить
              </button>
            </form>

            {menteesQuery.isPending ? (
              <p className="py-10 text-sm text-slate-500">
                Загружаем наставляемых...
              </p>
            ) : mentees.length === 0 ? (
              <p className="py-10 text-sm text-slate-500">
                Наставляемые пока не зарегистрированы.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {mentees.map((mentee) => (
                  <UserAccountCard
                    key={mentee.id}
                    user={mentee}
                    icon={<UserRound size={22} />}
                    roleLabel="Наставляемый"
                    details={[
                      {
                        label: "Образовательная организация",
                        value:
                          mentee.educationalOrganizationName ?? "Не указана",
                      },
                    ]}
                    blockPending={blockMutation.isPending}
                    onToggleBlock={(action) =>
                      blockMutation.mutate({
                        id: mentee.id,
                        action,
                      })
                    }
                  />
                ))}
              </div>
            )}
            {menteesQuery.data && menteesQuery.data.totalPages > 0 && (
              <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <p className="text-sm text-slate-500">
                  Всего наставляемых: {menteesQuery.data.totalElements}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={menteesQuery.data.first}
                    onClick={() =>
                      setMenteePage((page) => Math.max(0, page - 1))
                    }
                    className={secondaryButton}
                  >
                    Назад
                  </button>

                  <span className="text-sm text-slate-600">
                    Страница {menteesQuery.data.number + 1} из{" "}
                    {menteesQuery.data.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={menteesQuery.data.last}
                    onClick={() => setMenteePage((page) => page + 1)}
                    className={secondaryButton}
                  >
                    Далее
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Building2 size={14} />
          Данные отображаются в пределах вашей образовательной организации.
        </div>
      </div>
    </main>
  );
}
