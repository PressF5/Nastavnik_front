import type { ReactNode } from "react";

type AccountStatus = "PENDING" | "ACCEPTED" | "REJECTED";
type BlockAction = "block" | "unblock";

type UserAccount = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  isBlock: boolean;
  accountStatus: AccountStatus;
};

type UserAccountCardProps = {
  user: UserAccount;
  icon: ReactNode;
  roleLabel: string;
  details?: {
    label: string;
    value: string;
  }[];
  blockPending?: boolean;
  onToggleBlock?: (action: BlockAction) => void;
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

export function UserAccountCard({
  user,
  icon,
  roleLabel,
  details = [],
  blockPending = false,
  onToggleBlock,
}: UserAccountCardProps) {
  const fullName = [user.lastName, user.firstName, user.middleName]
    .filter(Boolean)
    .join(" ");

  const status = statusConfig[user.accountStatus];
  const action: BlockAction = user.isBlock ? "unblock" : "block";

  function handleBlockToggle() {
    const message = user.isBlock
      ? `Разблокировать учётную запись ${fullName}?`
      : `Заблокировать учётную запись ${fullName}?`;

    if (window.confirm(message)) {
      onToggleBlock?.(action);
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

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Состояние учётной записи
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  user.isBlock ? "bg-red-500" : "bg-emerald-500"
                }`}
              />

              <span
                className={`text-sm font-medium ${
                  user.isBlock ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {user.isBlock ? "Заблокирован" : "Не заблокирован"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {user.accountStatus === "ACCEPTED" && onToggleBlock && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={blockPending}
            onClick={handleBlockToggle}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              user.isBlock
                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                : "border-red-200 text-red-700 hover:bg-red-50"
            }`}
          >
            {user.isBlock ? "Разблокировать" : "Заблокировать"}
          </button>
        </div>
      )}
    </article>
  );
}
