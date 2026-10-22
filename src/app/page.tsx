"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

type BootstrapStatusResponse = {
  initialized: boolean;
};

export default function HomePage() {
  const router = useRouter();

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["bootstrap", "status"],
    queryFn: () => apiFetch<BootstrapStatusResponse>("/api/bootstrap/status"),
    retry: 1,
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.initialized) {
      router.replace("/login");
    } else {
      router.replace("/bootstrap");
    }
  }, [data, router]);

  if (isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-[#1D3557]">
            Не удалось подключиться к серверу
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Проверьте, запущен ли backend и правильно ли задан
            NEXT_PUBLIC_API_URL.
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-6 rounded-lg bg-[#1D3557] px-5 py-3 font-medium text-white transition hover:bg-[#27476f] disabled:opacity-50"
          >
            {isFetching ? "Проверяем..." : "Повторить"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] p-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#A8DADC] border-t-[#1D3557]" />

        <h1 className="mt-5 text-2xl font-semibold text-[#1D3557]">
          Наставник+
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          {isPending ? "Проверяем состояние системы..." : "Перенаправляем..."}
        </p>
      </div>
    </main>
  );
}
