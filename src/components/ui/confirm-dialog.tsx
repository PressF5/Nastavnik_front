"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { Dialog } from "radix-ui";
import { LoaderCircle } from "lucide-react";

type ConfirmDialogProps = {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  variant?: "default" | "danger";
  onConfirm: () => void;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Подтвердить",
  isPending = false,
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const wasPending = useRef(false);

  // Закрываем окно после завершения запроса.
  useEffect(() => {
    if (isPending) {
      wasPending.current = true;
    } else if (wasPending.current) {
      wasPending.current = false;
      setOpen(false);
    }
  }, [isPending]);

  const confirmButtonClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-[#1D3557] text-white hover:bg-[#27476f]";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          setOpen(nextOpen);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-black/40 backdrop-blur-sm" />

        <Dialog.Content className="fixed left-1/2 top-1/2 z-101 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-[#1D3557]">
            {title}
          </Dialog.Title>

          <Dialog.Description className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
            {description}
          </Dialog.Description>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Отмена
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={onConfirm}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClass}`}
            >
              {isPending && <LoaderCircle size={16} className="animate-spin" />}
              {isPending ? "Выполняется..." : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
