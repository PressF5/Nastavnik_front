"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

type LoginResponse = AuthUser & {
  accessToken: string;
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isInitialized && user) {
      router.replace("/dashboard");
    }
  }, [isInitialized, user, router]);

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const { accessToken, ...user } = response;

      setAuth(accessToken, user);
      router.replace("/dashboard");
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.status === 401 || cause.status === 403) {
          setError("Неверный email или пароль либо вход запрещён.");
        } else {
          setError(cause.message);
        }
      } else {
        setError(
          cause instanceof Error ? cause.message : "Не удалось выполнить вход.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClassName =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20 disabled:bg-slate-100";

  if (!isInitialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-slate-600">Проверяем авторизацию...</p>
      </main>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-wide text-[#457B9D]">
            НАСТАВНИК+
          </p>

          <h1 className="mt-3 text-2xl font-semibold text-[#1D3557]">
            Вход в систему
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Введите email и пароль своей учётной записи.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset disabled={isSubmitting} className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Электронная почта
              <input
                className={inputClassName}
                type="email"
                autoComplete="username"
                required
                maxLength={250}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Пароль
              <span className="relative mt-1 block">
                <input
                  className={`${inputClassName} pr-12`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={100}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Введите пароль"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Скрыть пароль" : "Показать пароль"
                  }
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-[#1D3557]"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </span>
            </label>
          </fieldset>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#1D3557] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#27476f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Выполняется вход..." : "Войти"}
          </button>
        </form>
      </section>
    </main>
  );
}
