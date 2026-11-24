"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
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
import { useDashboardShell } from "@/components/dashboard/dashboard-shell-context";
import { UserAccountCard } from "@/components/dashboard/user-account-card";
import { UserRequestCard } from "@/components/dashboard/user-request-card";
import { OrganizationHierarchyCard } from "@/components/dashboard/organization-hierarchy-card";
import type { OrganizationContext } from "@/components/dashboard/organization-hierarchy-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { AcademicYearMentorParticipations } from "@/components/dashboard/academic-year-mentor-participations";

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
  msuName: string;
};

type AcademicYear = {
  id: number;
  name: string;
  published: boolean;
  startDate: string;
  endDate: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  canEdit: boolean;
};

type AcademicYearRequest = {
  name: string;
  startDate: string;
  endDate: string;
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
  educationalOrganizationName: string | null;
  msuName: string | null;
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

  return "РџСЂРѕРёР·РѕС€Р»Р° РЅРµРїСЂРµРґРІРёРґРµРЅРЅР°СЏ РѕС€РёР±РєР°.";
}

function fullName(user: AdminUser): string {
  return [user.lastName, user.firstName, user.middleName]
    .filter(Boolean)
    .join(" ");
}

function statusLabel(status: AdminUser["accountStatus"]): string {
  switch (status) {
    case "PENDING":
      return "РћР¶РёРґР°РµС‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ";
    case "ACCEPTED":
      return "РџРѕРґС‚РІРµСЂР¶РґРµРЅР°";
    case "REJECTED":
      return "РћС‚РєР»РѕРЅРµРЅР°";
  }
}

function academicYearStatusLabel(status: AcademicYear["status"]) {
  switch (status) {
    case "PLANNED":
      return "Р—Р°РїР»Р°РЅРёСЂРѕРІР°РЅ";
    case "ACTIVE":
      return "РўРµРєСѓС‰РёР№";
    case "COMPLETED":
      return "Р—Р°РІРµСЂС€С‘РЅ";
  }
}

