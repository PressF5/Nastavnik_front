"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Search, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

type EventLevel = "FEDERAL" | "REGIONAL" | "MUNICIPAL";

type EventItem = {
  id: number;
  name: string;
  description: string | null;
  level: EventLevel;
  startDate: string;
  endDate: string | null;
  location: string | null;
  organizer: string | null;
  url: string | null;
  active: boolean;
  regionId: number;
  msuId: number | null;
  createdAt: string;
  updatedAt: string;
};

type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Не удалось загрузить мероприятия.";
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function levelLabel(level: EventLevel) {
  switch (level) {
    case "FEDERAL":
      return "Федеральное";
    case "REGIONAL":
      return "Региональное";
    case "MUNICIPAL":
      return "Муниципальное";
  }
}

export default function EventsPage() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [active, setActive] = useState("true");
  const [page, setPage] = useState(0);

  const pageSize = 10;

  const canAccess = user?.role === "REGION_ADMIN" || user?.role === "MSU_ADMIN";

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
      return;
    }

    if (isInitialized && user && !canAccess) {
      router.replace("/dashboard");
    }
  }, [isInitialized, user, canAccess, router]);

  const eventsQuery = useQuery({
    queryKey: ["admin-events", user?.id, search, level, active, page],
    queryFn: () =>
      apiFetch<SpringPage<EventItem>>("/api/admin/events", {
        params: {
          search,
          level: level || undefined,
          active: active === "" ? undefined : active === "true",
          page,
          size: pageSize,
        },
      }),
    enabled: isInitialized && canAccess,
  });

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  if (!isInitialized || !user || !canAccess) {
    return null;
  }

  return (
    <main className="space-y-6">
      <DashboardPageHeader
        title="Мероприятия"
        description="Каталог федеральных, региональных и муниципальных мероприятий."
        action={
          <button
            type="button"
            onClick={() => eventsQuery.refetch()}
            disabled={eventsQuery.isFetching}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={eventsQuery.isFetching ? "animate-spin" : ""}
            />
            Обновить
          </button>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <form onSubmit={handleSearch} className="flex gap-2 md:col-span-1">
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Название мероприятия"
              className={inputClass}
            />

            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#1D3557] px-3 text-white hover:bg-[#27476f]"
              aria-label="Найти"
            >
              <Search size={18} />
            </button>
          </form>

          <select
            value={level}
            onChange={(event) => {
              setLevel(event.target.value);
              setPage(0);
            }}
            className={inputClass}
          >
            <option value="">Все уровни</option>
            <option value="FEDERAL">Федеральные</option>
            <option value="REGIONAL">Региональные</option>
            <option value="MUNICIPAL">Муниципальные</option>
          </select>

          <select
            value={active}
            onChange={(event) => {
              setActive(event.target.value);
              setPage(0);
            }}
            className={inputClass}
          >
            <option value="true">Активные</option>
            <option value="false">Неактивные</option>
            <option value="">Все мероприятия</option>
          </select>
        </div>
      </section>

      {eventsQuery.isPending ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          Загружаем мероприятия...
        </div>
      ) : eventsQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {getErrorMessage(eventsQuery.error)}
        </div>
      ) : eventsQuery.data.empty ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center">
          <CalendarDays className="mx-auto size-10 text-slate-300" />
          <p className="mt-3 font-medium text-[#1D3557]">
            Мероприятия не найдены
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Измени параметры поиска или фильтры.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {eventsQuery.data.content.map((event) => (
              <article
                key={event.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[#E8F0F5] px-3 py-1.5 text-xs font-medium text-[#1D3557]">
                    {levelLabel(event.level)}
                  </span>

                  <span
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      event.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {event.active ? "Активно" : "Неактивно"}
                  </span>
                </div>

                <h2 className="mt-4 font-semibold leading-6 text-[#1D3557]">
                  {event.name}
                </h2>

                {event.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {event.description}
                  </p>
                )}

                <div className="mt-4 flex-1 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                  <p>
                    <span className="text-slate-400">Начало:</span>{" "}
                    {formatDate(event.startDate)}
                  </p>

                  {event.endDate && (
                    <p>
                      <span className="text-slate-400">Окончание:</span>{" "}
                      {formatDate(event.endDate)}
                    </p>
                  )}

                  {event.location && (
                    <p>
                      <span className="text-slate-400">Место:</span>{" "}
                      {event.location}
                    </p>
                  )}

                  {event.organizer && (
                    <p>
                      <span className="text-slate-400">Организатор:</span>{" "}
                      {event.organizer}
                    </p>
                  )}

                  {event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[#457B9D] hover:underline"
                    >
                      Подробнее о мероприятии
                    </a>
                  )}
                </div>
              </article>
            ))}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <span>Всего мероприятий: {eventsQuery.data.totalElements}</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={secondaryButton}
                disabled={eventsQuery.data.first}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Назад
              </button>

              <span>
                Страница {page + 1} из{" "}
                {Math.max(1, eventsQuery.data.totalPages)}
              </span>

              <button
                type="button"
                className={secondaryButton}
                disabled={eventsQuery.data.last}
                onClick={() => setPage((current) => current + 1)}
              >
                Вперёд
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
