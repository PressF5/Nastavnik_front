"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiError } from "@/lib/api-client";

type EventLevel = "FEDERAL" | "REGIONAL" | "MUNICIPAL";
type EventFormat = "ONLINE" | "OFFLINE" | "HYBRID";

type SpeakerRequest = {
  fullName: string;
  position: string;
};

type MaterialLinkRequest = {
  name: string;
  url: string;
};

type CreateEventRequest = {
  name: string;
  description: string | null;
  level: EventLevel;
  format: EventFormat;
  startAt: string;
  endAt: string;
  location: string | null;
  url: string | null;
  speakers: {
    fullName: string;
    position: string | null;
  }[];
  materialLinks: MaterialLinkRequest[];
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

const buttonRemove =
  "inline-flex items-center justify-center rounded-lg p-2 text-red-600 transition hover:bg-red-50";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Не удалось создать мероприятие.";
}

function isHttpUrl(value: string) {
  return /^https?:\/\/.+$/i.test(value);
}

export function EventCreateDialog({ isRegionAdmin }: EventCreateDialogProps) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<EventLevel>(
    isRegionAdmin ? "REGIONAL" : "MUNICIPAL",
  );
  const [format, setFormat] = useState<EventFormat>("OFFLINE");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [speakers, setSpeakers] = useState<SpeakerRequest[]>([]);
  const [materialLinks, setMaterialLinks] = useState<MaterialLinkRequest[]>([]);

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
    setFormat("OFFLINE");
    setStartAt("");
    setEndAt("");
    setLocation("");
    setUrl("");
    setSpeakers([]);
    setMaterialLinks([]);
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

  function addSpeaker() {
    setSpeakers((current) => [...current, { fullName: "", position: "" }]);
  }

  function updateSpeaker(
    index: number,
    field: keyof SpeakerRequest,
    value: string,
  ) {
    setSpeakers((current) =>
      current.map((speaker, i) =>
        i === index ? { ...speaker, [field]: value } : speaker,
      ),
    );
  }

  function removeSpeaker(index: number) {
    setSpeakers((current) => current.filter((_, i) => i !== index));
  }

  function addMaterial() {
    setMaterialLinks((current) => [...current, { name: "", url: "" }]);
  }

  function updateMaterial(
    index: number,
    field: keyof MaterialLinkRequest,
    value: string,
  ) {
    setMaterialLinks((current) =>
      current.map((material, i) =>
        i === index ? { ...material, [field]: value } : material,
      ),
    );
  }

  function removeMaterial(index: number) {
    setMaterialLinks((current) => current.filter((_, i) => i !== index));
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      toast.error("Укажи название мероприятия.");
      return;
    }

    if (!startAt || !endAt) {
      toast.error("Укажи дату и время начала и окончания.");
      return;
    }

    if (endAt <= startAt) {
      toast.error("Окончание мероприятия должно быть позже его начала.");
      return;
    }

    if ((format === "OFFLINE" || format === "HYBRID") && !location.trim()) {
      toast.error(
        "Для выбранного формата необходимо указать место проведения.",
      );
      return;
    }

    if (url.trim() && !isHttpUrl(url.trim())) {
      toast.error(
        "Ссылка на мероприятие должна начинаться с http:// или https://.",
      );
      return;
    }

    const normalizedSpeakers = speakers.map((speaker) => ({
      fullName: speaker.fullName.trim(),
      position: speaker.position.trim() || null,
    }));

    if (normalizedSpeakers.some((speaker) => !speaker.fullName)) {
      toast.error("Укажи ФИО каждого добавленного спикера.");
      return;
    }

    const normalizedMaterials = materialLinks.map((material) => ({
      name: material.name.trim(),
      url: material.url.trim(),
    }));

    if (
      normalizedMaterials.some(
        (material) =>
          !material.name || !material.url || !isHttpUrl(material.url),
      )
    ) {
      toast.error(
        "Для каждого материала укажи название и ссылку http:// или https://.",
      );
      return;
    }

    const request: CreateEventRequest = {
      name: normalizedName,
      description: description.trim() || null,
      level: isRegionAdmin ? level : "MUNICIPAL",
      format,
      startAt,
      endAt,
      location: format === "ONLINE" ? null : location.trim(),
      url: url.trim() || null,
      speakers: normalizedSpeakers,
      materialLinks: normalizedMaterials,
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

        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#F8F9FA] shadow-2xl">
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
            className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-6"
          >
            {/* Основная информация */}
            <section className="space-y-4">
              <h3 className="font-semibold text-[#1D3557]">
                Основная информация
              </h3>

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
                  rows={4}
                  placeholder="Описание мероприятия"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Уровень мероприятия *
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
            </section>

            {/* Формат и место проведения */}
            <section className="space-y-4 border-t border-slate-200 pt-5">
              <h3 className="font-semibold text-[#1D3557]">
                Формат проведения
              </h3>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Формат мероприятия *
                </label>

                <select
                  value={format}
                  onChange={(event) => {
                    const nextFormat = event.target.value as EventFormat;
                    setFormat(nextFormat);

                    if (nextFormat === "ONLINE") {
                      setLocation("");
                    }
                  }}
                  className={inputClass}
                >
                  <option value="ONLINE">Онлайн</option>
                  <option value="OFFLINE">Очно</option>
                  <option value="HYBRID">Смешанный</option>
                </select>
              </div>

              {format !== "ONLINE" && (
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Место проведения *
                  </label>

                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    maxLength={300}
                    required
                    placeholder="Адрес или название площадки"
                    className={inputClass}
                  />
                </div>
              )}
            </section>

            {/* Дата и время */}
            <section className="space-y-4 border-t border-slate-200 pt-5">
              <h3 className="font-semibold text-[#1D3557]">
                Дата и время проведения
              </h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Начало *
                  </label>

                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Окончание *
                  </label>

                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(event) => setEndAt(event.target.value)}
                    min={startAt || undefined}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Время указывается по московскому времени.
              </p>
            </section>

            {/* Спикеры */}
            <section className="space-y-4 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#1D3557]">Спикеры</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Добавление спикеров необязательно.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addSpeaker}
                  className={buttonSecondary}
                >
                  <Plus size={16} />
                  Добавить спикера
                </button>
              </div>

              {speakers.map((speaker, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      Спикер {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeSpeaker(index)}
                      className={buttonRemove}
                      aria-label="Удалить спикера"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">ФИО *</label>

                    <input
                      value={speaker.fullName}
                      onChange={(event) =>
                        updateSpeaker(index, "fullName", event.target.value)
                      }
                      maxLength={300}
                      required
                      placeholder="Фамилия, имя, отчество"
                      className={inputClass}
                    />
                  </div>

                  <div className="mt-3">
                    <label className="text-sm text-slate-600">Должность</label>

                    <input
                      value={speaker.position}
                      onChange={(event) =>
                        updateSpeaker(index, "position", event.target.value)
                      }
                      maxLength={300}
                      placeholder="Должность спикера"
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </section>

            {/* Материалы */}
            <section className="space-y-4 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#1D3557]">Материалы</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Ссылки на презентации, документы и другие материалы.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addMaterial}
                  className={buttonSecondary}
                >
                  <Plus size={16} />
                  Добавить материал
                </button>
              </div>

              {materialLinks.map((material, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      Материал {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className={buttonRemove}
                      aria-label="Удалить материал"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">Название *</label>

                    <input
                      value={material.name}
                      onChange={(event) =>
                        updateMaterial(index, "name", event.target.value)
                      }
                      maxLength={200}
                      required
                      placeholder="Например, презентация мероприятия"
                      className={inputClass}
                    />
                  </div>

                  <div className="mt-3">
                    <label className="text-sm text-slate-600">Ссылка *</label>

                    <input
                      type="url"
                      value={material.url}
                      onChange={(event) =>
                        updateMaterial(index, "url", event.target.value)
                      }
                      maxLength={1000}
                      required
                      placeholder="https://example.ru/material"
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </section>

            {/* Ссылка на мероприятие */}
            <section className="space-y-3 border-t border-slate-200 pt-5">
              <h3 className="font-semibold text-[#1D3557]">
                Дополнительная ссылка
              </h3>

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
            </section>

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
