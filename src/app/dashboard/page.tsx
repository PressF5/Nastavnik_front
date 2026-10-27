"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import {
  useDashboardShell,
  type DashboardSection,
} from "@/components/dashboard/dashboard-shell-context";

type Msu = {
  id: number;
  code: number;
  name: string;
  regionId: number;
};

type AdminUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  isBlock: boolean;
  role: string;
  accountStatus: "PENDING" | "ACCEPTED" | "REJECTED";
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
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20";

const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D3557] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#27476f] disabled:cursor-not-allowed disabled:opacity-50";

const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Произошла непредвиденная ошибка.";
}

function fullName(user: AdminUser): string {
  return [user.lastName, user.firstName, user.middleName]
    .filter(Boolean)
    .join(" ");
}

function statusLabel(status: AdminUser["accountStatus"]): string {
  switch (status) {
    case "PENDING":
      return "Ожидает подтверждения";
    case "ACCEPTED":
      return "Подтверждена";
    case "REJECTED":
      return "Отклонена";
  }
}

function StatusBadge({ status }: { status: AdminUser["accountStatus"] }) {
  const styles = {
    PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
    ACCEPTED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    REJECTED: "bg-red-50 text-red-800 ring-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [msuName, setMsuName] = useState("");
  const [msuCode, setMsuCode] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [msuSearch, setMsuSearch] = useState("");
  const [msuPage, setMsuPage] = useState(0);
  const [msuPageSize, setMsuPageSize] = useState(10);
  const [msuEditMode, setMsuEditMode] = useState(false);

  const [editingMsuId, setEditingMsuId] = useState<number | null>(null);
  const [editingMsuCode, setEditingMsuCode] = useState("");
  const [editingMsuName, setEditingMsuName] = useState("");
  const { section, setSection } = useDashboardShell();

  function startEditingMsu(msu: Msu) {
    setEditingMsuId(msu.id);
    setEditingMsuCode(String(msu.code));
    setEditingMsuName(msu.name);
  }

  function cancelEditingMsu() {
    setEditingMsuId(null);
    setEditingMsuCode("");
    setEditingMsuName("");
  }

  function saveEditingMsu(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingMsuId === null) {
      return;
    }

    const code = Number(editingMsuCode);
    const name = editingMsuName.trim();

    if (!Number.isInteger(code) || code <= 0) {
      toast.error("Код МСУ должен быть положительным целым числом.");
      return;
    }

    if (!name) {
      toast.error("Название МСУ не может быть пустым.");
      return;
    }

    updateMsuMutation.mutate({
      id: editingMsuId,
      code,
      name,
    });
  }

  function confirmDeleteMsu(msu: Msu) {
    const confirmed = window.confirm(
      `Удалить МСУ «${msu.name}»? Удаление невозможно, если к нему привязаны образовательные организации или администраторы МСУ.`,
    );

    if (confirmed) {
      deleteMsuMutation.mutate(msu.id);
    }
  }

  const isRegionAdmin = user?.role === "REGION_ADMIN";

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

  // Список МСУ только текущего региона.
  const msusQuery = useQuery({
    queryKey: ["region-admin", "msus", msuSearch, msuPage, msuPageSize],
    queryFn: () =>
      apiFetch<SpringPage<Msu>>("/api/admin/msus", {
        params: {
          search: msuSearch,
          page: msuPage,
          size: msuPageSize,
        },
      }),
    enabled: isInitialized && isRegionAdmin,
  });

  // Заявки, ожидающие решения регионального администратора.
  const pendingQuery = useQuery({
    queryKey: ["region-admin", "pending-msu-admins"],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: {
          role: "MSU_ADMIN",
          status: "PENDING",
          page: 0,
          size: 100,
        },
      }),
    enabled: isInitialized && isRegionAdmin,
  });

  // Заявки администраторов ОО, ожидающие решения регионального администратора.
  const pendingOoAdminsQuery = useQuery({
    queryKey: ["region-admin", "pending-oo-admins"],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: {
          role: "OO_ADMIN",
          status: "PENDING",
          page: 0,
          size: 100,
        },
      }),
    enabled: isInitialized && isRegionAdmin,
  });

  // Список администраторов МСУ текущего региона.
  const accountsQuery = useQuery({
    queryKey: ["region-admin", "msu-admins"],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: {
          role: "MSU_ADMIN",
          page: 0,
          size: 100,
        },
      }),
    enabled: isInitialized && isRegionAdmin,
  });

  const refreshDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["region-admin", "msus"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["region-admin", "pending-msu-admins"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["region-admin", "msu-admins"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["region-admin", "pending-oo-admins"],
      }),
    ]);
  };

  const createMsuMutation = useMutation({
    mutationFn: (request: { code: number; name: string }) =>
      apiFetch<Msu>("/api/admin/msus", {
        method: "POST",
        body: JSON.stringify(request),
      }),
    onSuccess: async () => {
      toast.success("МСУ создано.");
      setMsuName("");
      setMsuCode("");
      setShowCreateForm(false);
      await refreshDashboard();
    },
    onError: (error) => {
      toast.error("Не удалось создать МСУ", {
        description: getErrorMessage(error),
      });
    },
  });

  const updateMsuMutation = useMutation({
    mutationFn: ({
      id,
      code,
      name,
    }: {
      id: number;
      code: number;
      name: string;
    }) =>
      apiFetch<Msu>(`/api/admin/msus/${id}`, {
        method: "PUT",
        body: JSON.stringify({ code, name }),
      }),
    onSuccess: async () => {
      toast.success("Данные МСУ обновлены.");
      setEditingMsuId(null);
      setEditingMsuCode("");
      setEditingMsuName("");
      await refreshDashboard();
    },
    onError: (error) => {
      toast.error("Не удалось обновить МСУ", {
        description: getErrorMessage(error),
      });
    },
  });

  const deleteMsuMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/admin/msus/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      toast.success("МСУ удалено.");
      setEditingMsuId(null);
      await refreshDashboard();
    },
    onError: (error) => {
      toast.error("Не удалось удалить МСУ", {
        description: getErrorMessage(error),
      });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: number;
      action: "approve" | "reject";
    }) =>
      apiFetch<AdminUser>(`/api/admin/users/${id}/${action}`, {
        method: "PATCH",
      }),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.action === "approve"
          ? "Учётная запись подтверждена."
          : "Заявка отклонена.",
      );
      await refreshDashboard();
    },
    onError: (error) => {
      toast.error("Не удалось обработать заявку", {
        description: getErrorMessage(error),
      });
    },
  });

  async function handleCreateMsu(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = Number(msuCode);
    const name = msuName.trim();

    if (!Number.isInteger(code) || code <= 0) {
      toast.error("Код МСУ должен быть положительным целым числом.");
      return;
    }

    if (!name) {
      toast.error("Укажи название МСУ.");
      return;
    }

    createMsuMutation.mutate({ code, name });
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await apiFetch<void>("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Не удалось завершить сессию на сервере.", error);
    } finally {
      clearAuth();
      router.replace("/login");
    }
  }

  if (!isInitialized || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-slate-600">Проверяем авторизацию...</p>
      </main>
    );
  }

  if (!isRegionAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] p-6">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-[#1D3557]">
            Кабинет пока не реализован
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Для роли {user.role} кабинет будет добавлен на следующем этапе.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`${buttonPrimary} mt-6`}
          >
            <LogOut size={16} />
            {isLoggingOut ? "Выходим..." : "Выйти"}
          </button>
        </section>
      </main>
    );
  }

  const msus = msusQuery.data?.content ?? [];
  const totalMsus = msusQuery.data?.totalElements ?? 0;
  const totalMsuPages = msusQuery.data?.totalPages ?? 0;
  const pendingMsuAdmins = pendingQuery.data?.content ?? [];
  const pendingOoAdmins = pendingOoAdminsQuery.data?.content ?? [];

  const pendingAdmins = [...pendingMsuAdmins, ...pendingOoAdmins];

  const totalPendingAdmins =
    (pendingQuery.data?.totalElements ?? 0) +
    (pendingOoAdminsQuery.data?.totalElements ?? 0);

  const allAdmins = accountsQuery.data?.content ?? [];

  const isRefreshing =
    msusQuery.isFetching ||
    pendingQuery.isFetching ||
    pendingOoAdminsQuery.isFetching ||
    accountsQuery.isFetching;

  const navigation: {
    id: DashboardSection;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }[] = [
    { id: "overview", label: "Обзор", icon: LayoutDashboard },
    { id: "msus", label: "Мой регион: МСУ", icon: Building2 },
    {
      id: "requests",
      label: "Заявки",
      icon: ClipboardCheck,
      count: totalPendingAdmins,
    },
    { id: "accounts", label: "Администраторы МСУ", icon: Users },
  ];

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#457B9D]">
              НАСТАВНИК+
            </p>
            <h1 className="mt-2 text-lg font-semibold text-[#1D3557]">
              Управление регионом
            </h1>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "bg-[#E8F0F5] font-semibold text-[#1D3557]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <p className="truncate text-sm font-medium text-slate-800">
              {user.lastName} {user.firstName}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <LogOut size={16} />
              {isLoggingOut ? "Выходим..." : "Выйти"}
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  Панель управления / Регион
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[#1D3557]">
                  {navigation.find((item) => item.id === section)?.label}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => void refreshDashboard()}
                disabled={isRefreshing}
                className={buttonSecondary}
              >
                <RefreshCw
                  size={16}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                Обновить
              </button>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm ${
                    section === item.id
                      ? "bg-[#1D3557] text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {item.label}
                  {item.id === "requests" &&
                    item.count !== undefined &&
                    item.count > 0 &&
                    ` (${item.count})`}
                </button>
              ))}
            </nav>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
            {(msusQuery.isError ||
              pendingQuery.isError ||
              pendingOoAdminsQuery.isError ||
              accountsQuery.isError) && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <p>
                  Не удалось загрузить часть данных. Проверь backend и права
                  доступа, затем повтори запрос.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void msusQuery.refetch();
                    void pendingQuery.refetch();
                    void accountsQuery.refetch();
                    void pendingOoAdminsQuery.refetch();
                  }}
                  className="font-semibold underline"
                >
                  Повторить
                </button>
              </div>
            )}

            {section === "overview" && (
              <>
                <section>
                  <h3 className="text-lg font-semibold text-[#1D3557]">
                    Добро пожаловать в кабинет
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Здесь ты управляешь МСУ своего региона и подтверждаешь
                    регистрации их администраторов.
                  </p>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <StatCard
                    title="МСУ в регионе"
                    value={msusQuery.isPending ? "—" : totalMsus}
                    description="Созданные муниципальные управления"
                    icon={<Building2 size={21} />}
                  />
                  <StatCard
                    title="Ожидают решения"
                    value={
                      pendingQuery.isPending || pendingOoAdminsQuery.isPending
                        ? "—"
                        : totalPendingAdmins
                    }
                    description="Заявки администраторов МСУ и ОО"
                    icon={<ClipboardCheck size={21} />}
                  />
                  <StatCard
                    title="Администраторы МСУ"
                    value={
                      accountsQuery.isPending
                        ? "—"
                        : (accountsQuery.data?.totalElements ?? 0)
                    }
                    description="Учётные записи в твоём регионе"
                    icon={<Users size={21} />}
                  />
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#1D3557]">
                        Требуют внимания
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Заявки, которые ещё не обработаны
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection("requests")}
                      className="text-sm font-semibold text-[#457B9D] hover:underline"
                    >
                      Все заявки
                    </button>
                  </div>

                  {pendingQuery.isPending ? (
                    <p className="py-8 text-sm text-slate-500">
                      Загружаем заявки...
                    </p>
                  ) : pendingAdmins.length === 0 ? (
                    <p className="py-8 text-sm text-slate-500">
                      Нет заявок, ожидающих подтверждения.
                    </p>
                  ) : (
                    <div className="mt-4 divide-y divide-slate-100">
                      {pendingAdmins.slice(0, 5).map((admin) => (
                        <div
                          key={admin.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-4"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {fullName(admin)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {admin.email}
                            </p>
                          </div>
                          <StatusBadge status={admin.accountStatus} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {section === "msus" && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#1D3557]">
                      Муниципальные управления
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Все МСУ, относящиеся к твоему региону
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateForm((value) => !value)}
                    className={buttonPrimary}
                  >
                    <Plus size={17} />
                    {showCreateForm ? "Отмена" : "Создать МСУ"}
                  </button>
                </div>

                {showCreateForm && (
                  <form
                    onSubmit={handleCreateMsu}
                    className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
                  >
                    <label className="text-sm font-medium text-slate-700">
                      Код МСУ
                      <input
                        className={inputClass}
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={msuCode}
                        onChange={(event) => setMsuCode(event.target.value)}
                        placeholder="Например, 101"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Название МСУ
                      <input
                        className={inputClass}
                        type="text"
                        maxLength={500}
                        required
                        value={msuName}
                        onChange={(event) => setMsuName(event.target.value)}
                        placeholder="Введите название"
                      />
                    </label>

                    <div className="sm:col-span-2">
                      <p className="mb-3 text-xs text-slate-500">
                        Регион будет назначен автоматически по учётной записи
                        администратора.
                      </p>
                      <button
                        type="submit"
                        disabled={createMsuMutation.isPending}
                        className={buttonPrimary}
                      >
                        {createMsuMutation.isPending
                          ? "Создаём..."
                          : "Сохранить МСУ"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="relative block w-full sm:max-w-md">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={msuSearch}
                      onChange={(event) => {
                        setMsuSearch(event.target.value);
                        setMsuPage(0);
                      }}
                      placeholder="Поиск по коду или названию МСУ"
                      className={`${inputClass} mt-0 pl-9`}
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMsuEditMode((value) => !value);
                        cancelEditingMsu();
                      }}
                      className={buttonSecondary}
                    >
                      <Pencil size={16} />
                      {msuEditMode
                        ? "Завершить редактирование"
                        : "Режим редактирования"}
                    </button>
                  </div>
                </div>

                {msusQuery.isPending ? (
                  <p className="py-8 text-sm text-slate-500">
                    Загружаем список МСУ...
                  </p>
                ) : msusQuery.isError ? (
                  <p role="alert" className="py-8 text-sm text-red-700">
                    Не удалось загрузить список МСУ.
                  </p>
                ) : msus.length === 0 ? (
                  <div className="py-12 text-center">
                    <Building2 size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 font-medium text-slate-800">
                      {msuSearch
                        ? "МСУ по вашему запросу не найдены"
                        : "МСУ ещё не созданы"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {msuSearch
                        ? "Измените поисковый запрос."
                        : "Создайте первое МСУ, чтобы продолжить работу."}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full table-fixed text-left text-sm">
                      <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-medium">Код</th>
                          <th className="px-3 py-3 font-medium">
                            Название МСУ
                          </th>
                          {msuEditMode && (
                            <th className="px-3 py-3 font-medium">Действия</th>
                          )}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {msus.map((msu) => (
                          <tr key={msu.id} className="hover:bg-slate-50">
                            {editingMsuId === msu.id ? (
                              <td colSpan={msuEditMode ? 3 : 2} className="p-3">
                                <form
                                  onSubmit={saveEditingMsu}
                                  className="grid gap-3 sm:grid-cols-2"
                                >
                                  <label className="text-xs font-medium text-slate-600">
                                    Код
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      required
                                      value={editingMsuCode}
                                      onChange={(event) =>
                                        setEditingMsuCode(event.target.value)
                                      }
                                      className={inputClass}
                                    />
                                  </label>

                                  <label className="text-xs font-medium text-slate-600">
                                    Название
                                    <input
                                      type="text"
                                      maxLength={500}
                                      required
                                      value={editingMsuName}
                                      onChange={(event) =>
                                        setEditingMsuName(event.target.value)
                                      }
                                      className={inputClass}
                                    />
                                  </label>

                                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                                    <button
                                      type="submit"
                                      disabled={updateMsuMutation.isPending}
                                      className={buttonPrimary}
                                    >
                                      {updateMsuMutation.isPending
                                        ? "Сохраняем..."
                                        : "Сохранить"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={cancelEditingMsu}
                                      disabled={updateMsuMutation.isPending}
                                      className={buttonSecondary}
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                </form>
                              </td>
                            ) : (
                              <>
                                <td className="px-3 py-4 font-medium text-slate-700">
                                  {msu.code}
                                </td>

                                <td className="px-3 py-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.push(`/dashboard/msus/${msu.id}`)
                                    }
                                    className="text-left font-medium text-[#1D3557] hover:text-[#457B9D] hover:underline"
                                  >
                                    {msu.name}
                                  </button>
                                </td>

                                {msuEditMode && (
                                  <td className="px-3 py-4">
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => startEditingMsu(msu)}
                                        className={buttonSecondary}
                                        aria-label={`Редактировать ${msu.name}`}
                                      >
                                        <Pencil size={15} />
                                        Изменить
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => confirmDeleteMsu(msu)}
                                        disabled={deleteMsuMutation.isPending}
                                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                        aria-label={`Удалить ${msu.name}`}
                                      >
                                        <Trash2 size={15} />
                                        Удалить
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <label htmlFor="msu-page-size">Записей на странице:</label>
                    <select
                      id="msu-page-size"
                      value={msuPageSize}
                      onChange={(event) => {
                        setMsuPageSize(Number(event.target.value));
                        setMsuPage(0);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-2"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>

                    <span>Всего: {totalMsus}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMsuPage((page) => Math.max(0, page - 1))
                      }
                      disabled={msuPage === 0 || msusQuery.isFetching}
                      className={buttonSecondary}
                    >
                      <ChevronLeft size={16} />
                      Назад
                    </button>

                    <span className="min-w-24 text-center text-sm text-slate-600">
                      Страница {totalMsuPages === 0 ? 0 : msuPage + 1} из{" "}
                      {totalMsuPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setMsuPage((page) =>
                          totalMsuPages === 0
                            ? 0
                            : Math.min(totalMsuPages - 1, page + 1),
                        )
                      }
                      disabled={
                        msuPage >= totalMsuPages - 1 ||
                        totalMsuPages === 0 ||
                        msusQuery.isFetching
                      }
                      className={buttonSecondary}
                    >
                      Далее
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {section === "requests" && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                <h3 className="font-semibold text-[#1D3557]">
                  Заявки администраторов МСУ и ОО
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Подтверждай только заявки пользователей своего региона.
                </p>

                {pendingQuery.isPending ? (
                  <p className="py-8 text-sm text-slate-500">
                    Загружаем заявки...
                  </p>
                ) : pendingAdmins.length === 0 ? (
                  <p className="py-10 text-sm text-slate-500">
                    Заявок на подтверждение нет.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {pendingAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">
                            {fullName(admin)}
                          </p>
                          <p className="mt-1 break-all text-sm text-slate-500">
                            {admin.email}
                          </p>
                          <p className="mt-1 text-sm font-medium text-[#457B9D]">
                            {admin.role === "MSU_ADMIN"
                              ? "Администратор МСУ"
                              : admin.role === "OO_ADMIN"
                                ? "Администратор образовательной организации"
                                : admin.role}
                          </p>
                          <div className="mt-2">
                            <StatusBadge status={admin.accountStatus} />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              approvalMutation.mutate({
                                id: admin.id,
                                action: "approve",
                              })
                            }
                            disabled={approvalMutation.isPending}
                            className={buttonPrimary}
                          >
                            Подтвердить
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(
                                `Отклонить заявку пользователя ${fullName(admin)}?`,
                              );

                              if (confirmed) {
                                approvalMutation.mutate({
                                  id: admin.id,
                                  action: "reject",
                                });
                              }
                            }}
                            disabled={approvalMutation.isPending}
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pendingQuery.data &&
                  pendingQuery.data.totalElements > pendingAdmins.length && (
                    <p className="mt-4 text-sm text-slate-500">
                      Показаны первые {pendingAdmins.length} заявок из{" "}
                      {pendingQuery.data.totalElements}. Для обработки остальных
                      понадобится добавить постраничную навигацию.
                    </p>
                  )}
              </section>
            )}

            {section === "accounts" && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                <h3 className="font-semibold text-[#1D3557]">
                  Администраторы МСУ
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Учётные записи администраторов в пределах твоего региона.
                </p>

                {accountsQuery.isPending ? (
                  <p className="py-8 text-sm text-slate-500">
                    Загружаем учётные записи...
                  </p>
                ) : allAdmins.length === 0 ? (
                  <p className="py-10 text-sm text-slate-500">
                    Администраторы МСУ пока не зарегистрированы.
                  </p>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full table-fixed text-left text-sm">
                      <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-medium">ФИО</th>
                          <th className="px-3 py-3 font-medium">Email</th>
                          <th className="px-3 py-3 font-medium">Статус</th>
                          <th className="px-3 py-3 font-medium">Блокировка</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allAdmins.map((admin) => (
                          <tr key={admin.id} className="hover:bg-slate-50">
                            <td className="px-3 py-4 font-medium text-slate-900">
                              {fullName(admin)}
                            </td>
                            <td className="px-3 py-4 text-slate-600">
                              {admin.email}
                            </td>
                            <td className="px-3 py-4">
                              <StatusBadge status={admin.accountStatus} />
                            </td>
                            <td className="px-3 py-4">
                              {admin.isBlock ? (
                                <span className="font-medium text-red-700">
                                  Заблокирован
                                </span>
                              ) : (
                                <span className="text-slate-600">Нет</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1D3557]">
            {value}
          </p>
        </div>
        <div className="rounded-xl bg-[#E8F0F5] p-3 text-[#457B9D]">{icon}</div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}
