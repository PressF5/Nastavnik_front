"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

type MentorParticipation = {
  mentorId: number;
  fullName: string;
  msuName: string | null;
  educationalOrganizationName: string | null;
  participated: boolean;
  accountStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  blocked: boolean;
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

type Props = {
  academicYearId: number;
};

const pageSize = 20;

export function AcademicYearMentorParticipations({ academicYearId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [participatedFilter, setParticipatedFilter] = useState<
    "ALL" | "YES" | "NO"
  >("ALL");
  const [page, setPage] = useState(0);

  const participationsQuery = useQuery({
    queryKey: [
      "region-admin",
      "mentor-participations",
      academicYearId,
      search,
      participatedFilter,
      page,
    ],
    queryFn: () =>
      apiFetch<SpringPage<MentorParticipation>>(
        `/api/admin/academic-years/${academicYearId}/mentor-participations`,
        {
          params: {
            search: search.trim(),
            participated:
              participatedFilter === "ALL"
                ? undefined
                : participatedFilter === "YES",
            page,
            size: pageSize,
          },
        },
      ),
    enabled: isOpen,
  });

  function accountStatusLabel(status: MentorParticipation["accountStatus"]) {
    switch (status) {
      case "ACCEPTED":
        return "Подтверждена";
      case "PENDING":
        return "Ожидает подтверждения";
      case "REJECTED":
        return "Отклонена";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        {isOpen ? "Скрыть наставников" : "Участие наставников"}
      </button>

      {isOpen && (
        <section className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-semibold text-[#1D3557]">
                Участие наставников
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Всего записей: {participationsQuery.data?.totalElements ?? "—"}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Поиск по ФИО, МСУ или ОО"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#457B9D] sm:min-w-64"
              />

              <select
                value={participatedFilter}
                onChange={(event) => {
                  setParticipatedFilter(
                    event.target.value as "ALL" | "YES" | "NO",
                  );
                  setPage(0);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#457B9D]"
              >
                <option value="ALL">Все наставники</option>
                <option value="YES">Подтвердили участие</option>
                <option value="NO">Не подтвердили участие</option>
              </select>
            </div>
          </div>

          {participationsQuery.isPending ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Загружаем список наставников...
            </p>
          ) : participationsQuery.isError ? (
            <div className="py-8 text-center">
              <p role="alert" className="text-sm text-red-700">
                Не удалось загрузить список наставников:{" "}
                {participationsQuery.error.message}
              </p>

              <button
                type="button"
                onClick={() => void participationsQuery.refetch()}
                className="mt-3 text-sm font-medium text-[#457B9D] hover:underline"
              >
                Повторить
              </button>
            </div>
          ) : participationsQuery.data.empty ? (
            <p className="py-8 text-center text-sm text-slate-500">
              По заданным условиям наставники не найдены.
            </p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {participationsQuery.data.content.map((mentor) => (
                  <article
                    key={mentor.mentorId}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="space-y-2">
                      <h5 className="wrap-break-words font-semibold text-[#1D3557]">
                        {mentor.fullName}
                      </h5>

                      <div>
                        <span
                          className={
                            mentor.participated
                              ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              : "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                          }
                        >
                          {mentor.participated ? "Подтвердил" : "Не подтвердил"}
                        </span>
                      </div>
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">МСУ</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {mentor.msuName ?? "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-slate-500">
                          Образовательная организация
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {mentor.educationalOrganizationName ?? "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-slate-500">
                          Учётная запись
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {accountStatusLabel(mentor.accountStatus)}
                          {mentor.blocked && (
                            <span className="ml-2 text-red-600">
                              (Заблокирована)
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Страница {participationsQuery.data.number + 1} из{" "}
                  {participationsQuery.data.totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={participationsQuery.data.first}
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Назад
                  </button>

                  <button
                    type="button"
                    disabled={participationsQuery.data.last}
                    onClick={() => setPage((value) => value + 1)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Далее
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
