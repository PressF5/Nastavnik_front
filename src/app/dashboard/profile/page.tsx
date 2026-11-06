"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserRound, Save, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

type ProfileFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN"
  | "SELECT"
  | "MULTISELECT";

type ProfileFieldOption = {
  id: number;
  profileFieldId: number;
  value: string;
  label: string;
  active: boolean;
  sortOrder: number;
};

type ProfileField = {
  id: number;
  version: number;
  name: string;
  fieldType: ProfileFieldType;
  searchable: boolean;
  active: boolean;
  matchingEnabled: boolean;
  roles: {
    roleCode: string;
    required: boolean;
    sortOrder: number;
  }[];
  options: ProfileFieldOption[];
};

type SavedProfileValue = {
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

type ProfileFormField = {
  field: ProfileField;
  savedValue: SavedProfileValue | null;
};

type SaveProfileValueRequest = {
  profileFieldId: number;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: string | null;
  optionIds?: number[];
};

type FieldValue = string | boolean | number[];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20";

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

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Произошла непредвиденная ошибка.";
}

function getInitialValue(field: ProfileFormField): FieldValue {
  const saved = field.savedValue;

  if (!saved) {
    return field.field.fieldType === "MULTISELECT" ? [] : "";
  }

  switch (field.field.fieldType) {
    case "TEXT":
    case "TEXTAREA":
      return saved.valueText ?? "";

    case "NUMBER":
      return saved.valueNumber === null ? "" : String(saved.valueNumber);

    case "DATE":
      return saved.valueDate ?? "";

    case "BOOLEAN":
      return saved.valueBoolean ?? "";

    case "SELECT":
    case "MULTISELECT":
      return saved.selectedOptions.map((option) => option.id);
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [values, setValues] = useState<Record<number, FieldValue>>({});

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

  const isProfileRole = user?.role === "MENTOR" || user?.role === "MENTEE";

  const profileQuery = useQuery({
    queryKey: ["profile", "my-form"],
    queryFn: () => apiFetch<ProfileFormField[]>("/api/profile-values/my-form"),
    enabled: isInitialized && Boolean(user) && isProfileRole,
  });

  const fields = profileQuery.data ?? [];

  const fullName = user
    ? [user.lastName, user.firstName, user.middleName].filter(Boolean).join(" ")
    : "";

  // Инициализируем форму значениями, полученными с сервера.
  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    const initialValues: Record<number, FieldValue> = {};

    for (const item of profileQuery.data) {
      initialValues[item.field.id] = getInitialValue(item);
    }

    setValues(initialValues);
  }, [profileQuery.data]);

  function updateValue(fieldId: number, value: FieldValue) {
    setValues((previous) => ({
      ...previous,
      [fieldId]: value,
    }));
  }

  const saveMutation = useMutation({
    mutationFn: (request: { values: SaveProfileValueRequest[] }) =>
      apiFetch<SavedProfileValue[]>("/api/profile-values/my-form", {
        method: "PUT",
        body: JSON.stringify(request),
      }),

    onSuccess: async () => {
      toast.success("Анкета успешно сохранена.");

      await queryClient.invalidateQueries({
        queryKey: ["profile", "my-form"],
      });
    },

    onError: (error) => {
      toast.error("Не удалось сохранить анкету", {
        description: getErrorMessage(error),
      });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fields.length === 0) {
      return;
    }

    const requestValues: SaveProfileValueRequest[] = [];

    for (const item of fields) {
      const field = item.field;
      const value = values[field.id];

      const roleAssignment = field.roles.find(
        (role) => role.roleCode === user?.role,
      );

      const required = roleAssignment?.required ?? false;

      // Проверяем обязательные поля на клиенте.
      if (required) {
        const isEmpty =
          value === undefined ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          toast.error(`Заполните обязательное поле «${field.name}».`);
          return;
        }
      }

      const request: SaveProfileValueRequest = {
        profileFieldId: field.id,
      };

      switch (field.fieldType) {
        case "TEXT":
        case "TEXTAREA":
          request.valueText =
            typeof value === "string" && value.trim() ? value.trim() : null;
          break;

        case "NUMBER":
          request.valueNumber =
            typeof value === "string" && value.trim() ? Number(value) : null;
          break;

        case "DATE":
          request.valueDate = typeof value === "string" && value ? value : null;
          break;

        case "BOOLEAN":
          request.valueBoolean = typeof value === "boolean" ? value : null;
          break;

        case "SELECT":
        case "MULTISELECT":
          request.optionIds = Array.isArray(value) ? value : [];
          break;
      }

      requestValues.push(request);
    }

    saveMutation.mutate({ values: requestValues });
  }

  if (!isInitialized || !user) {
    return (
      <main className="flex min-h-64 items-center justify-center p-6">
        <p className="text-sm text-slate-600">Проверяем авторизацию...</p>
      </main>
    );
  }

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

        {/* Основная информация пользователя */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#E8F0F5] text-[#457B9D]">
              <UserRound size={28} />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-[#1D3557]">
                Профиль пользователя
              </h1>

              <p className="mt-1 text-sm text-slate-500">{fullName}</p>

              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Роль</p>
              <p className="mt-1 font-medium">
                {roleLabels[user.role] ?? user.role}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Статус учётной записи</p>
              <p className="mt-1 font-medium">
                {statusLabels[user.accountStatus] ?? user.accountStatus}
              </p>
            </div>
          </div>
        </section>

        {/* Динамическая анкета */}
        {isProfileRole && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold text-[#1D3557]">
                Анкета профиля
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Заполните информацию о себе. Обязательные поля отмечены
                звёздочкой.
              </p>
            </div>

            {profileQuery.isPending && (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <LoaderCircle size={18} className="animate-spin" />
                Загружаем анкету...
              </div>
            )}

            {profileQuery.isError && (
              <div className="py-8">
                <p className="text-sm text-red-700">
                  Не удалось загрузить анкету.
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

            {profileQuery.isSuccess && fields.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">
                Для вашей роли пока не настроены поля анкеты.
              </p>
            )}

            {profileQuery.isSuccess && fields.length > 0 && (
              <form onSubmit={handleSubmit}>
                <div className="space-y-6 py-6">
                  {fields.map(({ field }) => {
                    const roleAssignment = field.roles.find(
                      (role) => role.roleCode === user.role,
                    );

                    const required = roleAssignment?.required ?? false;
                    const value = values[field.id];

                    return (
                      <div key={field.id}>
                        <label
                          htmlFor={`field-${field.id}`}
                          className="block text-sm font-medium text-slate-800"
                        >
                          {field.name}

                          {required && (
                            <span className="ml-1 text-red-600">*</span>
                          )}
                        </label>

                        {/* TEXT */}
                        {field.fieldType === "TEXT" && (
                          <input
                            id={`field-${field.id}`}
                            type="text"
                            className={inputClass}
                            value={typeof value === "string" ? value : ""}
                            required={required}
                            onChange={(event) =>
                              updateValue(field.id, event.target.value)
                            }
                          />
                        )}

                        {/* TEXTAREA */}
                        {field.fieldType === "TEXTAREA" && (
                          <textarea
                            id={`field-${field.id}`}
                            rows={4}
                            className={inputClass}
                            value={typeof value === "string" ? value : ""}
                            required={required}
                            onChange={(event) =>
                              updateValue(field.id, event.target.value)
                            }
                          />
                        )}

                        {/* NUMBER */}
                        {field.fieldType === "NUMBER" && (
                          <input
                            id={`field-${field.id}`}
                            type="number"
                            step="any"
                            className={inputClass}
                            value={typeof value === "string" ? value : ""}
                            required={required}
                            onChange={(event) =>
                              updateValue(field.id, event.target.value)
                            }
                          />
                        )}

                        {/* DATE */}
                        {field.fieldType === "DATE" && (
                          <input
                            id={`field-${field.id}`}
                            type="date"
                            className={inputClass}
                            value={typeof value === "string" ? value : ""}
                            required={required}
                            onChange={(event) =>
                              updateValue(field.id, event.target.value)
                            }
                          />
                        )}

                        {/* BOOLEAN */}
                        {field.fieldType === "BOOLEAN" && (
                          <select
                            id={`field-${field.id}`}
                            className={inputClass}
                            value={
                              typeof value === "boolean" ? String(value) : ""
                            }
                            required={required}
                            onChange={(event) =>
                              updateValue(
                                field.id,
                                event.target.value === ""
                                  ? ""
                                  : event.target.value === "true",
                              )
                            }
                          >
                            <option value="">Не выбрано</option>
                            <option value="true">Да</option>
                            <option value="false">Нет</option>
                          </select>
                        )}

                        {/* SELECT */}
                        {field.fieldType === "SELECT" && (
                          <select
                            id={`field-${field.id}`}
                            className={inputClass}
                            value={
                              Array.isArray(value) && value.length > 0
                                ? String(value[0])
                                : ""
                            }
                            required={required}
                            onChange={(event) =>
                              updateValue(
                                field.id,
                                event.target.value
                                  ? [Number(event.target.value)]
                                  : [],
                              )
                            }
                          >
                            <option value="">Выберите вариант</option>

                            {field.options
                              .filter((option) => option.active)
                              .map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                          </select>
                        )}

                        {/* MULTISELECT */}
                        {field.fieldType === "MULTISELECT" && (
                          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
                            {field.options
                              .filter((option) => option.active)
                              .map((option) => {
                                const selectedIds = Array.isArray(value)
                                  ? value
                                  : [];

                                return (
                                  <label
                                    key={option.id}
                                    className="flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm hover:bg-slate-50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(option.id)}
                                      onChange={(event) => {
                                        const nextIds = event.target.checked
                                          ? [...selectedIds, option.id]
                                          : selectedIds.filter(
                                              (id) => id !== option.id,
                                            );

                                        updateValue(field.id, nextIds);
                                      }}
                                      className="size-4 rounded border-slate-300 text-[#457B9D] focus:ring-[#457B9D]"
                                    />

                                    {option.label}
                                  </label>
                                );
                              })}

                            {field.options.filter((option) => option.active)
                              .length === 0 && (
                              <p className="text-sm text-slate-500">
                                Варианты ответа пока не настроены.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D3557] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27476f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saveMutation.isPending ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}

                    {saveMutation.isPending
                      ? "Сохраняем..."
                      : "Сохранить анкету"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {!isProfileRole && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-600">
              Для вашей роли заполнение анкеты наставника или наставляемого не
              предусмотрено.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
