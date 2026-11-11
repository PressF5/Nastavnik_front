import { Building2 } from "lucide-react";

type OrganizationUnit = {
  id: number;
  code: number;
  name: string;
};

export type OrganizationContext = {
  region: OrganizationUnit | null;
  msu: OrganizationUnit | null;
  educationalOrganization: OrganizationUnit | null;
};

type Props = {
  context?: OrganizationContext;
  isLoading: boolean;
  isError: boolean;
};

export function OrganizationHierarchyCard({
  context,
  isLoading,
  isError,
}: Props) {
  const levels = [
    {
      label: "Регион",
      value: context?.region,
    },
    {
      label: "Муниципальное управление",
      value: context?.msu,
    },
    {
      label: "Образовательная организация",
      value: context?.educationalOrganization,
    },
  ].filter((level) => level.value !== null && level.value !== undefined);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-[#E8F0F5] p-3 text-[#457B9D]">
          <Building2 size={21} />
        </div>

        <div>
          <h2 className="font-semibold text-[#1D3557]">
            Моя организационная структура
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Организация и подчинённость
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">
          Загружаем организационную структуру...
        </p>
      ) : isError ? (
        <p className="text-sm text-red-600">
          Не удалось загрузить организационную структуру.
        </p>
      ) : levels.length === 0 ? (
        <p className="text-sm text-slate-500">
          Организационная структура не найдена.
        </p>
      ) : (
        <div className="space-y-3">
          {levels.map((level) => (
            <div
              key={level.label}
              className="rounded-lg border border-slate-200 bg-[#F8F9FA] p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {level.label}
              </p>

              <p className="mt-2 wrap-break-words font-semibold leading-6 text-[#1D3557]">
                {level.value?.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Код: {level.value?.code}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
