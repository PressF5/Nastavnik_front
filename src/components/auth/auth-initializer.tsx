"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

type RefreshResponse = AuthUser & {
  accessToken: string;
};

// Не допускаем параллельных refresh-запросов при повторном запуске эффекта.
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

  useEffect(() => {
    const isProtectedRoute =
      pathname === "/dashboard" || pathname.startsWith("/dashboard/");

    // Пока восстанавливаем сессию только для личного кабинета.
    if (!isProtectedRoute) {
      return;
    }

    const store = useAuthStore.getState();

    // Если пользователь уже вошёл и токен есть в памяти,
    // повторный refresh при переходе по страницам не нужен.
    if (store.accessToken && store.user) {
      store.setInitialized(true);
      return;
    }

    store.setInitialized(false);

    void refreshSession()
      .then((response) => {
        const { accessToken, ...user } = response;

        useAuthStore.getState().setAuth(accessToken, user);
      })
      .catch(() => {
        // Cookie отсутствует, истекла или сервер отклонил refresh.
        useAuthStore.getState().setInitialized(true);
      });
  }, [pathname]);

  return null;
}
