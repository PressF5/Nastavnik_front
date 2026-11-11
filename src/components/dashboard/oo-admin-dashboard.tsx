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

  const pendingMenteesQuery = useQuery({
    queryKey: ["oo-admin", user?.id, "pending-mentees"],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: {
          role: "MENTEE",
          status: "PENDING",
          page: 0,
          size: 100,
        },
      }),
    enabled: user?.role === "OO_ADMIN",
  });

  const menteesQuery = useQuery({
    queryKey: ["oo-admin", user?.id, "mentees"],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: {
          role: "MENTEE",
          page: 0,
          size: 100,
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

  const acceptedMentees = mentees.filter(
    (mentee) => mentee.accountStatus === "ACCEPTED",
  );

  const isRefreshing =
    pendingMenteesQuery.isFetching || menteesQuery.isFetching;

  const hasError = pendingMenteesQuery.isError || menteesQuery.isError;

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#1D3557]">
              Кабинет администратора ОО
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Управление наставляемыми и организация наставничества.
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
                value={menteesQuery.isPending ? "—" : acceptedMentees.length}
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
          </section>
        )}

        {section === "mentees" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-[#1D3557]">Наставляемые</h2>

            <p className="mt-1 text-sm text-slate-500">
              Учётные записи наставляемых вашей образовательной организации
            </p>

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
