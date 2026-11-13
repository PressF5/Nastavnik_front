import { ClipboardList, CheckCircle2, UserRound } from "lucide-react";

type ProfileCompletionSectionProps = {
  totalFields: number;
  completedFields: number;
  requiredFields: number;
  completedRequiredFields: number;
  status: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onOpenProfile: () => void;
};

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-[#1D3557]">{value}</p>
        </div>

        <div className="rounded-xl bg-[#E8F0F5] p-3 text-[#457B9D]">{icon}</div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

export function ProfileCompletionSection({
  totalFields,
  completedFields,
  requiredFields,
  completedRequiredFields,
  status,
  isLoading,
  isError,
  onRetry,
  onOpenProfile,
}: ProfileCompletionSectionProps) {
  const completionPercent =
    totalFields === 0 ? 0 : Math.round((completedFields / totalFields) * 100);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#1D3557]">Мой профиль</h2>

        <p className="mt-1 text-sm text-slate-500">
          Заполнение профильной анкеты.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Полей в анкете"
          value={isLoading ? "—" : totalFields}
          description="Активные поля анкеты, настроенные администратором."
          icon={<ClipboardList size={21} />}
        />

        <StatCard
          title="Обязательные поля"
          value={
            isLoading ? "—" : `${completedRequiredFields} / ${requiredFields}`
          }
          description="Количество заполненных обязательных полей."
          icon={<CheckCircle2 size={21} />}
        />

        <StatCard
          title="Заполненность анкеты"
          value={isLoading ? "—" : `${completedFields} / ${totalFields}`}
          description="Количество заполненных полей анкеты."
          icon={<UserRound size={21} />}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="font-semibold text-[#1D3557]">Состояние анкеты</h3>

        <p className="mt-2 text-sm text-slate-600">{status}</p>

        {!isLoading && !isError && totalFields > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Заполнение анкеты</span>

              <span className="font-medium text-[#1D3557]">
                {completionPercent}%
              </span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-[#E8F0F5]"
              role="progressbar"
              aria-label="Заполнение анкеты"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercent}
            >
              <div
                className="h-full rounded-full bg-[#457B9D] transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Заполнено {completedFields} из {totalFields} полей
            </p>
          </div>
        )}

        {isError && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-sm font-medium text-[#457B9D] hover:underline"
          >
            Повторить загрузку
          </button>
        )}

        {!isLoading && !isError && totalFields === 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Для вашей роли пока не настроены поля анкеты.
          </p>
        )}

        <button
          type="button"
          onClick={onOpenProfile}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ClipboardList size={17} />
          Перейти к заполнению анкеты
        </button>
      </div>
    </section>
  );
}
