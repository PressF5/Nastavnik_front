"use client";

import { useEffect, useState, ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";

type BootstrapForm = {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  password: string;
  passwordConfirm: string;
  birthDate: string;
  regionCode: string;
  regionName: string;
};

const initialForm: BootstrapForm = {
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  password: "",
  passwordConfirm: "",
  birthDate: "",
  regionCode: "",
  regionName: "",
};

type RegistrationResponse = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  accountStatus: string;
};

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

export default function BootstrapPage() {
  const router = useRouter();

  const [form, setForm] = useState<BootstrapForm>(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maxBirthDate, setMaxBirthDate] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);

  useEffect(() => {
    setMaxBirthDate(new Date().toISOString().slice(0, 10));
  }, []);

  function updateField<K extends keyof BootstrapForm>(
    field: K,
    value: BootstrapForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault();
    setError("");

    if (form.password !== form.passwordConfirm) {
      setError("Пароли не совпадают.");
      return;
    }

    const regionCode = Number(form.regionCode);

    if (!Number.isSafeInteger(regionCode) || regionCode <= 0) {
      setError("Код региона должен быть положительным целым числом.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch<RegistrationResponse>("/api/bootstrap/region-admin", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim() || null,
          email: form.email.trim(),
          password: form.password,
          birthDate: form.birthDate,
          regionCode,
          regionName: form.regionName.trim(),
        }),
      });

      router.replace("/login");
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.status === 409) {
          setError(
            "Регион или администратор уже зарегистрирован. Обновите состояние системы.",
          );
        } else if (cause.status === 400) {
          setError(cause.message || "Проверьте правильность заполнения полей.");
        } else {
          setError(cause.message);
        }
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Не удалось выполнить первоначальную настройку.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClassName =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20 disabled:bg-slate-100";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-wide text-[#457B9D]">
            НАСТАВНИК+
          </p>

          <h1 className="mt-3 text-2xl font-semibold text-[#1D3557] sm:text-3xl">
            Первоначальная настройка
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Создайте регион и учётную запись первого регионального
            администратора. После этого первоначальная настройка будет
            завершена.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={isSubmitting} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1D3557]">
                Данные администратора
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Фамилия *
                  <input
                    className={inputClassName}
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
                    className={inputClassName}
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
                    className={inputClassName}
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
                    className={inputClassName}
                    type="date"
                    required
                    max={maxBirthDate || undefined}
                    value={form.birthDate}
                    onChange={(e) => updateField("birthDate", e.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Электронная почта *
                  <input
                    className={inputClassName}
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={250}
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="admin@example.com"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Пароль *
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      required
                      minLength={8}
                      maxLength={100}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-14 text-gray-900 outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword ? "Скрыть пароль" : "Показать пароль"
                      }
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-[#1D3557]"
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                          <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.3 4.5 9 7-.3 1.1-1.1 2.5-2.3 3.7" />
                          <path d="M6.2 6.2C4 7.5 2.5 9.7 2 12c.7 2.5 4 7 10 7 1 0 2-.2 2.9-.5" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Повторите пароль *
                  <div className="relative">
                    <input
                      id="passwordConfirm"
                      name="passwordConfirm"
                      type={showPasswordConfirmation ? "text" : "password"}
                      value={form.passwordConfirm}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          passwordConfirm: event.target.value,
                        }))
                      }
                      required
                      minLength={8}
                      maxLength={100}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-14 text-gray-900 outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswordConfirmation((current) => !current)
                      }
                      aria-label={
                        showPasswordConfirmation
                          ? "Скрыть пароль"
                          : "Показать пароль"
                      }
                      aria-pressed={showPasswordConfirmation}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-[#1D3557]"
                    >
                      {showPasswordConfirmation ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                          <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.3 4.5 9 7-.3 1.1-1.1 2.5-2.3 3.7" />
                          <path d="M6.2 6.2C4 7.5 2.5 9.7 2 12c.7 2.5 4 7 10 7 1 0 2-.2 2.9-.5" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h2 className="text-lg font-semibold text-[#1D3557]">
                Данные региона
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Код региона *
                  <input
                    className={inputClassName}
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={form.regionCode}
                    onChange={(e) => updateField("regionCode", e.target.value)}
                    placeholder="Например, 1"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Название региона *
                  <input
                    className={inputClassName}
                    required
                    maxLength={500}
                    value={form.regionName}
                    onChange={(e) => updateField("regionName", e.target.value)}
                    placeholder="Полное название региона"
                  />
                </label>
              </div>
            </div>
          </fieldset>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#1D3557] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27476f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Выполняется настройка..."
              : "Создать регион и администратора"}
          </button>

          <p className="text-xs leading-5 text-slate-500">
            Поля, отмеченные звёздочкой, обязательны. Эта форма предназначена
            только для первоначальной настройки пустой системы.
          </p>
        </form>
      </section>
    </main>
  );
}
