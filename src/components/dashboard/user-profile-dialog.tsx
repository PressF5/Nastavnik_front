"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import { CalendarDays, LoaderCircle, Mail, UserRound, X } from "lucide-react";

import { apiFetch } from "@/lib/api-client";

type ProfileFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN"
  | "SELECT"
  | "MULTISELECT";

type ProfileValue = {
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
};

type UserProfile = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
  role: string;
  accountStatus: string;
  isBlock: boolean;
  regionName: string | null;
  msuName: string | null;
  educationalOrganizationName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  profileValues: ProfileValue[];
};

type UserProfileDialogProps = {
  userId: number;
};

const roleLabels: Record<string, string> = {
  REGION_ADMIN: "Администратор региона",
  MSU_ADMIN: "Администратор МСУ",
  OO_ADMIN: "Администратор ОО",
  MENTOR: "Наставник",
  MENTEE: "Наставляемый",
};

const statusLabels: Record<string, string> = {
  PENDING: "Ожидает подтверждения",
  ACCEPTED: "Подтверждена",
  REJECTED: "Отклонена",
};

function formatDate(value: string | null) {
  if (!value) return "Не указана";

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Не указана";

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getProfileValue(field: ProfileValue): string {
  switch (field.fieldType) {
    case "TEXT":
    case "TEXTAREA":
      return field.valueText || "Не заполнено";

    case "NUMBER":
      return field.valueNumber === null
        ? "Не заполнено"
        : String(field.valueNumber);

    case "DATE":
      return formatDate(field.valueDate);

    case "BOOLEAN":
      return field.valueBoolean === null
        ? "Не заполнено"
        : field.valueBoolean
          ? "Да"
          : "Нет";

    case "SELECT":
    case "MULTISELECT":
      return field.selectedOptions.length > 0
        ? field.selectedOptions.map((option) => option.label).join(", ")
        : "Не выбрано";
  }
}

export function UserProfileDialog({ userId }: UserProfileDialogProps) {
  const [open, setOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["admin", "users", "profile", userId],
    queryFn: () => apiFetch<UserProfile>(`/api/admin/users/${userId}/profile`),
    enabled: open && userId > 0,
  });

  const profile = profileQuery.data;

  const fullName = profile
    ? [profile.lastName, profile.firstName, profile.middleName]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#457B9D]/30 bg-[#457B9D]/5 px-3 py-2.5 text-sm font-medium text-[#1D3557] transition hover:bg-[#457B9D]/10"
        >
          <UserRound size={16} />
          Подробнее о пользователе
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />

        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#F8F9FA] shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 bg-white p-5 sm:p-6">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[#1D3557]">
                Профиль пользователя
              </Dialog.Title>

              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Подробная информация и заполненная анкета
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Закрыть"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            {profileQuery.isPending && (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
                <LoaderCircle size={20} className="animate-spin" />
                Загружаем профиль...
              </div>
            )}

            {profileQuery.isError && (
              <div className="py-10 text-center">
                <p className="text-sm text-red-700">
                  Не удалось загрузить профиль.
                </p>

                <button
                  type="button"
                  onClick={() => void profileQuery.refetch()}
                  className="mt-3 text-sm font-medium text-[#457B9D] underline"
                >
                  Повторить запрос
                </button>
              </div>
            )}

            {profile && (
              <div className="space-y-5">
                {/* Основная информация */}
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#457B9D]/10 text-[#457B9D]">
                      <UserRound size={24} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#1D3557]">
                        {fullName}
                      </h3>

                      <p className="mt-1 flex items-center gap-2 break-all text-sm text-slate-500">
                        <Mail size={14} />
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    <InfoItem
                      label="Роль"
                      value={roleLabels[profile.role] ?? profile.role}
                    />

                    <InfoItem
                      label="Статус учётной записи"
                      value={
                        statusLabels[profile.accountStatus] ??
                        profile.accountStatus
                      }
                    />

                    <InfoItem
                      label="Дата рождения"
                      value={formatDate(profile.birthDate)}
                    />

                    <InfoItem
                      label="Состояние аккаунта"
                      value={profile.isBlock ? "Заблокирован" : "Активен"}
                    />
                  </div>
                </section>

                {/* Организационная принадлежность */}
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-[#1D3557]">
                    Организационная принадлежность
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <InfoItem label="Регион" value={profile.regionName} />

                    <InfoItem
                      label="Муниципальное управление"
                      value={profile.msuName}
                    />

                    <InfoItem
                      label="Образовательная организация"
                      value={profile.educationalOrganizationName}
                    />
                  </div>
                </section>

                {/* Динамическая анкета */}
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-[#1D3557]">
                    Анкета профиля
                  </h3>

                  {profile.profileValues.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      Пользователь пока не заполнил анкету.
                    </p>
                  ) : (
                    <div className="mt-4 divide-y divide-slate-100">
                      {profile.profileValues.map((field) => (
                        <div
                          key={field.profileFieldId}
                          className="grid gap-1 py-3 sm:grid-cols-2 sm:gap-4"
                        >
                          <p className="text-sm text-slate-500">
                            {field.profileFieldName}
                          </p>

                          <p className="text-sm font-medium text-slate-800 sm:text-right">
                            {getProfileValue(field)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Служебная информация */}
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-[#1D3557]">
                    Служебная информация
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <InfoItem
                      label="Дата регистрации"
                      value={formatDateTime(profile.createdAt)}
                    />

                    <InfoItem
                      label="Последнее обновление"
                      value={formatDateTime(profile.updatedAt)}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value || "Не указано"}
      </p>
    </div>
  );
}
