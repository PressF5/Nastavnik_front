import type { ReactNode } from "react";

type AccountStatus = "PENDING" | "ACCEPTED" | "REJECTED";

type RequestUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  accountStatus: AccountStatus;
};

type RequestDetail = {
  label: string;
  value: string;
};

type UserRequestCardProps = {
  user: RequestUser;
  icon: ReactNode;
  roleLabel: string;
  details?: RequestDetail[];
  pending?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

const statusConfig = {
  PENDING: {
    label: "Ожидает подтверждения",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  ACCEPTED: {
    label: "Подтверждена",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  REJECTED: {
    label: "Отклонена",
    className: "bg-red-50 text-red-800 ring-red-200",
  },
};

export function UserRequestCard({
  user,
  icon,
  roleLabel,
  details = [],
  pending = false,
  onApprove,
  onReject,
}: UserRequestCardProps) {
  const fullName = [user.lastName, user.firstName, user.middleName]
    .filter(Boolean)
    .join(" ");

  const status = statusConfig[user.accountStatus];

  function handleReject() {
    if (window.confirm(`Отклонить заявку пользователя ${fullName}?`)) {
      onReject();
    }
  }

  return (
    <article className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#457B9D]/50 hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#457B9D]/10 text-[#457B9D]">
            {icon}
          </div>

          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <h3 className="mt-4 font-semibold leading-6 text-[#1D3557]">
          {fullName}
        </h3>

        <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Тип учётной записи
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {roleLabel}
            </p>
          </div>

          {details.map((detail) => (
            <div key={detail.label}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {detail.label}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {detail.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {user.accountStatus === "PENDING" && (
        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={onApprove}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Подтвердить
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={handleReject}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Отклонить
          </button>
        </div>
      )}
    </article>
  );
}
