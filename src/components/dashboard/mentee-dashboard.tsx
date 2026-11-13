"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  UserRound,
  CheckCircle2,
  Building2,
  CalendarDays,
  Users,
} from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  OrganizationHierarchyCard,
  type OrganizationContext,
} from "@/components/dashboard/organization-hierarchy-card";
import { useDashboardShell } from "@/components/dashboard/dashboard-shell-context";
import { useState } from "react";

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

type MentorshipStatus = "PENDING" | "ACCEPTED";

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

type MentorProfile = {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string | null;
  regionName: string | null;
  msuName: string | null;
  educationalOrganizationName: string | null;
  mentorship: Mentorship;
  profileValues: {
    id: number;
    profileFieldId: number;
    profileFieldName: string;
    fieldType: ProfileFieldType;
    valueText: string | null;
    valueNumber: number | null;
    valueBoolean: boolean | null;
    valueDate: string | null;
    selectedOptions: {
      id: number;
      value: string;
      label: string;
    }[];
  }[];
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const localDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (localDateMatch) {
    return `${localDateMatch[3]}.${localDateMatch[2]}.${localDateMatch[1]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("ru-RU");
}

function getMentorFullName(mentorship: Mentorship): string {
  return [
    mentorship.mentorLastName,
    mentorship.mentorFirstName,
    mentorship.mentorMiddleName,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatProfileValue(
  item: MentorProfile["profileValues"][number],
): string {
  switch (item.fieldType) {
    case "TEXT":
    case "TEXTAREA":
      return item.valueText?.trim() || "Не указано";

    case "NUMBER":
      return item.valueNumber !== null
        ? String(item.valueNumber)
        : "Не указано";

    case "BOOLEAN":
      return item.valueBoolean === null
        ? "Не указано"
        : item.valueBoolean
          ? "Да"
          : "Нет";

    case "DATE":
      return item.valueDate ? formatDate(item.valueDate) : "Не указано";

    case "SELECT":
    case "MULTISELECT":
      return item.selectedOptions.length > 0
        ? item.selectedOptions.map((option) => option.label).join(", ")
        : "Не указано";

    default:
      return "Не указано";
  }
}

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
  const { section } = useDashboardShell();
  const [showMentorProfile, setShowMentorProfile] = useState(false);

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

  const mentorshipQuery = useQuery({
    queryKey: ["mentee", "mentorship", user?.id],
    queryFn: async () => {
      const response = await apiFetch<Mentorship | null>(
        "/api/mentee/mentorship",
      );

      return response ?? null;
    },
    enabled: user?.role === "MENTEE" && section === "mentorship",
  });

  const mentorProfileQuery = useQuery({
    queryKey: ["mentee", "mentor-profile", mentorshipQuery.data?.id],
    queryFn: () => apiFetch<MentorProfile>("/api/mentee/mentor"),
    enabled:
      user?.role === "MENTEE" &&
      section === "mentorship" &&
      showMentorProfile &&
      Boolean(mentorshipQuery.data),
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
          title={
            section === "mentorship"
              ? "Моё наставничество"
              : "Кабинет наставляемого"
          }
          description={
            section === "mentorship"
              ? "Информация о назначенном наставнике и текущем состоянии наставничества."
              : "Личный кабинет молодого специалиста."
          }
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
        {section === "overview" && (
          <>
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
                  title="Полей в анкете"
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
                  title="Заполненность анкеты"
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
          </>
        )}
        {section === "mentorship" && (
          <section className="space-y-5">
            {mentorshipQuery.isPending && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  Загружаем информацию о наставничестве...
                </p>
              </div>
            )}

            {mentorshipQuery.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <p className="font-medium text-red-800">
                  Не удалось загрузить информацию о наставничестве.
                </p>

                <button
                  type="button"
                  onClick={() => void mentorshipQuery.refetch()}
                  className="mt-3 text-sm font-medium text-[#457B9D] hover:underline"
                >
                  Повторить загрузку
                </button>
              </div>
            )}

            {mentorshipQuery.isSuccess && !mentorshipQuery.data && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#E8F0F5] text-[#457B9D]">
                  <Users size={26} />
                </div>

                <h2 className="mt-4 text-lg font-semibold text-[#1D3557]">
                  Наставник пока не назначен
                </h2>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Администратор вашей образовательной организации ещё не создал
                  назначение наставника. Когда назначение будет создано,
                  информация появится в этом разделе.
                </p>
              </div>
            )}

            {mentorshipQuery.data && (
              <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Текущее назначение
                    </p>

                    <h2 className="mt-2 text-xl font-semibold text-[#1D3557]">
                      {getMentorFullName(mentorshipQuery.data)}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">Ваш наставник</p>
                  </div>

                  <span
                    className={[
                      "inline-flex rounded-full px-3 py-1.5 text-xs font-medium",
                      mentorshipQuery.data.status === "ACCEPTED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-800",
                    ].join(" ")}
                  >
                    {mentorshipQuery.data.status === "ACCEPTED"
                      ? "Наставничество действует"
                      : "Ожидает принятия"}
                  </span>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Building2 size={17} />
                      <p className="text-xs font-medium uppercase tracking-wide">
                        Образовательная организация наставника
                      </p>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {mentorshipQuery.data.mentorEducationalOrganizationName ??
                        "Не указана"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <CalendarDays size={17} />
                      <p className="text-xs font-medium uppercase tracking-wide">
                        Учебный год
                      </p>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {mentorshipQuery.data.academicYearName}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <CalendarDays size={17} />
                      <p className="text-xs font-medium uppercase tracking-wide">
                        Дата назначения
                      </p>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {formatDate(mentorshipQuery.data.createdAt)}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <CalendarDays size={17} />
                      <p className="text-xs font-medium uppercase tracking-wide">
                        Начало наставничества
                      </p>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {mentorshipQuery.data.status === "ACCEPTED"
                        ? formatDate(mentorshipQuery.data.startedAt)
                        : "Ожидает принятия наставником"}
                    </p>
                  </div>
                </div>
                <div className="border-t border-slate-100 p-5 sm:px-6">
                  <button
                    type="button"
                    onClick={() =>
                      setShowMentorProfile((previous) => !previous)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1D3557] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#27476f]"
                  >
                    <UserRound size={17} />
                    {showMentorProfile
                      ? "Скрыть анкету наставника"
                      : "Посмотреть анкету наставника"}
                  </button>
                </div>
              </article>
            )}
            {showMentorProfile && mentorshipQuery.data && (
              <section className="space-y-5">
                {mentorProfileQuery.isPending && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <p className="text-sm text-slate-500">
                      Загружаем анкету наставника...
                    </p>
                  </div>
                )}

                {mentorProfileQuery.isError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="font-medium text-red-800">
                      Не удалось загрузить анкету наставника.
                    </p>

                    <button
                      type="button"
                      onClick={() => void mentorProfileQuery.refetch()}
                      className="mt-3 text-sm font-medium text-[#457B9D] hover:underline"
                    >
                      Повторить загрузку
                    </button>
                  </div>
                )}

                {mentorProfileQuery.data && (
                  <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5 sm:p-6">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Профиль наставника
                      </p>

                      <h2 className="mt-2 text-xl font-semibold text-[#1D3557]">
                        {[
                          mentorProfileQuery.data.lastName,
                          mentorProfileQuery.data.firstName,
                          mentorProfileQuery.data.middleName,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Персональная информация и профессиональная анкета
                      </p>
                    </div>

                    <div className="space-y-5 p-5 sm:p-6">
                      <section>
                        <h3 className="mb-3 font-semibold text-[#1D3557]">
                          Организационная принадлежность
                        </h3>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {[
                            {
                              title: "Регион",
                              value: mentorProfileQuery.data.regionName,
                            },
                            {
                              title: "Муниципальное образование",
                              value: mentorProfileQuery.data.msuName,
                            },
                            {
                              title: "Образовательная организация",
                              value:
                                mentorProfileQuery.data
                                  .educationalOrganizationName,
                            },
                          ].map((item) => (
                            <div
                              key={item.title}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                            >
                              <p className="text-xs text-slate-500">
                                {item.title}
                              </p>

                              <p className="mt-2 text-sm font-medium text-slate-800">
                                {item.value || "Не указано"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <h3 className="mb-3 font-semibold text-[#1D3557]">
                          Анкета наставника
                        </h3>

                        {mentorProfileQuery.data.profileValues.length === 0 ? (
                          <div className="rounded-lg border border-slate-200 p-5">
                            <p className="text-sm text-slate-500">
                              Наставник пока не заполнил дополнительные поля
                              анкеты.
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {mentorProfileQuery.data.profileValues.map(
                              (item) => (
                                <div
                                  key={item.profileFieldId}
                                  className="rounded-lg border border-slate-200 p-4"
                                >
                                  <p className="text-xs font-medium text-slate-500">
                                    {item.profileFieldName}
                                  </p>

                                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800">
                                    {formatProfileValue(item)}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </section>
                    </div>
                  </article>
                )}
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
