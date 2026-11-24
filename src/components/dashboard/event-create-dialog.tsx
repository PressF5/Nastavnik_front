"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api-client";

type EventLevel = "FEDERAL" | "REGIONAL" | "MUNICIPAL";

type CreateEventRequest = {
  name: string;
  description: string | null;
  level: EventLevel;
  startDate: string;
  endDate: string | null;
  location: string | null;
  organizer: string | null;
  url: string | null;
};

type EventCreateDialogProps = {
  isRegionAdmin: boolean;
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20";

const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D3557] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#27476f] disabled:cursor-not-allowed disabled:opacity-50";

const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Не удалось создать мероприятие.";
}

export function EventCreateDialog({ isRegionAdmin }: EventCreateDialogProps) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<EventLevel>(
    isRegionAdmin ? "REGIONAL" : "MUNICIPAL",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [url, setUrl] = useState("");

  const createMutation = useMutation({
    mutationFn: (request: CreateEventRequest) =>
      apiFetch("/api/admin/events", {
        method: "POST",
        body: JSON.stringify(request),
      }),

    onSuccess: async () => {
      toast.success("Мероприятие создано.");

      await queryClient.invalidateQueries({
        queryKey: ["admin-events"],
      });

      resetForm();
      setOpen(false);
    },

    onError: (error) => {
      toast.error("Не удалось создать мероприятие.", {
        description: getErrorMessage(error),
      });
    },
  });

  function resetForm() {
    setName("");
    setDescription("");
    setLevel(isRegionAdmin ? "REGIONAL" : "MUNICIPAL");
    setStartDate("");
    setEndDate("");
    setLocation("");
    setOrganizer("");
    setUrl("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && createMutation.isPending) {
      return;
    }

    setOpen(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      toast.error("Укажи название мероприятия.");
      return;
    }

    if (endDate && endDate < startDate) {
      toast.error("Дата окончания не может быть раньше даты начала.");
      return;
    }

    const request: CreateEventRequest = {
      name: normalizedName,
      description: description.trim() || null,
      level: isRegionAdmin ? level : "MUNICIPAL",
      startDate,
      endDate: endDate || null,
      location: location.trim() || null,
      organizer: organizer.trim() || null,
      url: url.trim() || null,
    };

    createMutation.mutate(request);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button type="button" className={buttonPrimary}>
          <Plus size={16} />
          Создать мероприятие
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />

        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#F8F9FA] shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 bg-white p-5 sm:p-6">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[#1D3557]">
                Новое мероприятие
              </Dialog.Title>

              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Заполни информацию о мероприятии.
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Закрыть"
                disabled={createMutation.isPending}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <form
            onSubmit={handleSubmit}
            className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6"
          >
            <div>
              <label className="text-sm font-medium text-slate-700">
                Название мероприятия *
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                required
                placeholder="Название мероприятия"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Описание
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Краткое описание мероприятия"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Уровень мероприятия
              </label>

              {isRegionAdmin ? (
                <select
                  value={level}
                  onChange={(event) =>
                    setLevel(event.target.value as EventLevel)
                  }
                  className={inputClass}
                >
                  <option value="FEDERAL">Федеральное</option>
                  <option value="REGIONAL">Региональное</option>
                </select>
              ) : (
                <>
                  <input
                    value="Муниципальное"
                    readOnly
                    className={`${inputClass} bg-slate-100`}
                  />

                  <p className="mt-1.5 text-xs text-slate-500">
                    Администратор МСУ может создавать только муниципальные
                    мероприятия.
                  </p>
                </>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Дата начала *
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Дата окончания
                </label>

                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Место проведения
                </label>

                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  maxLength={300}
                  placeholder="Место проведения"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Организатор
                </label>

                <input
                  value={organizer}
                  onChange={(event) => setOrganizer(event.target.value)}
                  maxLength={200}
                  placeholder="Название организации"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Ссылка на мероприятие
              </label>

              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                maxLength={1000}
                placeholder="https://example.ru"
                className={inputClass}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                disabled={createMutation.isPending}
                className={buttonSecondary}
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className={buttonPrimary}
              >
                {createMutation.isPending
                  ? "Создание..."
                  : "Создать мероприятие"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