function formatAcademicYearDate(value: string) {
  const [year, month, day] = value.split("-");

  return `${day}.${month}.${year}`;
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

export function RegionAdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

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

  const [organizationSearch, setOrganizationSearch] = useState("");
  const [organizationPage, setOrganizationPage] = useState(0);
  const [organizationPageSize, setOrganizationPageSize] = useState(10);

  const [showAcademicYearForm, setShowAcademicYearForm] = useState(false);
  const [academicYearName, setAcademicYearName] = useState("");
  const [academicYearStartDate, setAcademicYearStartDate] = useState("");
  const [academicYearEndDate, setAcademicYearEndDate] = useState("");

  const [editingAcademicYearId, setEditingAcademicYearId] = useState<
    number | null
  >(null);
  const [academicYearActionsId, setAcademicYearActionsId] = useState<
    number | null
  >(null);
  const [editingAcademicYearName, setEditingAcademicYearName] = useState("");
  const [editingAcademicYearStartDate, setEditingAcademicYearStartDate] =
    useState("");
  const [editingAcademicYearEndDate, setEditingAcademicYearEndDate] =
    useState("");

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
      toast.error("РљРѕРґ РњРЎРЈ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РїРѕР»РѕР¶РёС‚РµР»СЊРЅС‹Рј С†РµР»С‹Рј С‡РёСЃР»РѕРј.");
      return;
    }

    if (!name) {
      toast.error("РќР°Р·РІР°РЅРёРµ РњРЎРЈ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј.");
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
      `РЈРґР°Р»РёС‚СЊ РњРЎРЈ В«${msu.name}В»? РЈРґР°Р»РµРЅРёРµ РЅРµРІРѕР·РјРѕР¶РЅРѕ, РµСЃР»Рё Рє РЅРµРјСѓ РїСЂРёРІСЏР·Р°РЅС‹ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹Рµ РѕСЂРіР°РЅРёР·Р°С†РёРё РёР»Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂС‹ РњРЎРЈ.`,
    );

    if (confirmed) {
      deleteMsuMutation.mutate(msu.id);
    }
  }

  const isRegionAdmin = user?.role === "REGION_ADMIN";

  const organizationContextQuery = useQuery({
    queryKey: ["organization-context", user?.id],
    queryFn: () =>
      apiFetch<OrganizationContext>("/api/organization-context/current"),
    enabled: isInitialized && isRegionAdmin,
  });

  const academicYearsQuery = useQuery({
    queryKey: ["region-admin", "academic-years"],
    queryFn: () => apiFetch<AcademicYear[]>("/api/admin/academic-years"),
    enabled: isInitialized && isRegionAdmin,
  });

  // РЎРїРёСЃРѕРє РњРЎРЈ С‚РѕР»СЊРєРѕ С‚РµРєСѓС‰РµРіРѕ СЂРµРіРёРѕРЅР°.
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

  // Р’СЃРµ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹Рµ РѕСЂРіР°РЅРёР·Р°С†РёРё С‚РµРєСѓС‰РµРіРѕ СЂРµРіРёРѕРЅР°.
  const organizationsQuery = useQuery({
    queryKey: [
      "region-admin",
      "educational-organizations",
      organizationSearch,
      organizationPage,
      organizationPageSize,
    ],
    queryFn: () =>
      apiFetch<SpringPage<EducationalOrganization>>(
        "/api/admin/educational-organizations",
        {
          params: {
            search: organizationSearch,
            page: organizationPage,
            size: organizationPageSize,
          },
        },
      ),
    enabled: isInitialized && isRegionAdmin,
  });

  // Р—Р°СЏРІРєРё, РѕР¶РёРґР°СЋС‰РёРµ СЂРµС€РµРЅРёСЏ СЂРµРіРёРѕРЅР°Р»СЊРЅРѕРіРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°.
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

  // Р—Р°СЏРІРєРё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РћРћ, РѕР¶РёРґР°СЋС‰РёРµ СЂРµС€РµРЅРёСЏ СЂРµРіРёРѕРЅР°Р»СЊРЅРѕРіРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°.
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

  // РЎРїРёСЃРѕРє Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РњРЎРЈ С‚РµРєСѓС‰РµРіРѕ СЂРµРіРёРѕРЅР°.
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

  const ooAccountsQuery = useQuery({
    queryKey: ["region-admin", "oo-admins"],
    queryFn: () =>
      apiFetch<SpringPage<AdminUser>>("/api/admin/users", {
        params: {
          role: "OO_ADMIN",
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
      queryClient.invalidateQueries({
        queryKey: ["region-admin", "oo-admins"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["region-admin", "educational-organizations"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["region-admin", "academic-years"],
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
      toast.success("РњРЎРЈ СЃРѕР·РґР°РЅРѕ.");
      setMsuName("");
      setMsuCode("");
      setShowCreateForm(false);
      await refreshDashboard();
    },
    onError: (error) => {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РњРЎРЈ", {
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
      toast.success("Р”Р°РЅРЅС‹Рµ РњРЎРЈ РѕР±РЅРѕРІР»РµРЅС‹.");
      setEditingMsuId(null);
      setEditingMsuCode("");
      setEditingMsuName("");
      await refreshDashboard();
    },
    onError: (error) => {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ РњРЎРЈ", {
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
      toast.success("РњРЎРЈ СѓРґР°Р»РµРЅРѕ.");
      setEditingMsuId(null);
      await refreshDashboard();
    },
    onError: (error) => {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ РњРЎРЈ", {
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
          ? "РЈС‡С‘С‚РЅР°СЏ Р·Р°РїРёСЃСЊ РїРѕРґС‚РІРµСЂР¶РґРµРЅР°."
          : "Р—Р°СЏРІРєР° РѕС‚РєР»РѕРЅРµРЅР°.",
      );
      await refreshDashboard();
    },
    onError: (error) => {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±СЂР°Р±РѕС‚Р°С‚СЊ Р·Р°СЏРІРєСѓ", {
        description: getErrorMessage(error),
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "block" | "unblock" }) =>
      apiFetch<AdminUser>(`/api/admin/users/${id}/${action}`, {
        method: "PATCH",
      }),

    onSuccess: async (_, variables) => {
      toast.success(
        variables.action === "block"
          ? "РЈС‡С‘С‚РЅР°СЏ Р·Р°РїРёСЃСЊ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅР°."
          : "РЈС‡С‘С‚РЅР°СЏ Р·Р°РїРёСЃСЊ СЂР°Р·Р±Р»РѕРєРёСЂРѕРІР°РЅР°.",
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["region-admin", "msu-admins"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["region-admin", "oo-admins"],
        }),
      ]);
    },

    onError: (error) => {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ Р±Р»РѕРєРёСЂРѕРІРєСѓ", {
        description: getErrorMessage(error),
      });
    },
  });

  const createAcademicYearMutation = useMutation({
    mutationFn: (request: AcademicYearRequest) =>
      apiFetch<AcademicYear>("/api/admin/academic-years", {
        method: "POST",
        body: JSON.stringify(request),
      }),

    onSuccess: async () => {
      toast.success("РЈС‡РµР±РЅС‹Р№ РіРѕРґ СЃРѕР·РґР°РЅ.");

      setAcademicYearName("");
      setAcademicYearStartDate("");
      setAcademicYearEndDate("");
      setShowAcademicYearForm(false);

      await queryClient.invalidateQueries({
        queryKey: ["region-admin", "academic-years"],
      });
    },

    onError: (error) => {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ СѓС‡РµР±РЅС‹Р№ РіРѕРґ", {
        description: getErrorMessage(error),
      });
    },
  });

  const updateAcademicYearMutation = useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: number;
      request: AcademicYearRequest;
    }) =>
      apiFetch<AcademicYear>(`/api/admin/academic-years/${id}`, {
        method: "PUT",
        body: JSON.stringify(request),
      }),

    onSuccess: async () => {
      toast.success("РЈС‡РµР±РЅС‹Р№ РіРѕРґ РѕР±РЅРѕРІР»С‘РЅ.");
      setEditingAcademicYearId(null);

      await queryClient.invalidateQueries({
        queryKey: ["region-admin", "academic-years"],
      });
    },

    onError: (error) => {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ СѓС‡РµР±РЅС‹Р№ РіРѕРґ", {
        description: getErrorMessage(error),
      });
    },
  });

  const publishAcademicYearMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<AcademicYear>(`/api/admin/academic-years/${id}/publish`, {
        method: "PUT",
      }),

    onSuccess: async () => {
      toast.success("РЈС‡РµР±РЅС‹Р№ РіРѕРґ РѕРїСѓР±Р»РёРєРѕРІР°РЅ.");

      await queryClient.invalidateQueries({
        queryKey: ["region-admin", "academic-years"],
      });
    },

    onError: (error) => {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСѓР±Р»РёРєРѕРІР°С‚СЊ СѓС‡РµР±РЅС‹Р№ РіРѕРґ", {
        description: getErrorMessage(error),
      });
    },
  });

  const deleteAcademicYearMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/admin/academic-years/${id}`, {
        method: "DELETE",
      }),

    onSuccess: async () => {
      toast.success("РЈС‡РµР±РЅС‹Р№ РіРѕРґ СѓРґР°Р»С‘РЅ.");

      await queryClient.invalidateQueries({
        queryKey: ["region-admin", "academic-years"],
      });
    },

    onError: (error) => {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ СѓС‡РµР±РЅС‹Р№ РіРѕРґ", {
        description: getErrorMessage(error),
      });
    },
  });

  function confirmDeleteAcademicYear(year: AcademicYear) {
    const confirmed = window.confirm(
      `РЈРґР°Р»РёС‚СЊ СѓС‡РµР±РЅС‹Р№ РіРѕРґ В«${year.name}В»? Р•СЃР»Рё Рє РЅРµРјСѓ РїСЂРёРІСЏР·Р°РЅС‹ РЅР°СЃС‚Р°РІРЅРёС‡РµСЃРєРёРµ РїР°СЂС‹ РёР»Рё РїРѕРґС‚РІРµСЂР¶РґС‘РЅРЅРѕРµ СѓС‡Р°СЃС‚РёРµ РЅР°СЃС‚Р°РІРЅРёРєРѕРІ, СѓРґР°Р»РёС‚СЊ РµРіРѕ РЅРµР»СЊР·СЏ.`,
    );

    if (confirmed) {
      deleteAcademicYearMutation.mutate(year.id);
    }
  }

  function handleCreateAcademicYear(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = academicYearName.trim();

    if (!name) {
      toast.error("РЈРєР°Р¶Рё РЅР°Р·РІР°РЅРёРµ СѓС‡РµР±РЅРѕРіРѕ РіРѕРґР°.");
      return;
    }

    if (academicYearStartDate >= academicYearEndDate) {
      toast.error("Р”Р°С‚Р° РЅР°С‡Р°Р»Р° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ СЂР°РЅСЊС€Рµ РґР°С‚С‹ РѕРєРѕРЅС‡Р°РЅРёСЏ.");
      return;
    }

    createAcademicYearMutation.mutate({
      name,
      startDate: academicYearStartDate,
      endDate: academicYearEndDate,
    });
  }

  function startEditingAcademicYear(year: AcademicYear) {
    setEditingAcademicYearId(year.id);
    setEditingAcademicYearName(year.name);
    setEditingAcademicYearStartDate(year.startDate);
    setEditingAcademicYearEndDate(year.endDate);
  }

  async function handleCreateMsu(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = Number(msuCode);
    const name = msuName.trim();

    if (!Number.isInteger(code) || code <= 0) {
      toast.error("РљРѕРґ РњРЎРЈ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РїРѕР»РѕР¶РёС‚РµР»СЊРЅС‹Рј С†РµР»С‹Рј С‡РёСЃР»РѕРј.");
      return;
    }

    if (!name) {
      toast.error("РЈРєР°Р¶Рё РЅР°Р·РІР°РЅРёРµ РњРЎРЈ.");
      return;
    }

    createMsuMutation.mutate({ code, name });
  }
  if (!isInitialized || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-slate-600">РџСЂРѕРІРµСЂСЏРµРј Р°РІС‚РѕСЂРёР·Р°С†РёСЋ...</p>
      </main>
    );
  }

  if (user.role !== "REGION_ADMIN") {
    return null;
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
    organizationsQuery.isFetching ||
    pendingQuery.isFetching ||
    pendingOoAdminsQuery.isFetching ||
    accountsQuery.isFetching ||
    academicYearsQuery.isFetching ||
    ooAccountsQuery.isFetching;

  const organizations = organizationsQuery.data?.content ?? [];
  const totalOrganizations = organizationsQuery.data?.totalElements ?? 0;
  const allOoAdmins = ooAccountsQuery.data?.content ?? [];

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        <DashboardPageHeader
          title="РљР°Р±РёРЅРµС‚ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° СЂРµРіРёРѕРЅР°"
          description="РЈРїСЂР°РІР»РµРЅРёРµ РјСѓРЅРёС†РёРїР°Р»СЊРЅС‹РјРё СѓРїСЂР°РІР»РµРЅРёСЏРјРё, РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹РјРё РѕСЂРіР°РЅРёР·Р°С†РёСЏРјРё Рё СѓС‡С‘С‚РЅС‹РјРё Р·Р°РїРёСЃСЏРјРё."
          action={
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
              РћР±РЅРѕРІРёС‚СЊ
            </button>
          }
        />

        {(msusQuery.isError ||
          organizationsQuery.isError ||
          pendingQuery.isError ||
          pendingOoAdminsQuery.isError ||
          accountsQuery.isError ||
          ooAccountsQuery.isError) && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>
              РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ С‡Р°СЃС‚СЊ РґР°РЅРЅС‹С…. РџСЂРѕРІРµСЂСЊ backend Рё РїСЂР°РІР°
              РґРѕСЃС‚СѓРїР°, Р·Р°С‚РµРј РїРѕРІС‚РѕСЂРё Р·Р°РїСЂРѕСЃ.
            </p>
            <button
              type="button"
              onClick={() => {
                void msusQuery.refetch();
                void pendingQuery.refetch();
                void accountsQuery.refetch();
                void pendingOoAdminsQuery.refetch();
                void ooAccountsQuery.refetch();
                void organizationsQuery.refetch();
              }}
              className="font-semibold underline"
            >
              РџРѕРІС‚РѕСЂРёС‚СЊ
            </button>
          </div>
        )}

        {section === "academic-years" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#1D3557]">
                  РЈРїСЂР°РІР»РµРЅРёРµ СѓС‡РµР±РЅС‹РјРё РіРѕРґР°РјРё
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  РЎРѕР·РґР°РЅРёРµ, РїСЂРѕСЃРјРѕС‚СЂ Рё СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ Р·Р°РїР»Р°РЅРёСЂРѕРІР°РЅРЅС‹С… СѓС‡РµР±РЅС‹С…
                  РіРѕРґРѕРІ.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAcademicYearForm((value) => !value)}
                className={buttonPrimary}
              >
                {!showAcademicYearForm && <Plus size={17} />}
                {showAcademicYearForm ? "РћС‚РјРµРЅР°" : "РЎРѕР·РґР°С‚СЊ СѓС‡РµР±РЅС‹Р№ РіРѕРґ"}
              </button>
            </div>

            {showAcademicYearForm && (
              <form
                onSubmit={handleCreateAcademicYear}
                className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3"
              >
                <label className="text-sm font-medium text-slate-700 sm:col-span-3">
                  РќР°Р·РІР°РЅРёРµ СѓС‡РµР±РЅРѕРіРѕ РіРѕРґР°
                  <input
                    className={inputClass}
                    type="text"
                    maxLength={20}
                    required
                    value={academicYearName}
                    onChange={(event) =>
                      setAcademicYearName(event.target.value)
                    }
                    placeholder="РќР°РїСЂРёРјРµСЂ, 2026вЂ“2027"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Р”Р°С‚Р° РЅР°С‡Р°Р»Р°
                  <input
                    className={inputClass}
                    type="date"
                    required
                    value={academicYearStartDate}
                    onChange={(event) =>
                      setAcademicYearStartDate(event.target.value)
                    }
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Р”Р°С‚Р° РѕРєРѕРЅС‡Р°РЅРёСЏ
                  <input
                    className={inputClass}
                    type="date"
                    required
                    min={academicYearStartDate || undefined}
                    value={academicYearEndDate}
                    onChange={(event) =>
                      setAcademicYearEndDate(event.target.value)
                    }
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={createAcademicYearMutation.isPending}
                    className={`${buttonPrimary} w-full`}
                  >
                    {createAcademicYearMutation.isPending
                      ? "РЎРѕР·РґР°РЅРёРµ..."
                      : "РЎРѕР·РґР°С‚СЊ"}
                  </button>
                </div>

                <p className="text-xs text-slate-500 sm:col-span-3">
                  РњРѕР¶РЅРѕ СЃРѕР·РґР°С‚СЊ СѓС‡РµР±РЅС‹Р№ РіРѕРґ Р·Р°РґРЅРёРј С‡РёСЃР»РѕРј. РћРЅ СЃСЂР°Р·Сѓ РїРѕР»СѓС‡РёС‚
                  СЃС‚Р°С‚СѓСЃ В«РўРµРєСѓС‰РёР№В», РµСЃР»Рё СЃРµРіРѕРґРЅСЏС€РЅСЏСЏ РґР°С‚Р° РІС…РѕРґРёС‚ РІ СѓРєР°Р·Р°РЅРЅС‹Р№
                  РїРµСЂРёРѕРґ. РџРµСЂРµСЃРµС‡РµРЅРёРµ СЃ РґСЂСѓРіРёРјРё СѓС‡РµР±РЅС‹РјРё РіРѕРґР°РјРё Р·Р°РїСЂРµС‰РµРЅРѕ.
                </p>
              </form>
            )}

            {academicYearsQuery.isPending ? (
              <p className="py-10 text-sm text-slate-500">
                Р—Р°РіСЂСѓР¶Р°РµРј СѓС‡РµР±РЅС‹Рµ РіРѕРґС‹...
              </p>
            ) : academicYearsQuery.isError ? (
              <div className="py-8">
                <p role="alert" className="text-sm text-red-700">
                  РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СѓС‡РµР±РЅС‹Рµ РіРѕРґС‹.
                </p>

                <button
                  type="button"
                  onClick={() => void academicYearsQuery.refetch()}
                  className={`${buttonSecondary} mt-3`}
                >
                  РџРѕРІС‚РѕСЂРёС‚СЊ
                </button>
              </div>
            ) : !academicYearsQuery.data?.length ? (
              <p className="py-10 text-sm text-slate-500">
                РЈС‡РµР±РЅС‹Рµ РіРѕРґС‹ РµС‰С‘ РЅРµ СЃРѕР·РґР°РЅС‹.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {academicYearsQuery.data.map((year) => {
                  const isEditing = editingAcademicYearId === year.id;
                  const canEdit = year.canEdit;
                  const canDelete = year.canEdit;

                  const statusStyles = {
                    PLANNED: "bg-blue-50 text-blue-700",
                    ACTIVE: "bg-emerald-50 text-emerald-700",
                    COMPLETED: "bg-slate-100 text-slate-600",
                  };

                  return (
                    <article
                      key={year.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      {isEditing ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();

                            const name = editingAcademicYearName.trim();

                            if (!name) {
                              toast.error("РЈРєР°Р¶Рё РЅР°Р·РІР°РЅРёРµ СѓС‡РµР±РЅРѕРіРѕ РіРѕРґР°.");
                              return;
                            }

                            if (
                              editingAcademicYearStartDate >=
                              editingAcademicYearEndDate
                            ) {
                              toast.error(
                                "Р”Р°С‚Р° РЅР°С‡Р°Р»Р° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ СЂР°РЅСЊС€Рµ РґР°С‚С‹ РѕРєРѕРЅС‡Р°РЅРёСЏ.",
                              );
                              return;
                            }

                            updateAcademicYearMutation.mutate({
                              id: year.id,
                              request: {
                                name,
                                startDate: editingAcademicYearStartDate,
                                endDate: editingAcademicYearEndDate,
                              },
                            });
                          }}
                          className="grid gap-4 sm:grid-cols-3"
                        >
                          <label className="text-sm font-medium text-slate-700 sm:col-span-3">
                            РќР°Р·РІР°РЅРёРµ
                            <input
                              className={inputClass}
                              type="text"
                              maxLength={20}
                              required
                              value={editingAcademicYearName}
                              onChange={(event) =>
                                setEditingAcademicYearName(event.target.value)
                              }
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-700">
                            Р”Р°С‚Р° РЅР°С‡Р°Р»Р°
                            <input
                              className={inputClass}
                              type="date"
                              required
                              value={editingAcademicYearStartDate}
                              onChange={(event) =>
                                setEditingAcademicYearStartDate(
                                  event.target.value,
                                )
                              }
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-700">
                            Р”Р°С‚Р° РѕРєРѕРЅС‡Р°РЅРёСЏ
                            <input
                              className={inputClass}
                              type="date"
                              required
                              min={editingAcademicYearStartDate || undefined}
                              value={editingAcademicYearEndDate}
                              onChange={(event) =>
                                setEditingAcademicYearEndDate(
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <div className="flex flex-wrap items-end gap-2 sm:col-span-3">
                            <button
                              type="submit"
                              disabled={updateAcademicYearMutation.isPending}
                              className={`${buttonPrimary} flex-1`}
                            >
                              {updateAcademicYearMutation.isPending
                                ? "РЎРѕС…СЂР°РЅРµРЅРёРµ..."
                                : "РЎРѕС…СЂР°РЅРёС‚СЊ"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingAcademicYearId(null)}
                              className={buttonSecondary}
                            >
                              РћС‚РјРµРЅР°
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="font-semibold text-[#1D3557]">
                                {year.name}
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[year.status]}`}
                              >
                                {academicYearStatusLabel(year.status)}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  year.published
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {year.published ? "РћРїСѓР±Р»РёРєРѕРІР°РЅ" : "Р§РµСЂРЅРѕРІРёРє"}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-slate-600">
                              {formatAcademicYearDate(year.startDate)}
                              {" вЂ” "}
                              {formatAcademicYearDate(year.endDate)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {canEdit && (
                              <>
                                {academicYearActionsId !== year.id ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAcademicYearActionsId(year.id)
                                    }
                                    className={buttonSecondary}
                                  >
                                    <Pencil size={15} />
                                    Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        startEditingAcademicYear(year);
                                        setAcademicYearActionsId(null);
                                      }}
                                      className={buttonSecondary}
                                    >
                                      <Pencil size={15} />
                                      РР·РјРµРЅРёС‚СЊ
                                    </button>

                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          confirmDeleteAcademicYear(year)
                                        }
                                        disabled={
                                          deleteAcademicYearMutation.isPending
                                        }
                                        className={`${buttonSecondary} text-red-600 hover:border-red-300 hover:bg-red-50`}
                                      >
                                        <Trash2 size={15} />
                                        РЈРґР°Р»РёС‚СЊ
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAcademicYearActionsId(null)
                                      }
                                      className={buttonSecondary}
                                    >
                                      РћС‚РјРµРЅР°
                                    </button>
                                  </>
                                )}
                              </>
                            )}

                            {!year.published && (
                              <button
                                type="button"
                                onClick={() =>
                                  publishAcademicYearMutation.mutate(year.id)
                                }
                                disabled={publishAcademicYearMutation.isPending}
                                className={buttonPrimary}
                              >
                                {publishAcademicYearMutation.isPending
                                  ? "РџСѓР±Р»РёРєР°С†РёСЏ..."
                                  : "РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {year.published && (
                        <div className="mt-4">
                          <AcademicYearMentorParticipations
                            academicYearId={year.id}
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {section === "overview" && (
          <>
            <OrganizationHierarchyCard
              context={organizationContextQuery.data}
              isLoading={organizationContextQuery.isPending}
              isError={organizationContextQuery.isError}
            />
            <section>
              <h3 className="text-lg font-semibold text-[#1D3557]">
                Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ РІ РєР°Р±РёРЅРµС‚
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Р—РґРµСЃСЊ С‚С‹ СѓРїСЂР°РІР»СЏРµС€СЊ РњРЎРЈ СЃРІРѕРµРіРѕ СЂРµРіРёРѕРЅР° Рё РїРѕРґС‚РІРµСЂР¶РґР°РµС€СЊ
                СЂРµРіРёСЃС‚СЂР°С†РёРё РёС… Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ.
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title="РњРЎРЈ РІ СЂРµРіРёРѕРЅРµ"
                value={msusQuery.isPending ? "вЂ”" : totalMsus}
                description="РЎРѕР·РґР°РЅРЅС‹Рµ РјСѓРЅРёС†РёРїР°Р»СЊРЅС‹Рµ СѓРїСЂР°РІР»РµРЅРёСЏ"
                icon={<Building2 size={21} />}
              />

              <StatCard
                title="РћРћ РІ СЂРµРіРёРѕРЅРµ"
                value={organizationsQuery.isPending ? "вЂ”" : totalOrganizations}
                description="Р’СЃРµ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹Рµ РѕСЂРіР°РЅРёР·Р°С†РёРё СЂРµРіРёРѕРЅР°"
                icon={<Building2 size={21} />}
              />

              <StatCard
                title="РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂС‹ РњРЎРЈ"
                value={
                  accountsQuery.isPending
                    ? "вЂ”"
                    : (accountsQuery.data?.totalElements ?? 0)
                }
                description="РЈС‡С‘С‚РЅС‹Рµ Р·Р°РїРёСЃРё РІ С‚РІРѕС‘Рј СЂРµРіРёРѕРЅРµ"
                icon={<Users size={21} />}
              />

              <StatCard
                title="РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂС‹ РћРћ"
                value={
                  ooAccountsQuery.isPending
                    ? "вЂ”"
                    : (ooAccountsQuery.data?.totalElements ?? 0)
                }
                description="РЈС‡С‘С‚РЅС‹Рµ Р·Р°РїРёСЃРё РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹С… РѕСЂРіР°РЅРёР·Р°С†РёР№ СЂРµРіРёРѕРЅР°"
                icon={<Users size={21} />}
              />

              <StatCard
                title="РћР¶РёРґР°СЋС‚ СЂРµС€РµРЅРёСЏ"
                value={
                  pendingQuery.isPending || pendingOoAdminsQuery.isPending
                    ? "вЂ”"
                    : totalPendingAdmins
                }
                description="Р—Р°СЏРІРєРё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РњРЎРЈ Рё РћРћ"
                icon={<ClipboardCheck size={21} />}
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#1D3557]">
                    РўСЂРµР±СѓСЋС‚ РІРЅРёРјР°РЅРёСЏ
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Р—Р°СЏРІРєРё, РєРѕС‚РѕСЂС‹Рµ РµС‰С‘ РЅРµ РѕР±СЂР°Р±РѕС‚Р°РЅС‹
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSection("requests")}
                  className="text-sm font-semibold text-[#457B9D] hover:underline"
                >
                  Р’СЃРµ Р·Р°СЏРІРєРё
                </button>
              </div>

              {pendingQuery.isPending ? (
                <p className="py-8 text-sm text-slate-500">
                  Р—Р°РіСЂСѓР¶Р°РµРј Р·Р°СЏРІРєРё...
                </p>
              ) : pendingAdmins.length === 0 ? (
                <p className="py-8 text-sm text-slate-500">
                  РќРµС‚ Р·Р°СЏРІРѕРє, РѕР¶РёРґР°СЋС‰РёС… РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ.
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
                  РњСѓРЅРёС†РёРїР°Р»СЊРЅС‹Рµ СѓРїСЂР°РІР»РµРЅРёСЏ
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Р’СЃРµ РњРЎРЈ, РѕС‚РЅРѕСЃСЏС‰РёРµСЃСЏ Рє С‚РІРѕРµРјСѓ СЂРµРіРёРѕРЅСѓ
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateForm((value) => !value)}
                className={buttonPrimary}
              >
                <Plus size={17} />
                {showCreateForm ? "РћС‚РјРµРЅР°" : "РЎРѕР·РґР°С‚СЊ РњРЎРЈ"}
              </button>
            </div>

            {showCreateForm && (
              <form
                onSubmit={handleCreateMsu}
                className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
              >
                <label className="text-sm font-medium text-slate-700">
                  РљРѕРґ РњРЎРЈ
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={msuCode}
                    onChange={(event) => setMsuCode(event.target.value)}
                    placeholder="РќР°РїСЂРёРјРµСЂ, 101"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  РќР°Р·РІР°РЅРёРµ РњРЎРЈ
                  <input
                    className={inputClass}
                    type="text"
                    maxLength={500}
                    required
                    value={msuName}
                    onChange={(event) => setMsuName(event.target.value)}
                    placeholder="Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ"
                  />
                </label>

                <div className="sm:col-span-2">
                  <p className="mb-3 text-xs text-slate-500">
                    Р РµРіРёРѕРЅ Р±СѓРґРµС‚ РЅР°Р·РЅР°С‡РµРЅ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РїРѕ СѓС‡С‘С‚РЅРѕР№ Р·Р°РїРёСЃРё
                    Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°.
                  </p>
                  <button
                    type="submit"
                    disabled={createMsuMutation.isPending}
                    className={buttonPrimary}
                  >
                    {createMsuMutation.isPending
                      ? "РЎРѕР·РґР°С‘Рј..."
                      : "РЎРѕС…СЂР°РЅРёС‚СЊ РњРЎРЈ"}
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
                  placeholder="РџРѕРёСЃРє РїРѕ РєРѕРґСѓ РёР»Рё РЅР°Р·РІР°РЅРёСЋ РњРЎРЈ"
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
                    ? "Р—Р°РІРµСЂС€РёС‚СЊ СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ"
                    : "Р РµР¶РёРј СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ"}
                </button>
              </div>
            </div>

            {msusQuery.isPending ? (
              <p className="py-8 text-sm text-slate-500">
                Р—Р°РіСЂСѓР¶Р°РµРј СЃРїРёСЃРѕРє РњРЎРЈ...
              </p>
            ) : msusQuery.isError ? (
              <p role="alert" className="py-8 text-sm text-red-700">
                РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЃРїРёСЃРѕРє РњРЎРЈ.
              </p>
            ) : msus.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 size={32} className="mx-auto text-slate-300" />
                <p className="mt-3 font-medium text-slate-800">
                  {msuSearch
                    ? "РњРЎРЈ РїРѕ РІР°С€РµРјСѓ Р·Р°РїСЂРѕСЃСѓ РЅРµ РЅР°Р№РґРµРЅС‹"
                    : "РњРЎРЈ РµС‰С‘ РЅРµ СЃРѕР·РґР°РЅС‹"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {msuSearch
                    ? "РР·РјРµРЅРёС‚Рµ РїРѕРёСЃРєРѕРІС‹Р№ Р·Р°РїСЂРѕСЃ."
                    : "РЎРѕР·РґР°Р№С‚Рµ РїРµСЂРІРѕРµ РњРЎРЈ, С‡С‚РѕР±С‹ РїСЂРѕРґРѕР»Р¶РёС‚СЊ СЂР°Р±РѕС‚Сѓ."}
                </p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {msus.map((msu) => (
                  <article
                    key={msu.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#457B9D]/50 hover:shadow-md"
                  >
                    {editingMsuId === msu.id ? (
                      <form
                        onSubmit={saveEditingMsu}
                        className="flex flex-col gap-4"
                      >
                        <div>
                          <h4 className="font-semibold text-[#1D3557]">
                            Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РњРЎРЈ
                          </h4>
                          <p className="mt-1 text-xs text-slate-500">
                            РР·РјРµРЅРё РєРѕРґ РёР»Рё РЅР°Р·РІР°РЅРёРµ РјСѓРЅРёС†РёРїР°Р»СЊРЅРѕРіРѕ СѓРїСЂР°РІР»РµРЅРёСЏ
                          </p>
                        </div>

                        <label className="text-sm font-medium text-slate-600">
                          РљРѕРґ РњРЎРЈ
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

                        <label className="text-sm font-medium text-slate-600">
                          РќР°Р·РІР°РЅРёРµ РњРЎРЈ
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

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            disabled={updateMsuMutation.isPending}
                            className={buttonPrimary}
                          >
                            {updateMsuMutation.isPending
                              ? "РЎРѕС…СЂР°РЅСЏРµРј..."
                              : "РЎРѕС…СЂР°РЅРёС‚СЊ"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditingMsu}
                            disabled={updateMsuMutation.isPending}
                            className={buttonSecondary}
                          >
                            РћС‚РјРµРЅР°
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#457B9D]/10 text-[#457B9D]">
                              <Building2 size={22} />
                            </div>

                            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                              РљРѕРґ: {msu.code}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/dashboard/msus/${msu.id}`)
                            }
                            className="mt-4 text-left text-base font-semibold text-[#1D3557] transition hover:text-[#457B9D] hover:underline"
                          >
                            {msu.name}
                          </button>

                          <p className="mt-1 text-sm text-slate-500">
                            РњСѓРЅРёС†РёРїР°Р»СЊРЅРѕРµ СѓРїСЂР°РІР»РµРЅРёРµ
                          </p>
                        </div>

                        {msuEditMode && (
                          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                            <button
                              type="button"
                              onClick={() => startEditingMsu(msu)}
                              className={buttonSecondary}
                              aria-label={`Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ ${msu.name}`}
                            >
                              <Pencil size={15} />
                              Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ
                            </button>

                            <button
                              type="button"
                              onClick={() => confirmDeleteMsu(msu)}
                              disabled={deleteMsuMutation.isPending}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`РЈРґР°Р»РёС‚СЊ ${msu.name}`}
                            >
                              <Trash2 size={15} />
                              РЈРґР°Р»РёС‚СЊ
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <label htmlFor="msu-page-size">Р—Р°РїРёСЃРµР№ РЅР° СЃС‚СЂР°РЅРёС†Рµ:</label>
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

                <span>Р’СЃРµРіРѕ: {totalMsus}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMsuPage((page) => Math.max(0, page - 1))}
                  disabled={msuPage === 0 || msusQuery.isFetching}
                  className={buttonSecondary}
                >
                  <ChevronLeft size={16} />
                  РќР°Р·Р°Рґ
                </button>

                <span className="min-w-24 text-center text-sm text-slate-600">
                  РЎС‚СЂР°РЅРёС†Р° {totalMsuPages === 0 ? 0 : msuPage + 1} РёР·{" "}
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
                  Р”Р°Р»РµРµ
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {section === "region-organizations" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div>
              <h3 className="font-semibold text-[#1D3557]">
                РћР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹Рµ РѕСЂРіР°РЅРёР·Р°С†РёРё СЂРµРіРёРѕРЅР°
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Р’СЃРµ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹Рµ РѕСЂРіР°РЅРёР·Р°С†РёРё, РѕС‚РЅРѕСЃСЏС‰РёРµСЃСЏ Рє РњРЎРЈ С‚РІРѕРµРіРѕ
                СЂРµРіРёРѕРЅР°
              </p>
            </div>

            <div className="mt-6">
              <label className="relative block w-full sm:max-w-md">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={organizationSearch}
                  onChange={(event) => {
                    setOrganizationSearch(event.target.value);
                    setOrganizationPage(0);
                  }}
                  placeholder="РџРѕРёСЃРє РїРѕ РєРѕРґСѓ РёР»Рё РЅР°Р·РІР°РЅРёСЋ РћРћ"
                  className={`${inputClass} mt-0 pl-9`}
                />
              </label>
            </div>

            {organizationsQuery.isPending ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Р—Р°РіСЂСѓР¶Р°РµРј РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹Рµ РѕСЂРіР°РЅРёР·Р°С†РёРё...
              </p>
            ) : organizationsQuery.isError ? (
              <p
                role="alert"
                className="py-10 text-center text-sm text-red-700"
              >
                РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹Рµ РѕСЂРіР°РЅРёР·Р°С†РёРё.
              </p>
            ) : organizations.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 size={32} className="mx-auto text-slate-300" />
                <p className="mt-3 font-medium text-slate-800">
                  {organizationSearch
                    ? "РћРћ РїРѕ РІР°С€РµРјСѓ Р·Р°РїСЂРѕСЃСѓ РЅРµ РЅР°Р№РґРµРЅС‹"
                    : "Р’ СЂРµРіРёРѕРЅРµ РїРѕРєР° РЅРµС‚ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹С… РѕСЂРіР°РЅРёР·Р°С†РёР№"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {organizationSearch
                    ? "РР·РјРµРЅРёС‚Рµ РїРѕРёСЃРєРѕРІС‹Р№ Р·Р°РїСЂРѕСЃ."
                    : "РЎРѕР·РґР°Р№С‚Рµ РћРћ РІ РѕРґРЅРѕРј РёР· РњРЎРЈ СЂРµРіРёРѕРЅР°."}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {organizations.map((organization) => (
                    <article
                      key={organization.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#457B9D]/50 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#457B9D]/10 text-[#457B9D]">
                          <Building2 size={22} />
                        </div>

                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                          РљРѕРґ: {organization.code}
                        </span>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-semibold leading-6 text-[#1D3557]">
                          {organization.name}
                        </h4>

                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            РњСѓРЅРёС†РёРїР°Р»СЊРЅРѕРµ СѓРїСЂР°РІР»РµРЅРёРµ
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {organization.msuName}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <label htmlFor="organization-page-size">
                      Р—Р°РїРёСЃРµР№ РЅР° СЃС‚СЂР°РЅРёС†Рµ:
                    </label>
                    <select
                      id="organization-page-size"
                      value={organizationPageSize}
                      onChange={(event) => {
                        setOrganizationPageSize(Number(event.target.value));
                        setOrganizationPage(0);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-2"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>

                    <span>Р’СЃРµРіРѕ: {totalOrganizations}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOrganizationPage((page) => Math.max(0, page - 1))
                      }
                      disabled={
                        organizationPage === 0 || organizationsQuery.isFetching
                      }
                      className={buttonSecondary}
                    >
                      <ChevronLeft size={16} />
                      РќР°Р·Р°Рґ
                    </button>

                    <span className="min-w-24 text-center text-sm text-slate-600">
                      РЎС‚СЂР°РЅРёС†Р°{" "}
                      {organizationsQuery.data.totalPages === 0
                        ? 0
                        : organizationPage + 1}{" "}
                      РёР· {organizationsQuery.data.totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setOrganizationPage((page) =>
                          Math.min(
                            organizationsQuery.data.totalPages - 1,
                            page + 1,
                          ),
                        )
                      }
                      disabled={
                        organizationPage >=
                          organizationsQuery.data.totalPages - 1 ||
                        organizationsQuery.data.totalPages === 0 ||
                        organizationsQuery.isFetching
                      }
                      className={buttonSecondary}
                    >
                      Р”Р°Р»РµРµ
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {section === "requests" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div>
              <h3 className="font-semibold text-[#1D3557]">
                Р—Р°СЏРІРєРё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РњРЎРЈ Рё РћРћ
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                РџСЂРѕРІРµСЂСЏР№ РґР°РЅРЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ Рё РїРѕРґС‚РІРµСЂР¶РґР°Р№ СЂРµРіРёСЃС‚СЂР°С†РёРё РІ
                РїСЂРµРґРµР»Р°С… СЃРІРѕРµРіРѕ СЂРµРіРёРѕРЅР°.
              </p>
            </div>

            {pendingQuery.isPending || pendingOoAdminsQuery.isPending ? (
              <p className="py-8 text-sm text-slate-500">Р—Р°РіСЂСѓР¶Р°РµРј Р·Р°СЏРІРєРё...</p>
            ) : pendingQuery.isError || pendingOoAdminsQuery.isError ? (
              <div className="py-8">
                <p role="alert" className="text-sm text-red-700">
                  РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЃРїРёСЃРѕРє Р·Р°СЏРІРѕРє.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void pendingQuery.refetch();
                    void pendingOoAdminsQuery.refetch();
                  }}
                  className={`${buttonSecondary} mt-3`}
                >
                  РџРѕРІС‚РѕСЂРёС‚СЊ
                </button>
              </div>
            ) : pendingAdmins.length === 0 ? (
              <p className="py-10 text-sm text-slate-500">
                Р—Р°СЏРІРѕРє РЅР° РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РЅРµС‚.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pendingAdmins.map((admin) => (
                  <UserRequestCard
                    key={admin.id}
                    user={admin}
                    icon={<Users size={22} />}
                    roleLabel={
                      admin.role === "MSU_ADMIN"
                        ? "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РњРЎРЈ"
                        : "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅРѕР№ РѕСЂРіР°РЅРёР·Р°С†РёРё"
                    }
                    details={[
                      {
                        label: "РњСѓРЅРёС†РёРїР°Р»СЊРЅРѕРµ СѓРїСЂР°РІР»РµРЅРёРµ",
                        value: admin.msuName ?? "РќРµ СѓРєР°Р·Р°РЅРѕ",
                      },
                      ...(admin.role === "OO_ADMIN"
                        ? [
                            {
                              label: "РћР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅР°СЏ РѕСЂРіР°РЅРёР·Р°С†РёСЏ",
                              value:
                                admin.educationalOrganizationName ??
                                "РќРµ СѓРєР°Р·Р°РЅР°",
                            },
                          ]
                        : []),
                    ]}
                    pending={approvalMutation.isPending}
                    onApprove={() =>
                      approvalMutation.mutate({
                        id: admin.id,
                        action: "approve",
                      })
                    }
                    onReject={() =>
                      approvalMutation.mutate({
                        id: admin.id,
                        action: "reject",
                      })
                    }
                  />
                ))}
              </div>
            )}

            {pendingQuery.data &&
              pendingOoAdminsQuery.data &&
              totalPendingAdmins > pendingAdmins.length && (
                <p className="mt-4 text-sm text-slate-500">
                  РџРѕРєР°Р·Р°РЅС‹ РїРµСЂРІС‹Рµ {pendingAdmins.length} Р·Р°СЏРІРѕРє РёР·{" "}
                  {totalPendingAdmins}.
                </p>
              )}
          </section>
        )}

        {section === "oo-accounts" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div>
              <h3 className="font-semibold text-[#1D3557]">
                РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂС‹ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹С… РѕСЂРіР°РЅРёР·Р°С†РёР№
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                РЈРїСЂР°РІР»РµРЅРёРµ СѓС‡С‘С‚РЅС‹РјРё Р·Р°РїРёСЃСЏРјРё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РћРћ РІ РїСЂРµРґРµР»Р°С…
                С‚РІРѕРµРіРѕ СЂРµРіРёРѕРЅР°.
              </p>
            </div>

            {ooAccountsQuery.isPending ? (
              <p className="py-8 text-sm text-slate-500">
                Р—Р°РіСЂСѓР¶Р°РµРј СЃРїРёСЃРѕРє Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РћРћ...
              </p>
            ) : ooAccountsQuery.isError ? (
              <div className="py-8">
                <p role="alert" className="text-sm text-red-700">
                  РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЃРїРёСЃРѕРє Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РћРћ.
                </p>

                <button
                  type="button"
                  onClick={() => void ooAccountsQuery.refetch()}
                  className={`${buttonSecondary} mt-3`}
                >
                  РџРѕРІС‚РѕСЂРёС‚СЊ
                </button>
              </div>
            ) : allOoAdmins.length === 0 ? (
              <p className="py-10 text-sm text-slate-500">
                РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂС‹ РћРћ РїРѕРєР° РЅРµ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅС‹.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {allOoAdmins.map((admin) => (
                  <UserAccountCard
                    key={admin.id}
                    user={admin}
                    icon={<Building2 size={22} />}
                    roleLabel="РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅРѕР№ РѕСЂРіР°РЅРёР·Р°С†РёРё"
                    details={[
                      {
                        label: "РћР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅР°СЏ РѕСЂРіР°РЅРёР·Р°С†РёСЏ",
                        value:
                          admin.educationalOrganizationName ?? "РќРµ СѓРєР°Р·Р°РЅР°",
                      },
                      {
                        label: "РњСѓРЅРёС†РёРїР°Р»СЊРЅРѕРµ СѓРїСЂР°РІР»РµРЅРёРµ",
                        value: admin.msuName ?? "РќРµ СѓРєР°Р·Р°РЅРѕ",
                      },
                    ]}
                    blockPending={blockMutation.isPending}
                    onToggleBlock={(action) =>
                      blockMutation.mutate({ id: admin.id, action })
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {section === "accounts" && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div>
              <h3 className="font-semibold text-[#1D3557]">
                РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂС‹ РњРЎРЈ
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                РЈС‡С‘С‚РЅС‹Рµ Р·Р°РїРёСЃРё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РІ РїСЂРµРґРµР»Р°С… С‚РІРѕРµРіРѕ СЂРµРіРёРѕРЅР°.
              </p>
            </div>

            {accountsQuery.isPending ? (
              <p className="py-8 text-sm text-slate-500">
                Р—Р°РіСЂСѓР¶Р°РµРј СѓС‡С‘С‚РЅС‹Рµ Р·Р°РїРёСЃРё...
              </p>
            ) : accountsQuery.isError ? (
              <div className="py-8">
                <p role="alert" className="text-sm text-red-700">
                  РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЃРїРёСЃРѕРє Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РњРЎРЈ.
                </p>

                <button
                  type="button"
                  onClick={() => void accountsQuery.refetch()}
                  className={`${buttonSecondary} mt-3`}
                >
                  РџРѕРІС‚РѕСЂРёС‚СЊ
                </button>
              </div>
            ) : allAdmins.length === 0 ? (
              <p className="py-10 text-sm text-slate-500">
                РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂС‹ РњРЎРЈ РїРѕРєР° РЅРµ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅС‹.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {allAdmins.map((admin) => (
                  <UserAccountCard
                    key={admin.id}
                    user={admin}
                    icon={<Users size={22} />}
                    roleLabel="РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РњРЎРЈ"
                    details={[
                      {
                        label: "РњСѓРЅРёС†РёРїР°Р»СЊРЅРѕРµ СѓРїСЂР°РІР»РµРЅРёРµ",
                        value: admin.msuName ?? "РќРµ СѓРєР°Р·Р°РЅРѕ",
                      },
                    ]}
                    blockPending={blockMutation.isPending}
                    onToggleBlock={(action) =>
                      blockMutation.mutate({ id: admin.id, action })
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}
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
