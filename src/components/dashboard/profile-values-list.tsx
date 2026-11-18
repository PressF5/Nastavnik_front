type ProfileValueItem = {
  profileFieldId: number;
  profileFieldName: string;
};

type ProfileValuesListProps<T extends ProfileValueItem> = {
  items: readonly T[];
  getValue: (item: T) => string;
  emptyMessage: string;
  variant?: "cards" | "rows";
};

export function ProfileValuesList<T extends ProfileValueItem>({
  items,
  getValue,
  emptyMessage,
  variant = "cards",
}: ProfileValuesListProps<T>) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>;
  }

  if (variant === "rows") {
    return (
      <div className="mt-4 divide-y divide-slate-100">
        {items.map((item) => (
          <div
            key={item.profileFieldId}
            className="grid gap-1 py-3 sm:grid-cols-2 sm:gap-4"
          >
            <p className="text-sm text-slate-500">{item.profileFieldName}</p>

            <p className="text-sm font-medium text-slate-800 sm:text-right">
              {getValue(item)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.profileFieldId}
          className="rounded-lg border border-slate-200 p-4"
        >
          <p className="text-xs font-medium text-slate-500">
            {item.profileFieldName}
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800">
            {getValue(item)}
          </p>
        </div>
      ))}
    </div>
  );
}
