"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Search, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { EventCreateDialog } from "@/components/dashboard/event-create-dialog";
import { EventDetailsDialog } from "@/components/dashboard/event-details-dialog";

import type {
  EventItem,
  EventLevel,
  EventFormat,
  EventStatus,
} from "@/types/event";

type SpringPage<T> = {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
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

function formatDateTime(value: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");

  return `${day}.${month}.${year} ${time.slice(0, 5)}`;
}

function statusLabel(status: EventStatus) {
  switch (status) {
    case "PLANNED":
      return "Запланировано";
    case "ONGOING":
      return "Идёт";
    case "COMPLETED":
      return "Завершено";
  }
}

function statusClass(status: EventStatus) {
  switch (status) {
    case "PLANNED":
      return "bg-blue-50 text-blue-700";
    case "ONGOING":
      return "bg-emerald-50 text-emerald-700";
    case "COMPLETED":
      return "bg-red-50 text-red-700";
  }
}

function formatLabel(format: EventFormat) {
  switch (format) {
    case "ONLINE":
      return "Онлайн";
    case "OFFLINE":
      return "Очно";
    case "HYBRID":
      return "Смешанный";
  }
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
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Запускаем поиск после небольшой паузы во вводе текста.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

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

  useEffect(() => {
    const events = eventsQuery.data?.content;

    if (!events?.length) {
      return;
    }

    const nextChange = events
      .map((event) => event.nextStatusChangeAt)
      .filter((value): value is string => value !== null)
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b)[0];

    if (nextChange === undefined) {
      return;
    }

    const delay = Math.max(0, nextChange - Date.now()) + 500;

    const timeout = window.setTimeout(
      () => {
        void eventsQuery.refetch();
      },
      Math.min(delay, 2_147_000_000),
    );

    return () => window.clearTimeout(timeout);
  }, [eventsQuery.data?.content, eventsQuery.refetch]);

  function handleSearch(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  if (!isInitialized || !user || !canAccess) {
    return null;
  }

  return (
    <main className="bg-[#F8F9FA] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        <DashboardPageHeader
          title={
            user.role === "REGION_ADMIN"
              ? "Кабинет администратора региона"
              : "Кабинет администратора МСУ"
          }
          description={
            user.role === "REGION_ADMIN"
              ? "Управление муниципальными управлениями, образовательными организациями и учётными записями."
              : "Управление образовательными организациями и заявками администраторов ОО."
          }
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

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-[#1D3557]">Мероприятия</h3>

              <p className="mt-1 text-sm text-slate-500">
                Управление федеральными, региональными и муниципальными
                мероприятиями в пределах доступного уровня полномочий.
              </p>
            </div>

            <EventCreateDialog
              isRegionAdmin={user.role === "REGION_ADMIN"}
              eventToEdit={editingEvent}
              onCloseEdit={() => setEditingEvent(null)}
            />
          </div>
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

          {eventsQuery.isPending ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Загружаем мероприятия...
            </p>
          ) : eventsQuery.isError ? (
            <div className="py-8">
              <p role="alert" className="text-sm text-red-700">
                {getErrorMessage(eventsQuery.error)}
              </p>
              <button
                type="button"
                onClick={() => void eventsQuery.refetch()}
                className={`${secondaryButton} mt-3`}
              >
                Повторить
              </button>
            </div>
          ) : eventsQuery.data.content.length === 0 ? (
            <div className="py-16 text-center">
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
              <div className="mt-5 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
                {eventsQuery.data.content.map((eventItem) => (
                  <article
                    key={eventItem.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEvent(eventItem)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedEvent(eventItem);
                      }
                    }}
                    className="flex h-full min-h-97.5 cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30 transition hover:border-[#457B9D]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#457B9D]/30"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <span className="min-w-0 truncate rounded-lg bg-[#E8F0F5] px-2 py-1.5 text-center text-xs font-medium text-[#1D3557]">
                        {levelLabel(eventItem.level)}
                      </span>

                      <span
                        className={`min-w-0 truncate px-2 text-center rounded-lg py-1.5 text-xs font-medium ${statusClass(eventItem.status)}`}
                      >
                        {statusLabel(eventItem.status)}
                      </span>

                      <span
                        className={`min-w-0 truncate px-2 text-center rounded-lg py-1.5 text-xs font-medium ${
                          eventItem.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {eventItem.active ? "Активно" : "Неактивно"}
                      </span>
                    </div>

                    <h2 className="mt-4 line-clamp-2 min-h-12 font-semibold leading-6 text-[#1D3557]">
                      {eventItem.name}
                    </h2>

                    <div className="mt-2 min-h-18">
                      {eventItem.description && (
                        <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                          {eventItem.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex-1 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                      <p>
                        <span className="text-slate-400">Формат:</span>{" "}
                        {formatLabel(eventItem.format)}
                      </p>

                      <p>
                        <span className="text-slate-400">Начало:</span>{" "}
                        {formatDateTime(eventItem.startAt)}
                      </p>

                      <p>
                        <span className="text-slate-400">Окончание:</span>{" "}
                        {formatDateTime(eventItem.endAt)}
                      </p>

                      {eventItem.location && (
                        <p>
                          <span className="text-slate-400">Место:</span>{" "}
                          {eventItem.location}
                        </p>
                      )}
                    </div>

                    <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-[#457B9D]">
                      Нажмите, чтобы посмотреть подробности
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
                <span>
                  Всего мероприятий: {eventsQuery.data.page.totalElements}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={secondaryButton}
                    disabled={eventsQuery.data.page.number === 0}
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                  >
                    Назад
                  </button>

                  <span>
                    Страница {eventsQuery.data.page.number + 1} из{" "}
                    {Math.max(1, eventsQuery.data.page.totalPages)}
                  </span>

                  <button
                    type="button"
                    className={secondaryButton}
                    disabled={
                      eventsQuery.data.page.number >=
                      eventsQuery.data.page.totalPages - 1
                    }
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      <EventDetailsDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={(event) => {
          setSelectedEvent(null);
          setEditingEvent(event);
        }}
        canEdit={Boolean(
          selectedEvent &&
          (user.role === "REGION_ADMIN"
            ? selectedEvent.level !== "MUNICIPAL"
            : selectedEvent.level === "MUNICIPAL"),
        )}
      />
    </main>
  );
}
