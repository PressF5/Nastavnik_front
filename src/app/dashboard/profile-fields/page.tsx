"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  SlidersHorizontal,
  LoaderCircle,
  Trash2,
  Power,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

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

type RoleCode = "MENTOR" | "MENTEE";

type ProfileFieldOption = {
  id: number;
  profileFieldId: number;
  value: string;
  label: string;
  active: boolean;
  sortOrder: number;
};

type ProfileFieldRole = {
  roleCode: RoleCode;
  required: boolean;
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
  roles: ProfileFieldRole[];
  options: ProfileFieldOption[];
};

type CreateOption = {
  value: string;
  label: string;
};

type CreateProfileFieldRequest = {
  name: string;
  fieldType: ProfileFieldType;
  searchable: boolean;
  roles: ProfileFieldRole[];
  matchingEnabled: boolean;
  options: {
    value: string;
    label: string;
    sortOrder: number;
  }[];
};

type UpdateProfileFieldRequest = {
  expectedVersion: number;
  name: string;
  fieldType: ProfileFieldType;
  searchable: boolean;
  roles: ProfileFieldRole[];
  matchingEnabled: boolean;
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20";

const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D3557] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#27476f] disabled:cursor-not-allowed disabled:opacity-50";

const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

const fieldTypeLabels: Record<ProfileFieldType, string> = {
  TEXT: "Текст",
  TEXTAREA: "Многострочный текст",
  NUMBER: "Число",
  DATE: "Дата",
  BOOLEAN: "Да / Нет",
  SELECT: "Один вариант",
  MULTISELECT: "Несколько вариантов",
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

export default function ProfileFieldsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<ProfileFieldType>("TEXT");
  const [searchable, setSearchable] = useState(false);
  const [matchingEnabled, setMatchingEnabled] = useState(false);

  const [mentorEnabled, setMentorEnabled] = useState(true);
  const [menteeEnabled, setMenteeEnabled] = useState(false);

  const [mentorRequired, setMentorRequired] = useState(false);
  const [menteeRequired, setMenteeRequired] = useState(false);

  const [mentorSortOrder, setMentorSortOrder] = useState("0");
  const [menteeSortOrder, setMenteeSortOrder] = useState("0");

  const [options, setOptions] = useState<CreateOption[]>([
    { value: "", label: "" },
  ]);

  const isChoiceField = fieldType === "SELECT" || fieldType === "MULTISELECT";

  const canUseMatching = mentorEnabled && menteeEnabled;

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

  const fieldsQuery = useQuery({
    queryKey: ["profile-fields"],
    queryFn: () => apiFetch<ProfileField[]>("/api/profile-fields"),
    enabled: isInitialized && user?.role === "REGION_ADMIN",
  });

  const fields = fieldsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (request: CreateProfileFieldRequest) =>
      apiFetch<ProfileField>("/api/profile-fields", {
        method: "POST",
        body: JSON.stringify(request),
      }),

    onSuccess: async () => {
      toast.success("Поле анкеты создано.");

      resetForm();

      await queryClient.invalidateQueries({
        queryKey: ["profile-fields"],
      });
    },

    onError: (error) => {
      toast.error("Не удалось создать поле", {
        description: getErrorMessage(error),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      fieldId,
      request,
    }: {
      fieldId: number;
      request: UpdateProfileFieldRequest;
    }) =>
      apiFetch<ProfileField>(`/api/profile-fields/${fieldId}`, {
        method: "PUT",
        body: JSON.stringify(request),
      }),

    onSuccess: async () => {
      toast.success("Поле анкеты обновлено.");

      resetForm();

      await queryClient.invalidateQueries({
        queryKey: ["profile-fields"],
      });
    },

    onError: (error) => {
      toast.error("Не удалось обновить поле", {
        description: getErrorMessage(error),
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({
      fieldId,
      action,
    }: {
      fieldId: number;
      action: "activate" | "deactivate";
    }) =>
      apiFetch<void>(`/api/profile-fields/${fieldId}/${action}`, {
        method: "PATCH",
      }),

    onSuccess: async (_, variables) => {
      toast.success(
        variables.action === "deactivate"
          ? "Поле деактивировано."
          : "Поле активировано.",
      );

      await queryClient.invalidateQueries({
        queryKey: ["profile-fields"],
      });
    },

    onError: (error) => {
      toast.error("Не удалось изменить статус поля.", {
        description: getErrorMessage(error),
      });
    },
  });

  function resetForm() {
    setEditingFieldId(null);
    setEditingVersion(null);

    setName("");
    setFieldType("TEXT");
    setSearchable(false);
    setMatchingEnabled(false);

    setMentorEnabled(true);
    setMenteeEnabled(false);

    setMentorRequired(false);
    setMenteeRequired(false);

    setMentorSortOrder("0");
    setMenteeSortOrder("0");

    setOptions([{ value: "", label: "" }]);
    setShowCreateForm(false);
  }

  function handleEdit(field: ProfileField) {
    setEditingFieldId(field.id);
    setEditingVersion(field.version);

    setName(field.name);
    setFieldType(field.fieldType);
    setSearchable(field.searchable);
    setMatchingEnabled(field.matchingEnabled);

    const mentorRole = field.roles.find((role) => role.roleCode === "MENTOR");

    const menteeRole = field.roles.find((role) => role.roleCode === "MENTEE");

    setMentorEnabled(Boolean(mentorRole));
    setMenteeEnabled(Boolean(menteeRole));

    setMentorRequired(mentorRole?.required ?? false);
    setMenteeRequired(menteeRole?.required ?? false);

    setMentorSortOrder(String(mentorRole?.sortOrder ?? 0));
    setMenteeSortOrder(String(menteeRole?.sortOrder ?? 0));

    setOptions(
      field.options.length > 0
        ? field.options
            .filter((option) => option.active)
            .map((option) => ({
              value: option.value,
              label: option.label,
            }))
        : [{ value: "", label: "" }],
    );

    setShowCreateForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleToggleActive(field: ProfileField) {
    const action = field.active ? "deactivate" : "activate";

    const confirmed = window.confirm(
      field.active
        ? `Деактивировать поле «${field.name}»?\n\nОно перестанет отображаться в анкетах и участвовать в подборе. Существующие настройки и ответы сохранятся.`
        : `Активировать поле «${field.name}»?\n\nОно снова появится в анкетах с прежними настройками.`,
    );

    if (!confirmed) {
      return;
    }

    toggleActiveMutation.mutate({
      fieldId: field.id,
      action,
    });
  }

  function updateOption(index: number, key: keyof CreateOption, value: string) {
    setOptions((previous) =>
      previous.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [key]: value } : option,
      ),
    );
  }

  function addOption() {
    setOptions((previous) => [...previous, { value: "", label: "" }]);
  }

  function removeOption(index: number) {
    setOptions((previous) =>
      previous.filter((_, optionIndex) => optionIndex !== index),
    );
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      toast.error("Укажи название поля.");
      return;
    }

    if (!mentorEnabled && !menteeEnabled) {
      toast.error("Назначь поле хотя бы одной роли.");
      return;
    }

    if (matchingEnabled && !canUseMatching) {
      toast.error(
        "Для участия в подборе поле должно быть назначено обеим ролям.",
      );
      return;
    }

    const roles: ProfileFieldRole[] = [];

    if (mentorEnabled) {
      roles.push({
        roleCode: "MENTOR",
        required: mentorRequired,
        sortOrder: Number(mentorSortOrder),
      });
    }

    if (menteeEnabled) {
      roles.push({
        roleCode: "MENTEE",
        required: menteeRequired,
        sortOrder: Number(menteeSortOrder),
      });
    }

    if (
      roles.some(
        (role) => !Number.isInteger(role.sortOrder) || role.sortOrder < 0,
      )
    ) {
      toast.error("Порядок отображения должен быть целым числом от 0.");
      return;
    }

    const normalizedOptions = isChoiceField
      ? options.map((option) => ({
          value: option.value.trim(),
          label: option.label.trim(),
        }))
      : [];

    if (isChoiceField) {
      if (normalizedOptions.length === 0) {
        toast.error("Добавь хотя бы один вариант ответа.");
        return;
      }

      if (normalizedOptions.some((option) => !option.value || !option.label)) {
        toast.error("Заполни значение и название каждого варианта.");
        return;
      }

      const uniqueValues = new Set(
        normalizedOptions.map((option) => option.value),
      );

      if (uniqueValues.size !== normalizedOptions.length) {
        toast.error("Значения вариантов не должны повторяться.");
        return;
      }
    }

    if (editingFieldId !== null) {
      if (editingVersion === null) {
        toast.error("Не удалось определить версию редактируемого поля.");
        return;
      }

      const request: UpdateProfileFieldRequest = {
        expectedVersion: editingVersion,
        name: normalizedName,
        fieldType,
        searchable,
        roles,
        matchingEnabled,
      };

      updateMutation.mutate({
        fieldId: editingFieldId,
        request,
      });

      return;
    }

    const request: CreateProfileFieldRequest = {
      name: normalizedName,
      fieldType,
      searchable,
      roles,
      matchingEnabled,
      options: normalizedOptions.map((option, index) => ({
        ...option,
        sortOrder: index,
      })),
    };

    createMutation.mutate(request);
  }

  if (!isInitialized || !user) {
    return (
      <main className="flex min-h-64 items-center justify-center p-6">
        <p className="text-sm text-slate-600">Проверяем авторизацию...</p>
      </main>
    );
  }

  if (user.role !== "REGION_ADMIN") {
    return (
      <main className="p-8">
        <p className="text-sm text-red-700">
          У вас нет доступа к конструктору анкет.
        </p>
      </main>
    );
  }

  return (
    <main className="min-w-0 bg-[#F8F9FA] p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#E8F0F5] text-[#457B9D]">
                <SlidersHorizontal size={22} />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-[#1D3557]">
                  Конструктор анкет
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Управление полями анкет наставников и наставляемых
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className={buttonSecondary}
          >
            <ArrowLeft size={16} />
            Вернуться в кабинет
          </button>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-[#1D3557]">Поля анкеты</h2>

              <p className="mt-1 text-sm text-slate-500">
                Всего полей: {fields.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateForm((previous) => !previous)}
              className={buttonPrimary}
            >
              <Plus size={17} />
              {showCreateForm ? "Скрыть форму" : "Создать поле"}
            </button>
          </div>

          {showCreateForm && (
            <form
              onSubmit={handleCreate}
              className="mt-6 space-y-6 border-t border-slate-100 pt-6"
            >
              <h3 className="text-base font-semibold text-[#1D3557]">
                {editingFieldId !== null ? "Редактирование поля" : "Новое поле"}
              </h3>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Название поля
                  </label>

                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={255}
                    required
                    placeholder="Например: Педагогический стаж"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Тип поля
                  </label>

                  <select
                    value={fieldType}
                    onChange={(event) => {
                      setFieldType(event.target.value as ProfileFieldType);
                      setOptions([{ value: "", label: "" }]);
                    }}
                    className={inputClass}
                    disabled={editingFieldId !== null}
                  >
                    {Object.entries(fieldTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  {editingFieldId !== null && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Изменение типа поля будет доступно отдельно при настройке
                      вариантов ответа.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-[#1D3557]">
                  Назначение поля
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Выбери, в чьей анкете должно отображаться поле.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <RoleSettings
                    title="Наставник"
                    enabled={mentorEnabled}
                    onEnabledChange={setMentorEnabled}
                    required={mentorRequired}
                    onRequiredChange={setMentorRequired}
                    sortOrder={mentorSortOrder}
                    onSortOrderChange={setMentorSortOrder}
                  />

                  <RoleSettings
                    title="Наставляемый"
                    enabled={menteeEnabled}
                    onEnabledChange={setMenteeEnabled}
                    required={menteeRequired}
                    onRequiredChange={setMenteeRequired}
                    sortOrder={menteeSortOrder}
                    onSortOrderChange={setMenteeSortOrder}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={searchable}
                    onChange={(event) => setSearchable(event.target.checked)}
                    className="size-4 rounded border-slate-300"
                  />
                  Использовать поле для поиска
                </label>

                <label
                  className={`flex items-center gap-3 text-sm ${
                    canUseMatching ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={matchingEnabled}
                    disabled={!canUseMatching}
                    onChange={(event) =>
                      setMatchingEnabled(event.target.checked)
                    }
                    className="size-4 rounded border-slate-300"
                  />
                  Использовать поле при подборе наставника
                </label>

                {!canUseMatching && (
                  <p className="text-xs text-slate-500">
                    Для подбора необходимо назначить поле и наставнику, и
                    наставляемому.
                  </p>
                )}
              </div>

              {isChoiceField && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1D3557]">
                        Варианты ответа
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Значение используется системой, название отображается
                        пользователю.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addOption}
                      className={buttonSecondary}
                    >
                      <Plus size={15} />
                      Добавить
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                      >
                        <input
                          value={option.label}
                          onChange={(event) =>
                            updateOption(index, "label", event.target.value)
                          }
                          maxLength={255}
                          placeholder="Название, например: Высшее"
                          className={inputClass}
                        />

                        <input
                          value={option.value}
                          onChange={(event) =>
                            updateOption(index, "value", event.target.value)
                          }
                          maxLength={255}
                          placeholder="Значение, например: higher"
                          className={inputClass}
                        />

                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          disabled={options.length === 1}
                          aria-label="Удалить вариант"
                          className="mt-1.5 inline-flex items-center justify-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-30"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={resetForm}
                  className={buttonSecondary}
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className={buttonPrimary}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}

                  {editingFieldId !== null
                    ? "Сохранить изменения"
                    : "Создать поле"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="space-y-4">
          {fieldsQuery.isPending && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin" />
              Загружаем поля анкеты...
            </div>
          )}

          {fieldsQuery.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm text-red-700">
                Не удалось загрузить список полей.
              </p>

              <button
                type="button"
                onClick={() => void fieldsQuery.refetch()}
                className="mt-3 text-sm font-medium text-red-700 underline"
              >
                Повторить запрос
              </button>
            </div>
          )}

          {fieldsQuery.isSuccess && fields.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="font-medium text-[#1D3557]">
                Поля анкеты пока не созданы
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Создай первое поле, чтобы настроить анкеты пользователей.
              </p>
            </div>
          )}

          {fields.map((field) => (
            <article
              key={field.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#1D3557]">
                      {field.name}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        field.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {field.active ? "Активно" : "Неактивно"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {fieldTypeLabels[field.fieldType]} · ID: {field.id}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {field.searchable && (
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600">
                      Поиск
                    </span>
                  )}

                  {field.matchingEnabled && (
                    <span className="rounded-lg bg-[#E8F0F5] px-2.5 py-1.5 text-xs text-[#1D3557]">
                      Участвует в подборе
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {field.active && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEdit(field)}
                        className={buttonSecondary}
                      >
                        Редактировать
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(field)}
                        disabled={toggleActiveMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Power size={16} />
                        Деактивировать
                      </button>
                    </>
                  )}

                  {!field.active && (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(field)}
                      disabled={toggleActiveMutation.isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      Активировать
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {field.roles.map((role) => (
                  <span
                    key={role.roleCode}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                  >
                    {role.roleCode === "MENTOR" ? "Наставник" : "Наставляемый"}
                    {role.required ? " · Обязательное" : ""}
                    {" · Порядок: "}
                    {role.sortOrder}
                  </span>
                ))}
              </div>

              {field.options.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500">
                    Варианты ответа
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {field.options.map((option) => (
                      <span
                        key={option.id}
                        className="rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
                      >
                        {option.label}
                        {!option.active ? " (неактивен)" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function RoleSettings({
  title,
  enabled,
  onEnabledChange,
  required,
  onRequiredChange,
  sortOrder,
  onSortOrderChange,
}: {
  title: string;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  required: boolean;
  onRequiredChange: (value: boolean) => void;
  sortOrder: string;
  onSortOrderChange: (value: string) => void;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="size-4 rounded border-slate-300"
        />
        {title}
      </label>

      {enabled && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => onRequiredChange(event.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            Обязательное поле
          </label>

          <div>
            <label className="text-xs text-slate-500">
              Порядок отображения
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={sortOrder}
              onChange={(event) => onSortOrderChange(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}
