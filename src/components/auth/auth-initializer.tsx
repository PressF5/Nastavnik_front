"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

type RefreshResponse = AuthUser & {
  accessToken: string;
};

// Не допускаем параллельных запросов восстановления сессии.
let refreshRequest: Promise<RefreshResponse> | null = null;

function refreshSession(): Promise<RefreshResponse> {
  if (!refreshRequest) {
    refreshRequest = apiFetch<RefreshResponse>("/api/auth/refresh", {
      method: "POST",
    }).finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

export function AuthInitializer() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isLoginPage = pathname === "/login";
    const isDashboardPage =
      pathname === "/dashboard" || pathname.startsWith("/dashboard/");

    // Проверяем только страницы входа и личного кабинета.
    if (!isLoginPage && !isDashboardPage) {
      return;
    }

    let cancelled = false;

    const store = useAuthStore.getState();

    // Пользователь уже авторизован в текущем состоянии приложения.
    if (store.accessToken && store.user) {
      store.setInitialized(true);

      if (isLoginPage) {
        router.replace("/dashboard");
      }

      return;
    }

    // До завершения проверки не показываем форму входа
    // и содержимое личного кабинета.
    store.setInitialized(false);

    void refreshSession()
      .then((response) => {
        if (cancelled) return;

        const { accessToken, ...user } = response;

        useAuthStore.getState().setAuth(accessToken, user);

        if (isLoginPage) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        if (cancelled) return;

        useAuthStore.getState().setInitialized(true);

        if (isDashboardPage) {
          router.replace("/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
