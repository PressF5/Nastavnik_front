"use client";

import {
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  History,
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

type AvailableMentee = {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
};

type MentorCandidate = {
  mentorId: number;
  firstName: string;
  lastName: string;
  middleName: string | null;
  educationalOrganizationName: string | null;
  compatibilityPercentage: number;
  comparableFieldCount: number;
};

type CreatedMentorship = {
  id: number;
  mentorId: number;
  menteeId: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "ENDED";
};

type MentorshipAssignment = {
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

  status: "PENDING" | "ACCEPTED" | "REJECTED" | "ENDED";

  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;

  mentorEducationalOrganizationName: string | null;
  menteeEducationalOrganizationName: string | null;
};

type MentorshipAuditLog = {
  id: number;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  comment: string | null;
  actorName: string;
  source: "USER" | "SYSTEM";
  createdAt: string;
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

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("ru-RU");
}

function mentorshipStatusLabel(status: MentorshipAssignment["status"]) {
  switch (status) {
    case "PENDING":
      return "Ожидает ответа наставника";
    case "ACCEPTED":
      return "Действует";
    case "REJECTED":
      return "Отклонено наставником";
    case "ENDED":
      return "Завершено";
  }
}

function mentorshipStatusClass(status: MentorshipAssignment["status"]) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "bg-red-50 text-red-700";
    case "ENDED":
      return "bg-slate-100 text-slate-600";
  }
}

