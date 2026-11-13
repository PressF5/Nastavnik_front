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

type MenteeProfile = {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
  msuName: string | null;
  educationalOrganizationName: string | null;
  mentorship: Mentorship;
  profileValues: ProfileValue[];
};

type ProfileValue = {
  id: number;
  profileFieldId: number;
  profileFieldName: string;
  fieldType:
    | "TEXT"
    | "TEXTAREA"
    | "NUMBER"
    | "DATE"
    | "BOOLEAN"
    | "SELECT"
    | "MULTISELECT";
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  selectedOptions: {
    id: number;
    value: string;
    label: string;
  }[];
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

function formatProfileValue(item: ProfileValue): string {
  switch (item.fieldType) {
    case "TEXT":
    case "TEXTAREA":
      return item.valueText?.trim() || "Не заполнено";

    case "NUMBER":
      return item.valueNumber !== null
        ? String(item.valueNumber)
        : "Не заполнено";

    case "DATE":
      return item.valueDate ? formatDate(item.valueDate) : "Не заполнено";

    case "BOOLEAN":
      return item.valueBoolean === null
        ? "Не заполнено"
        : item.valueBoolean
          ? "Да"
          : "Нет";

    case "SELECT":
    case "MULTISELECT":
      return item.selectedOptions.length > 0
        ? item.selectedOptions.map((option) => option.label).join(", ")
        : "Не заполнено";

    default:
      return "Не заполнено";
  }
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
  const [selectedMenteeId, setSelectedMenteeId] = useState<number | null>(null);

  const [endingMentorshipId, setEndingMentorshipId] = useState<number | null>(
    null,
  );

  const [endReason, setEndReason] = useState("");

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

  const menteeProfileQuery = useQuery({
    queryKey: ["mentor", user?.id, "mentee-profile", selectedMenteeId],
    queryFn: () =>
      apiFetch<MenteeProfile>(`/api/mentor/mentees/${selectedMenteeId}`),
    enabled: user?.role === "MENTOR" && selectedMenteeId !== null,
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

  const endMentorshipMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiFetch<Mentorship>(`/api/mentor/mentorship-assignments/${id}/end`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),

    onSuccess: async () => {
      toast.success("Наставничество завершено.");

      setEndingMentorshipId(null);
      setEndReason("");
      setSelectedMenteeId(null);

      await invalidateDashboard();
    },

    onError: (error) => {
      toast.error("Не удалось завершить наставничество", {
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
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMenteeId(item.menteeId)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1D3557] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#27476f]"
                      >
                        <UserRound size={16} />
                        Посмотреть анкету
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEndingMentorshipId(item.id);
                          setEndReason("");
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                      >
                        <X size={16} />
                        Завершить наставничество
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedMenteeId !== null && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#1D3557]">
                  Анкета наставляемого
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Личная информация и заполненные профильные поля.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMenteeId(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Закрыть
              </button>
            </div>

            {menteeProfileQuery.isPending && (
              <p className="mt-5 text-sm text-slate-500">Загружаем анкету...</p>
            )}

            {menteeProfileQuery.isError && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  Не удалось загрузить анкету наставляемого.
                </p>

                <button
                  type="button"
                  onClick={() => void menteeProfileQuery.refetch()}
                  className="mt-2 text-sm font-medium text-[#457B9D] hover:underline"
                >
                  Повторить загрузку
                </button>
              </div>
            )}

            {menteeProfileQuery.data && (
              <div className="mt-5 space-y-6">
                {(() => {
                  const profile = menteeProfileQuery.data;

                  return (
                    <>
                      <div>
                        <h3 className="font-semibold text-[#1D3557]">
                          Основная информация
                        </h3>

                        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <p className="text-xs text-slate-500">ФИО</p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                              {[
                                profile.lastName,
                                profile.firstName,
                                profile.middleName,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Дата рождения
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                              {profile.birthDate
                                ? formatDate(profile.birthDate)
                                : "Не указана"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">МСУ</p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                              {profile.msuName ?? "Не указано"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Образовательная организация
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                              {profile.educationalOrganizationName ??
                                "Не указана"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Учебный год
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                              {profile.mentorship.academicYearName}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Начало наставничества
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                              {profile.mentorship.startedAt
                                ? formatDate(profile.mentorship.startedAt)
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-5">
                        <h3 className="font-semibold text-[#1D3557]">
                          Профильные поля
                        </h3>

                        {profile.profileValues.length === 0 ? (
                          <p className="mt-3 text-sm text-slate-500">
                            Наставляемый пока не заполнил профильные поля.
                          </p>
                        ) : (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {profile.profileValues.map((value) => (
                              <div
                                key={value.id}
                                className="rounded-lg border border-slate-200 p-4"
                              >
                                <p className="text-xs font-medium text-slate-500">
                                  {value.profileFieldName}
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                                  {formatProfileValue(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </section>
        )}

        {endingMentorshipId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-[#1D3557]">
                Завершение наставничества
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Укажи причину завершения наставничества. После подтверждения
                назначение перейдёт в статус «Завершено».
              </p>

              <label
                htmlFor="mentorship-end-reason"
                className="mt-5 block text-sm font-medium text-slate-700"
              >
                Причина завершения
              </label>

              <textarea
                id="mentorship-end-reason"
                value={endReason}
                onChange={(event) => setEndReason(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Укажи причину завершения наставничества..."
                className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {endReason.length} / 2000
              </p>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={endMentorshipMutation.isPending}
                  onClick={() => {
                    setEndingMentorshipId(null);
                    setEndReason("");
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Отмена
                </button>

                <button
                  type="button"
                  disabled={
                    endMentorshipMutation.isPending || !endReason.trim()
                  }
                  onClick={() => {
                    endMentorshipMutation.mutate({
                      id: endingMentorshipId,
                      reason: endReason.trim(),
                    });
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {endMentorshipMutation.isPending
                    ? "Завершение..."
                    : "Подтвердить завершение"}
                </button>
              </div>
            </section>
          </div>
        )}

        {endingMentorshipId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-[#1D3557]">
                Завершение наставничества
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Укажи причину завершения наставничества. После подтверждения
                назначение перейдёт в статус «Завершено».
              </p>

              <label
                htmlFor="mentorship-end-reason"
                className="mt-5 block text-sm font-medium text-slate-700"
              >
                Причина завершения
              </label>

              <textarea
                id="mentorship-end-reason"
                value={endReason}
                onChange={(event) => setEndReason(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Укажи причину завершения наставничества..."
                className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {endReason.length} / 2000
              </p>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={endMentorshipMutation.isPending}
                  onClick={() => {
                    setEndingMentorshipId(null);
                    setEndReason("");
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Отмена
                </button>

                <button
                  type="button"
                  disabled={
                    endMentorshipMutation.isPending || !endReason.trim()
                  }
                  onClick={() => {
                    endMentorshipMutation.mutate({
                      id: endingMentorshipId,
                      reason: endReason.trim(),
                    });
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {endMentorshipMutation.isPending
                    ? "Завершение..."
                    : "Подтвердить завершение"}
                </button>
              </div>
            </section>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-slate-500">Загружаем данные кабинета...</p>
        )}
      </div>
    </main>
  );
}
