"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

type Msu = {
  id: number;
  code: number;
  name: string;
  regionId: number;
};

type EducationalOrganization = {
  id: number;
  code: number;
  name: string;
  msuId: number;
};

type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Не удалось загрузить данные.";
}

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function MsuDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const msuId = Number(params.id);
  const validId = Number.isSafeInteger(msuId) && msuId > 0;
  const isRegionAdmin = user?.role === "REGION_ADMIN";

  const [showCreateOrganizationForm, setShowCreateOrganizationForm] =
    useState(false);

  const [organizationCode, setOrganizationCode] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

  const msuQuery = useQuery({
    queryKey: ["region-admin", "msu", msuId],
    queryFn: () => apiFetch<Msu>(`/api/admin/msus/${msuId}`),
    enabled: isInitialized && isRegionAdmin && validId,
  });

  const organizationsQuery = useQuery({
    queryKey: [
      "region-admin",
      "msu",
      msuId,
      "educational-organizations",
      page,
      pageSize,
    ],
    queryFn: () =>
      apiFetch<SpringPage<EducationalOrganization>>(
        `/api/admin/msus/${msuId}/educational-organizations`,
        {
          params: {
            page,
            size: pageSize,
          },
        },
      ),
    enabled: isInitialized && isRegionAdmin && validId && msuQuery.isSuccess,
  });

  const createOrganizationMutation = useMutation({
    mutationFn: () =>
      apiFetch<EducationalOrganization>(
        "/api/admin/educational-organizations",
        {
          method: "POST",
          body: JSON.stringify({
            code: Number(organizationCode),
            name: organizationName.trim(),
            msuId,
          }),
        },
      ),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["region-admin", "msu", msuId, "educational-organizations"],
      });

      setOrganizationCode("");
      setOrganizationName("");
      setShowCreateOrganizationForm(false);
    },
  });

  if (!isInitialized || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-slate-600">Проверяем авторизацию...</p>
      </main>
    );
  }

  if (!isRegionAdmin) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] p-8">
        <p className="text-red-700">У вас нет доступа к этой странице.</p>
      </main>
    );
  }

  if (!validId) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] p-8">
        <p className="text-red-700">Некорректный идентификатор МСУ.</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className={`${buttonClass} mt-4`}
        >
          Вернуться в кабинет
        </button>
      </main>
    );
  }

  const organizations = organizationsQuery.data?.content ?? [];
  const totalElements = organizationsQuery.data?.totalElements ?? 0;
  const totalPages = organizationsQuery.data?.totalPages ?? 0;

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className={buttonClass}
        >
          <ArrowLeft size={16} />
          Вернуться к списку МСУ
        </button>

        {msuQuery.isPending ? (
          <p className="py-10 text-sm text-slate-500">
            Загружаем данные МСУ...
          </p>
        ) : msuQuery.isError ? (
          <section className="mt-6 rounded-xl border border-red-200 bg-white p-6">
            <h1 className="font-semibold text-red-700">
              Не удалось загрузить МСУ
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {getErrorMessage(msuQuery.error)}
            </p>
            <button
              type="button"
              onClick={() => void msuQuery.refetch()}
              className={`${buttonClass} mt-4`}
            >
              Повторить
            </button>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#E8F0F5] p-3 text-[#457B9D]">
                  <Building2 size={24} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Муниципальное управление
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold text-[#1D3557]">
                    {msuQuery.data.name}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    Код МСУ: {msuQuery.data.code}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#1D3557]">
                    Образовательные организации
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Организации, относящиеся к этому МСУ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-500">
                    Всего: {totalElements}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateOrganizationForm((value) => !value)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1D3557] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#27476f]"
                  >
                    <Building2 size={16} />
                    Добавить ОО
                  </button>
                </div>
              </div>

              {showCreateOrganizationForm && (
                <form
                  className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();

                    if (
                      !Number.isSafeInteger(Number(organizationCode)) ||
                      Number(organizationCode) <= 0 ||
                      !organizationName.trim()
                    ) {
                      return;
                    }

                    createOrganizationMutation.mutate();
                  }}
                >
                  <label className="text-sm font-medium text-slate-700">
                    Код ОО
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={organizationCode}
                      onChange={(event) =>
                        setOrganizationCode(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Название ОО
                    <input
                      type="text"
                      maxLength={500}
                      required
                      value={organizationName}
                      onChange={(event) =>
                        setOrganizationName(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={createOrganizationMutation.isPending}
                      className="rounded-lg bg-[#1D3557] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {createOrganizationMutation.isPending
                        ? "Создаём..."
                        : "Создать ОО"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCreateOrganizationForm(false)}
                      disabled={createOrganizationMutation.isPending}
                      className={buttonClass}
                    >
                      Отмена
                    </button>
                  </div>

                  {createOrganizationMutation.isError && (
                    <p
                      role="alert"
                      className="text-sm text-red-700 sm:col-span-2"
                    >
                      {getErrorMessage(createOrganizationMutation.error)}
                    </p>
                  )}
                </form>
              )}

              {organizationsQuery.isPending ? (
                <p className="py-8 text-sm text-slate-500">
                  Загружаем список организаций...
                </p>
              ) : organizationsQuery.isError ? (
                <div className="py-8">
                  <p role="alert" className="text-sm text-red-700">
                    {getErrorMessage(organizationsQuery.error)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void organizationsQuery.refetch()}
                    className={`${buttonClass} mt-3`}
                  >
                    Повторить
                  </button>
                </div>
              ) : organizations.length === 0 ? (
                <div className="py-12 text-center">
                  <Building2 size={32} className="mx-auto text-slate-300" />
                  <p className="mt-3 font-medium text-slate-800">
                    Образовательных организаций пока нет
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Список появится после создания ОО в этом МСУ.
                  </p>
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-3 font-medium">Код ОО</th>
                        <th className="px-3 py-3 font-medium">
                          Название образовательной организации
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {organizations.map((organization) => (
                        <tr key={organization.id} className="hover:bg-slate-50">
                          <td className="px-3 py-4 font-medium text-slate-700">
                            {organization.code}
                          </td>
                          <td className="px-3 py-4 text-slate-900">
                            {organization.name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <label htmlFor="organization-page-size">
                    Записей на странице:
                  </label>
                  <select
                    id="organization-page-size"
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(0);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                    disabled={page === 0 || organizationsQuery.isFetching}
                    className={buttonClass}
                  >
                    <ChevronLeft size={16} />
                    Назад
                  </button>

                  <span className="min-w-24 text-center text-sm text-slate-600">
                    {totalPages === 0 ? 0 : page + 1} из {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        totalPages === 0
                          ? 0
                          : Math.min(totalPages - 1, current + 1),
                      )
                    }
                    disabled={
                      page >= totalPages - 1 ||
                      totalPages === 0 ||
                      organizationsQuery.isFetching
                    }
                    className={buttonClass}
                  >
                    Далее
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function MsuDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
          <p className="text-sm text-slate-600">Загружаем данные МСУ...</p>
        </main>
      }
    >
      <MsuDetailContent />
    </Suspense>
  );
}