function auditActionLabel(action: string) {
  switch (action) {
    case "REQUEST_CREATED":
      return "Создана заявка на назначение";
    case "REQUEST_ACCEPTED":
      return "Наставник принял заявку";
    case "REQUEST_REJECTED":
      return "Наставник отклонил заявку";
    case "MENTORSHIP_ENDED":
      return "Наставничество завершено";
    default:
      return action;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const [selectedMenteeId, setSelectedMenteeId] = useState("");

  const [assignmentSearchInput, setAssignmentSearchInput] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState<
    "ALL" | "PENDING" | "ACCEPTED" | "REJECTED" | "ENDED"
  >("ALL");
  const [assignmentPage, setAssignmentPage] = useState(0);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(
    null,
  );

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

  const availableMenteesQuery = useQuery({
    queryKey: ["oo-admin", user?.id, "available-mentees"],
    queryFn: () => apiFetch<AvailableMentee[]>("/api/admin/mentees/available"),
    enabled: user?.role === "OO_ADMIN" && section === "mentor-assignment",
  });

  const mentorCandidatesQuery = useQuery({
    queryKey: ["oo-admin", user?.id, "mentor-candidates", selectedMenteeId],
    queryFn: () =>
      apiFetch<MentorCandidate[]>(
        `/api/admin/mentees/${selectedMenteeId}/mentors`,
      ),
    enabled:
      user?.role === "OO_ADMIN" &&
      section === "mentor-assignment" &&
      selectedMenteeId !== "",
  });

  const mentorshipAssignmentsQuery = useQuery({
    queryKey: [
      "oo-admin",
      user?.id,
      "mentorship-assignments",
      assignmentSearch,
      assignmentStatus,
      assignmentPage,
    ],
    queryFn: () =>
      apiFetch<SpringPage<MentorshipAssignment>>(
        "/api/admin/mentorship-assignments",
        {
          params: {
            search: assignmentSearch || undefined,
            status: assignmentStatus === "ALL" ? undefined : assignmentStatus,
            page: assignmentPage,
            size: PAGE_SIZE,
          },
        },
      ),
    enabled: user?.role === "OO_ADMIN" && section === "mentorship-assignments",
  });

  const mentorshipHistoryQuery = useQuery({
    queryKey: ["oo-admin", user?.id, "mentorship-history", expandedHistoryId],
    queryFn: () =>
      apiFetch<MentorshipAuditLog[]>(
        `/api/admin/mentorship-assignments/${expandedHistoryId}/history`,
      ),
    enabled:
      user?.role === "OO_ADMIN" &&
      section === "mentorship-assignments" &&
      expandedHistoryId !== null,
  });

  const invalidateDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["oo-admin", user?.id, "pending-mentees"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["oo-admin", user?.id, "mentees"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["oo-admin", user?.id, "accepted-mentees-count"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["oo-admin", user?.id, "mentorship-assignments"],
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

  const createMentorshipMutation = useMutation({
    mutationFn: (mentorId: number) =>
      apiFetch<CreatedMentorship>("/api/admin/mentorship-assignments", {
        method: "POST",
        body: JSON.stringify({
          menteeId: Number(selectedMenteeId),
          mentorId,
        }),
      }),

    onSuccess: async () => {
      toast.success("Заявка на назначение наставника отправлена.");

      setSelectedMenteeId("");

      await Promise.all([
        invalidateDashboard(),
        queryClient.invalidateQueries({
          queryKey: ["oo-admin", user?.id, "available-mentees"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["oo-admin", user?.id, "mentor-candidates"],
        }),
      ]);
    },

    onError: (error) => {
      toast.error("Не удалось назначить наставника", {
        description: errorMessage(error),
      });
    },
  });

  const pendingMentees = pendingMenteesQuery.data?.content ?? [];
  const mentees = menteesQuery.data?.content ?? [];
  const mentorshipAssignments = mentorshipAssignmentsQuery.data?.content ?? [];

  const isRefreshing =
    pendingMenteesQuery.isFetching ||
    menteesQuery.isFetching ||
    availableMenteesQuery.isFetching ||
    mentorCandidatesQuery.isFetching ||
    mentorshipAssignmentsQuery.isFetching ||
    acceptedMenteesQuery.isFetching;

  const hasError =
    pendingMenteesQuery.isError ||
    menteesQuery.isError ||
    availableMenteesQuery.isError ||
    mentorCandidatesQuery.isError ||
    mentorshipAssignmentsQuery.isError ||
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

        {section === "mentor-assignment" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div>
              <h2 className="font-semibold text-[#1D3557]">
                Назначение наставника
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Выберите наставляемого, чтобы посмотреть подходящих наставников
                и отправить заявку на назначение.
              </p>
            </div>

            <div className="mt-6 max-w-2xl">
              <label
                htmlFor="available-mentee"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Наставляемый
              </label>

              <select
                id="available-mentee"
                value={selectedMenteeId}
                onChange={(event) => setSelectedMenteeId(event.target.value)}
                disabled={
                  availableMenteesQuery.isPending ||
                  availableMenteesQuery.isError ||
                  availableMenteesQuery.data?.length === 0
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">
                  {availableMenteesQuery.isPending
                    ? "Загружаем наставляемых..."
                    : "Выберите наставляемого"}
                </option>

                {availableMenteesQuery.data?.map((mentee) => (
                  <option key={mentee.id} value={mentee.id}>
                    {[mentee.lastName, mentee.firstName, mentee.middleName]
                      .filter(Boolean)
                      .join(" ")}
                  </option>
                ))}
              </select>

              {availableMenteesQuery.isError && (
                <p className="mt-2 text-sm text-red-600">
                  Не удалось загрузить список наставляемых.
                </p>
              )}

              {availableMenteesQuery.data?.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  Сейчас нет наставляемых, которым можно назначить наставника.
                </p>
              )}
            </div>

            {selectedMenteeId && (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h3 className="font-semibold text-[#1D3557]">
                  Подходящие наставники
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Показаны наставники вашего МСУ с совместимостью выше 50%.
                </p>

                {mentorCandidatesQuery.isPending ? (
                  <p className="py-10 text-sm text-slate-500">
                    Подбираем наставников...
                  </p>
                ) : mentorCandidatesQuery.isError ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    Не удалось выполнить подбор наставников.
                  </div>
                ) : mentorCandidatesQuery.data?.length === 0 ? (
                  <p className="py-10 text-sm text-slate-500">
                    Подходящих наставников не найдено. Проверьте заполнение
                    анкет и правила совместимости.
                  </p>
                ) : (
                  <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {mentorCandidatesQuery.data?.map((mentor) => (
                      <article
                        key={mentor.mentorId}
                        className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-[#1D3557]">
                                {[
                                  mentor.lastName,
                                  mentor.firstName,
                                  mentor.middleName,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              </h4>

                              <p className="mt-1 text-sm text-slate-500">
                                Наставник
                              </p>
                            </div>

                            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-right">
                              <p className="text-xs text-emerald-700">
                                Совместимость
                              </p>

                              <p className="text-xl font-semibold text-emerald-800">
                                {mentor.compatibilityPercentage.toLocaleString(
                                  "ru-RU",
                                  { maximumFractionDigits: 1 },
                                )}
                                %
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 border-t border-slate-100 pt-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Образовательная организация
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {mentor.educationalOrganizationName ??
                                "Не указана"}
                            </p>

                            <p className="mt-3 text-xs text-slate-500">
                              Сопоставлено полей анкеты:{" "}
                              {mentor.comparableFieldCount}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={createMentorshipMutation.isPending}
                          onClick={() =>
                            createMentorshipMutation.mutate(mentor.mentorId)
                          }
                          className={`${primaryButton} mt-5 w-full`}
                        >
                          {createMentorshipMutation.isPending
                            ? "Отправляем заявку..."
                            : "Отправить заявку"}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {section === "mentorship-assignments" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div>
              <h2 className="font-semibold text-[#1D3557]">
                Назначения наставничества
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                История назначений наставников наставляемым вашей
                образовательной организации.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setAssignmentPage(0);
                setAssignmentSearch(assignmentSearchInput.trim());
              }}
              className="mt-5 flex flex-col gap-3 lg:flex-row"
            >
              <input
                type="search"
                value={assignmentSearchInput}
                onChange={(event) =>
                  setAssignmentSearchInput(event.target.value)
                }
                placeholder="Поиск по ФИО наставника или наставляемого"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20"
              />

              <select
                value={assignmentStatus}
                onChange={(event) => {
                  setAssignmentStatus(
                    event.target.value as typeof assignmentStatus,
                  );
                  setAssignmentPage(0);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20"
              >
                <option value="ALL">Все статусы</option>
                <option value="PENDING">Ожидают ответа</option>
                <option value="ACCEPTED">Действующие</option>
                <option value="REJECTED">Отклонённые</option>
                <option value="ENDED">Завершённые</option>
              </select>

              <button type="submit" className={primaryButton}>
                Найти
              </button>

              <button
                type="button"
                className={secondaryButton}
                onClick={() => {
                  setAssignmentSearchInput("");
                  setAssignmentSearch("");
                  setAssignmentStatus("ALL");
                  setAssignmentPage(0);
                }}
              >
                Сбросить
              </button>
            </form>

            {mentorshipAssignmentsQuery.isPending ? (
              <p className="py-10 text-sm text-slate-500">
                Загружаем назначения наставничества...
              </p>
            ) : mentorshipAssignmentsQuery.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                Не удалось загрузить назначения наставничества.
              </div>
            ) : mentorshipAssignments.length === 0 ? (
              <p className="py-10 text-sm text-slate-500">
                Назначений наставничества пока нет.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {mentorshipAssignments.map((assignment) => (
                  <article
                    key={assignment.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Назначение №{assignment.id}
                        </p>

                        <p className="mt-1 font-semibold text-[#1D3557]">
                          Учебный год: {assignment.academicYearName}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${mentorshipStatusClass(
                          assignment.status,
                        )}`}
                      >
                        {mentorshipStatusLabel(assignment.status)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Наставник
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-800">
                          {[
                            assignment.mentorLastName,
                            assignment.mentorFirstName,
                            assignment.mentorMiddleName,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {assignment.mentorEducationalOrganizationName ??
                            "Организация не указана"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Наставляемый
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-800">
                          {[
                            assignment.menteeLastName,
                            assignment.menteeFirstName,
                            assignment.menteeMiddleName,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {assignment.menteeEducationalOrganizationName ??
                            "Организация не указана"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-400">
                          Дата назначения
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {formatDate(assignment.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Начало наставничества
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {formatDate(assignment.startedAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Завершение</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {formatDate(assignment.endedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryId((current) =>
                            current === assignment.id ? null : assignment.id,
                          )
                        }
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#457B9D] transition hover:text-[#1D3557]"
                      >
                        <History size={16} />
                        История изменений
                        {expandedHistoryId === assignment.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>

                      {expandedHistoryId === assignment.id && (
                        <div className="mt-4">
                          {mentorshipHistoryQuery.isPending ? (
                            <p className="py-4 text-sm text-slate-500">
                              Загружаем историю изменений...
                            </p>
                          ) : mentorshipHistoryQuery.isError ? (
                            <div
                              role="alert"
                              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                            >
                              Не удалось загрузить историю изменений.
                            </div>
                          ) : !mentorshipHistoryQuery.data?.length ? (
                            <p className="py-4 text-sm text-slate-500">
                              История изменений пока пуста.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {mentorshipHistoryQuery.data.map((log, index) => (
                                <div key={log.id} className="relative pl-6">
                                  <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-[#457B9D]" />

                                  {index !==
                                    mentorshipHistoryQuery.data!.length - 1 && (
                                    <span className="absolute -bottom-4.5 left-1 top-5 w-px bg-slate-200" />
                                  )}

                                  <div>
                                    <p className="text-sm font-medium text-[#1D3557]">
                                      {auditActionLabel(log.action)}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {formatDateTime(log.createdAt)}
                                    </p>

                                    <p className="mt-1 text-sm text-slate-600">
                                      {log.actorName}
                                      {log.source === "SYSTEM" && " · Система"}
                                    </p>

                                    {(log.oldStatus || log.newStatus) && (
                                      <p className="mt-2 text-xs text-slate-500">
                                        Статус: {log.oldStatus ?? "—"} →{" "}
                                        {log.newStatus ?? "—"}
                                      </p>
                                    )}

                                    {log.comment && (
                                      <div className="mt-2 rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs font-medium text-slate-500">
                                          Комментарий
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                          {log.comment}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {mentorshipAssignmentsQuery.data &&
              mentorshipAssignmentsQuery.data.totalPages > 0 && (
                <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                  <p className="text-sm text-slate-500">
                    Всего назначений:{" "}
                    {mentorshipAssignmentsQuery.data.totalElements}
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={mentorshipAssignmentsQuery.data.first}
                      onClick={() =>
                        setAssignmentPage((page) => Math.max(0, page - 1))
                      }
                      className={secondaryButton}
                    >
                      Назад
                    </button>

                    <span className="text-sm text-slate-600">
                      Страница {mentorshipAssignmentsQuery.data.number + 1} из{" "}
                      {mentorshipAssignmentsQuery.data.totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={mentorshipAssignmentsQuery.data.last}
                      onClick={() => setAssignmentPage((page) => page + 1)}
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
