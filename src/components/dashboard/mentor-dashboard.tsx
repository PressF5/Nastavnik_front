"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  X,
  RefreshCw,
  Users,
  ClipboardCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardShell } from "@/components/dashboard/dashboard-shell-context";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

type MentorshipStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "ENDED";

type Mentorship = {
  id: number;
  mentorId: number;
  mentorFirstName: string;
  mentorLastName: string;
  mentorMiddleName: string | null;
  menteeId: number;
  menteeFirstName: string;
  menteeLastName: string;
  menteeMiddleName: string | null;
  academicYearId: number;
  academicYearName: string;
  status: MentorshipStatus;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  mentorEducationalOrganizationName: string | null;
  menteeEducationalOrganizationName: string | null;
};

type DecisionRequest = {
  decision: "ACCEPT" | "REJECT";
  comment?: string;
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Произошла непредвиденная ошибка.";
}

function fullName(item: Mentorship) {
  return [item.menteeLastName, item.menteeFirstName, item.menteeMiddleName]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU");
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
          <p className="mt-3 text-3xl font-semibold text-[#1D3557]">{value}</p>
        </div>

        <div className="rounded-xl bg-[#E8F0F5] p-3 text-[#457B9D]">{icon}</div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

export function MentorDashboard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { section, setSection } = useDashboardShell();

  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(
    null,
  );

  const requestsQuery = useQuery({
    queryKey: ["mentor", user?.id, "requests"],
    queryFn: () => apiFetch<Mentorship[]>("/api/mentor/mentorship-assignments"),
    enabled: user?.role === "MENTOR",
  });

  const menteesQuery = useQuery({
    queryKey: ["mentor", user?.id, "mentees"],
    queryFn: () => apiFetch<Mentorship[]>("/api/mentor/mentees"),
    enabled: user?.role === "MENTOR",
  });

  const invalidateDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["mentor", user?.id, "requests"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["mentor", user?.id, "mentees"],
      }),
    ]);
  };

  const decisionMutation = useMutation({
    mutationFn: ({ id, request }: { id: number; request: DecisionRequest }) =>
      apiFetch<Mentorship>(
        `/api/mentor/mentorship-assignments/${id}/decision`,
        {
          method: "PATCH",
          body: JSON.stringify(request),
        },
      ),

    onSuccess: async (_, variables) => {
      toast.success(
        variables.request.decision === "ACCEPT"
          ? "Предложение принято."
          : "Предложение отклонено.",
      );

      setSelectedRequestId(null);
      await invalidateDashboard();
    },

    onError: (error) => {
      toast.error("Не удалось обработать предложение", {
        description: errorMessage(error),
      });
    },
  });

  const requests = requestsQuery.data ?? [];
  const mentees = menteesQuery.data ?? [];

  const isLoading = requestsQuery.isPending || menteesQuery.isPending;

  const isRefreshing = requestsQuery.isFetching || menteesQuery.isFetching;

  const hasError = requestsQuery.isError || menteesQuery.isError;

  async function refreshDashboard() {
    await invalidateDashboard();
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        <DashboardPageHeader
          title="Кабинет наставника"
          description="Работа с предложениями наставничества и наставляемыми."
          action={
            <button
              type="button"
              onClick={() => void refreshDashboard()}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Обновить
            </button>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Новые предложения"
            value={isLoading ? "—" : requests.length}
            description="Предложения, ожидающие вашего решения."
            icon={<ClipboardCheck size={21} />}
          />

          <StatCard
            title="Действующие наставляемые"
            value={isLoading ? "—" : mentees.length}
            description="Наставляемые, с которыми уже начата работа."
            icon={<Users size={21} />}
          />

          <StatCard
            title="Свободные места"
            value={isLoading ? "—" : Math.max(0, 3 - mentees.length)}
            description="Количество оставшихся мест из трёх возможных."
            icon={<UserRound size={21} />}
          />
        </section>

        <section className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSection("overview")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Обзор
          </button>

          <button
            type="button"
            onClick={() => setSection("mentor-requests")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Предложения ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setSection("mentees")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Мои наставляемые ({mentees.length})
          </button>
        </section>

        {hasError && (
          <section className="rounded-xl border border-red-200 bg-white p-5">
            <p className="text-sm text-red-700">
              Не удалось загрузить данные кабинета.
            </p>
            <button
              type="button"
              onClick={() => void refreshDashboard()}
              className="mt-3 text-sm font-medium text-[#457B9D] hover:underline"
            >
              Повторить загрузку
            </button>
          </section>
        )}

        {section === "overview" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-[#1D3557]">
              Последние предложения
            </h2>

            {requests.length === 0 && !requestsQuery.isPending ? (
              <p className="mt-4 text-sm text-slate-500">
                Новых предложений наставничества нет.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {requests.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <p className="font-medium text-[#1D3557]">
                      {fullName(item)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Учебный год: {item.academicYearName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {section === "mentor-requests" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-[#1D3557]">
              Предложения наставничества
            </h2>

            {requests.length === 0 && !requestsQuery.isPending ? (
              <p className="mt-4 text-sm text-slate-500">
                Предложений, ожидающих вашего решения, нет.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {requests.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#1D3557]">
                          {fullName(item)}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.menteeEducationalOrganizationName ??
                            "ОО не указана"}
                        </p>
                      </div>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                        Ожидает решения
                      </span>
                    </div>

                    <div className="mt-4 space-y-1 text-sm text-slate-600">
                      <p>Учебный год: {item.academicYearName}</p>
                      <p>Дата предложения: {formatDate(item.createdAt)}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={decisionMutation.isPending}
                        onClick={() =>
                          decisionMutation.mutate({
                            id: item.id,
                            request: { decision: "ACCEPT" },
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1D3557] px-4 py-2 text-sm font-medium text-white hover:bg-[#27476f] disabled:opacity-50"
                      >
                        <Check size={16} />
                        Принять
                      </button>

                      <button
                        type="button"
                        disabled={decisionMutation.isPending}
                        onClick={() => setSelectedRequestId(item.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <X size={16} />
                        Отклонить
                      </button>
                    </div>

                    {selectedRequestId === item.id && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-800">
                          Вы действительно хотите отклонить предложение?
                        </p>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={decisionMutation.isPending}
                            onClick={() =>
                              decisionMutation.mutate({
                                id: item.id,
                                request: { decision: "REJECT" },
                              })
                            }
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Подтвердить
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedRequestId(null)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {section === "mentees" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-[#1D3557]">Мои наставляемые</h2>

            {mentees.length === 0 && !menteesQuery.isPending ? (
              <p className="mt-4 text-sm text-slate-500">
                Действующих наставляемых пока нет.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {mentees.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <h3 className="font-semibold text-[#1D3557]">
                      {fullName(item)}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.menteeEducationalOrganizationName ??
                        "ОО не указана"}
                    </p>

                    <p className="mt-3 text-sm text-slate-600">
                      Учебный год: {item.academicYearName}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Начало наставничества:{" "}
                      {item.startedAt ? formatDate(item.startedAt) : "—"}
                    </p>

                    <p className="mt-3 text-sm font-medium text-emerald-700">
                      Наставничество действует
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {isLoading && (
          <p className="text-sm text-slate-500">Загружаем данные кабинета...</p>
        )}
      </div>
    </main>
  );
}
