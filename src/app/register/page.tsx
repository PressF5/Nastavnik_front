"use client";

import { useEffect, useState, type ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api-client";

type Role = "MSU_ADMIN" | "OO_ADMIN" | "MENTOR" | "MENTEE";

type RegistrationOption = {
  id: number;
  name: string;
};

type RegistrationResponse = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  role: Role;
  accountStatus: "PENDING" | "ACCEPTED" | "REJECTED";
};

type RegistrationForm = {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  password: string;
  passwordConfirm: string;
  birthDate: string;
  role: Role | "";
  msuId: string;
  educationalOrganizationId: string;
};

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

const initialForm: RegistrationForm = {
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  password: "",
  passwordConfirm: "",
  birthDate: "",
  role: "",
  msuId: "",
  educationalOrganizationId: "",
};

const roles: { value: Role; label: string }[] = [
  { value: "MSU_ADMIN", label: "Администратор МСУ" },
  { value: "OO_ADMIN", label: "Администратор образовательной организации" },
  { value: "MENTOR", label: "Наставник" },
  { value: "MENTEE", label: "Наставляемый" },
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20 disabled:cursor-not-allowed disabled:bg-slate-100";

const buttonPrimary =
  "inline-flex w-full items-center justify-center rounded-lg bg-[#1D3557] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#27476f] disabled:cursor-not-allowed disabled:opacity-50";

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось выполнить регистрацию.";
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isAgeOver35(birthDate: string): boolean {
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const birthdayNotReached =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() < birth.getDate());

  if (birthdayNotReached) {
    age--;
  }

  return age > 35;
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [msus, setMsus] = useState<RegistrationOption[]>([]);
  const [organizations, setOrganizations] = useState<RegistrationOption[]>([]);

  const [isLoadingMsus, setIsLoadingMsus] = useState(false);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const [referenceError, setReferenceError] = useState("");

  const [today, setToday] = useState("");

  const requiresOrganization = form.role !== "" && form.role !== "MSU_ADMIN";

  function updateField<K extends keyof RegistrationForm>(
    field: K,
    value: RegistrationForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  useEffect(() => {
    setToday(formatDate(new Date()));
  }, []);

  // Загружаем МСУ при выборе роли.
  useEffect(() => {
    if (!form.role) {
      setMsus([]);
      setOrganizations([]);
      return;
    }

    let cancelled = false;

    async function loadMsus() {
      setIsLoadingMsus(true);
      setReferenceError("");
      setMsus([]);
      setOrganizations([]);

      try {
        const result = await apiFetch<RegistrationOption[]>(
          "/api/registration/msus",
          {
            params: { role: form.role! },
          },
        );

        if (!cancelled) {
          setMsus(result);
        }
      } catch (cause) {
        if (!cancelled) {
          setReferenceError(getErrorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMsus(false);
        }
      }
    }

    void loadMsus();

    return () => {
      cancelled = true;
    };
  }, [form.role]);

  // Для ролей, которым нужна ОО, загружаем организации выбранного МСУ.
  useEffect(() => {
    if (!requiresOrganization || !form.msuId) {
      setOrganizations([]);
      return;
    }

    let cancelled = false;

    async function loadOrganizations() {
      setIsLoadingOrganizations(true);
      setReferenceError("");
      setOrganizations([]);

      try {
        const result = await apiFetch<RegistrationOption[]>(
          `/api/registration/msus/${form.msuId}/educational-organizations`,
          {
            params: { role: form.role! },
          },
        );

        if (!cancelled) {
          setOrganizations(result);
        }
      } catch (cause) {
        if (!cancelled) {
          setReferenceError(getErrorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOrganizations(false);
        }
      }
    }

    void loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [form.role, form.msuId, requiresOrganization]);

  function handleRoleChange(role: Role | "") {
    setForm((current) => ({
      ...current,
      role,
      msuId: "",
      educationalOrganizationId: "",
    }));

    setError("");
    setReferenceError("");
    setOrganizations([]);
  }

  function handleMsuChange(msuId: string) {
    setForm((current) => ({
      ...current,
      msuId,
      educationalOrganizationId: "",
    }));

    setReferenceError("");
    setOrganizations([]);
  }

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault();
    setError("");

    if (!form.role) {
      setError("Выберите роль.");
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError("Пароли не совпадают.");
      return;
    }

    if (today && form.birthDate > today) {
      setError("Дата рождения не может быть в будущем.");
      return;
    }

    if (form.role === "MENTEE" && isAgeOver35(form.birthDate)) {
      setError("Возраст наставляемого не должен превышать 35 лет.");
      return;
    }

    if (!form.msuId) {
      setError("Выберите МСУ.");
      return;
    }

    if (requiresOrganization && !form.educationalOrganizationId) {
      setError("Выберите образовательную организацию.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch<RegistrationResponse>("/api/registration", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim() || null,
          email: form.email.trim(),
          password: form.password,
          birthDate: form.birthDate,
          role: form.role,
          msuId: Number(form.msuId),
          educationalOrganizationId: requiresOrganization
            ? Number(form.educationalOrganizationId)
            : null,
        }),
      });

      router.replace("/login?registered=1");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <header className="mb-8">
          <p className="text-sm font-semibold tracking-wide text-[#457B9D]">
            НАСТАВНИК+
          </p>

          <h1 className="mt-3 text-2xl font-semibold text-[#1D3557] sm:text-3xl">
            Регистрация
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Заполните данные для создания учётной записи. После регистрации
            учётная запись будет ожидать подтверждения.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={isSubmitting} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#1D3557]">
                Личные данные
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Фамилия *
                  <input
                    className={inputClass}
                    autoComplete="family-name"
                    required
                    maxLength={100}
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="Иванов"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Имя *
                  <input
                    className={inputClass}
                    autoComplete="given-name"
                    required
                    maxLength={100}
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="Иван"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Отчество
                  <input
                    className={inputClass}
                    autoComplete="additional-name"
                    maxLength={100}
                    value={form.middleName}
                    onChange={(e) => updateField("middleName", e.target.value)}
                    placeholder="Иванович"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Дата рождения *
                  <input
                    className={inputClass}
                    type="date"
                    required
                    max={today || undefined}
                    value={form.birthDate}
                    onChange={(e) => updateField("birthDate", e.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Электронная почта *
                  <input
                    className={inputClass}
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={250}
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-[#1D3557]">
                Учётная запись
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Роль *
                  <select
                    className={inputClass}
                    required
                    value={form.role}
                    onChange={(e) =>
                      handleRoleChange(e.target.value as Role | "")
                    }
                  >
                    <option value="">Выберите роль</option>
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Пароль *
                  <span className="relative mt-1.5 block">
                    <input
                      className={`${inputClass} pr-12`}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={100}
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="Не менее 8 символов"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? "Скрыть пароль" : "Показать пароль"
                      }
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </span>
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Подтверждение пароля *
                  <span className="relative mt-1.5 block">
                    <input
                      className={`${inputClass} pr-12`}
                      type={showPasswordConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={100}
                      value={form.passwordConfirm}
                      onChange={(e) =>
                        updateField("passwordConfirm", e.target.value)
                      }
                      placeholder="Повторите пароль"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm((value) => !value)}
                      aria-label={
                        showPasswordConfirm
                          ? "Скрыть пароль"
                          : "Показать пароль"
                      }
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"
                    >
                      {showPasswordConfirm ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </span>
                </label>
              </div>
            </div>

            {form.role && (
              <div>
                <h2 className="text-lg font-semibold text-[#1D3557]">
                  Организация
                </h2>

                <div className="mt-4 space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Муниципальное образование (МСУ) *
                    <select
                      className={inputClass}
                      required
                      value={form.msuId}
                      onChange={(e) => handleMsuChange(e.target.value)}
                    >
                      <option value="">
                        {isLoadingMsus ? "Загружаем МСУ..." : "Выберите МСУ"}
                      </option>
                      {msus.map((msu) => (
                        <option key={msu.id} value={msu.id}>
                          {msu.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!isLoadingMsus && msus.length === 0 && !referenceError && (
                    <p className="text-sm text-amber-700">
                      Нет доступных МСУ. Возможно, региональный администратор
                      ещё не создал ни одного МСУ.
                    </p>
                  )}

                  {requiresOrganization && (
                    <label className="block text-sm font-medium text-slate-700">
                      Образовательная организация (ОО) *
                      <select
                        className={inputClass}
                        required
                        disabled={
                          !form.msuId ||
                          isLoadingOrganizations ||
                          organizations.length === 0
                        }
                        value={form.educationalOrganizationId}
                        onChange={(e) =>
                          updateField(
                            "educationalOrganizationId",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">
                          {!form.msuId
                            ? "Сначала выберите МСУ"
                            : isLoadingOrganizations
                              ? "Загружаем организации..."
                              : "Выберите ОО"}
                        </option>
                        {organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                      </select>
                      {form.msuId &&
                        !isLoadingOrganizations &&
                        organizations.length === 0 &&
                        !referenceError && (
                          <span className="mt-1 block text-xs text-amber-700">
                            Для выбранного МСУ пока нет доступных ОО.
                          </span>
                        )}
                    </label>
                  )}
                </div>
              </div>
            )}
          </fieldset>

          {referenceError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {referenceError}
              <button
                type="button"
                onClick={() => {
                  setReferenceError("");
                  if (form.role) {
                    setForm((current) => ({ ...current }));
                  }
                }}
                className="ml-2 font-semibold underline"
              >
                Проверьте соединение и повторите загрузку.
              </button>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !form.role ||
              isLoadingMsus ||
              isLoadingOrganizations ||
              msus.length === 0 ||
              (requiresOrganization && organizations.length === 0)
            }
            className={buttonPrimary}
          >
            {isSubmitting ? "Регистрируем..." : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Уже есть учётная запись?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#457B9D] hover:underline"
          >
            Войти
          </Link>
        </p>
      </section>
    </main>
  );
}
