"use client";

import { Dialog } from "radix-ui";
import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, X, Pencil } from "lucide-react";
import type {
  EventItem,
  EventLevel,
  EventFormat,
  EventStatus,
} from "@/types/event";

type EventDetailsDialogProps = {
  event: EventItem | null;
  onClose: () => void;
  onEdit: (event: EventItem) => void;
  canEdit: boolean;
};

function formatDateTime(value: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");

  return `${day}.${month}.${year} ${time.slice(0, 5)}`;
}

function levelLabel(level: EventLevel) {
  switch (level) {
    case "FEDERAL":
      return "Федеральное";
    case "REGIONAL":
      return "Региональное";
    case "MUNICIPAL":
      return "Муниципальное";
  }
}

function formatLabel(format: EventFormat) {
  switch (format) {
    case "ONLINE":
      return "Онлайн";
    case "OFFLINE":
      return "Очно";
    case "HYBRID":
      return "Смешанный";
  }
}

function statusLabel(status: EventStatus) {
  switch (status) {
    case "PLANNED":
      return "Запланировано";
    case "ONGOING":
      return "Идёт";
    case "COMPLETED":
      return "Завершено";
  }
}

function statusClass(status: EventStatus) {
  switch (status) {
    case "PLANNED":
      return "bg-blue-50 text-blue-700";
    case "ONGOING":
      return "bg-emerald-50 text-emerald-700";
    case "COMPLETED":
      return "bg-red-50 text-red-700";
  }
}

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1 text-sm leading-6 text-slate-700">{children}</div>
    </div>
  );
}

export function EventDetailsDialog({
  event,
  onClose,
  onEdit,
  canEdit,
}: EventDetailsDialogProps) {
  return (
    <Dialog.Root
      open={event !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />

        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#F8F9FA] shadow-2xl">
          {event && (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:p-6">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-[#E8F0F5] px-3 py-1.5 text-xs font-medium text-[#1D3557]">
                      {levelLabel(event.level)}
                    </span>

                    <span
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${statusClass(event.status)}`}
                    >
                      {statusLabel(event.status)}
                    </span>

                    <span
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        event.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {event.active ? "Активно" : "Неактивно"}
                    </span>
                  </div>

                  <Dialog.Title className="text-lg font-semibold text-[#1D3557] sm:text-xl">
                    {event.name}
                  </Dialog.Title>

                  <Dialog.Description className="mt-1 text-sm text-slate-500">
                    Подробная информация о мероприятии
                  </Dialog.Description>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(event)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Pencil size={16} />
                      Редактировать
                    </button>
                  )}

                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Закрыть"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      <X size={20} />
                    </button>
                  </Dialog.Close>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-[#1D3557]">
                    Основная информация
                  </h3>

                  {event.description ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {event.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">
                      Описание не указано.
                    </p>
                  )}

                  <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    <InfoItem label="Уровень">
                      {levelLabel(event.level)}
                    </InfoItem>

                    <InfoItem label="Формат">
                      {formatLabel(event.format)}
                    </InfoItem>

                    <InfoItem label="Начало">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={15} />
                        {formatDateTime(event.startAt)}
                      </span>
                    </InfoItem>

                    <InfoItem label="Окончание">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={15} />
                        {formatDateTime(event.endAt)}
                      </span>
                    </InfoItem>

                    {event.location && (
                      <InfoItem label="Место проведения">
                        <span className="inline-flex items-center gap-2">
                          <MapPin size={15} />
                          {event.location}
                        </span>
                      </InfoItem>
                    )}

                    {event.url && (
                      <InfoItem label="Ссылка на мероприятие">
                        <Link
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[#457B9D] hover:underline"
                        >
                          Перейти к мероприятию
                          <ExternalLink size={14} />
                        </Link>
                      </InfoItem>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-[#1D3557]">Организатор</h3>

                  <div className="mt-4 space-y-3">
                    <InfoItem label="Ответственное лицо">
                      {event.organizerPersonName || "Не указано"}
                    </InfoItem>

                    <InfoItem label="Организация">
                      {event.organizerOrganizationName || "Не указана"}
                    </InfoItem>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-[#1D3557]">Спикеры</h3>

                  {event.speakers.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {event.speakers.map((speaker) => (
                        <div
                          key={speaker.id}
                          className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                        >
                          <p className="text-sm font-medium text-slate-800">
                            {speaker.fullName}
                          </p>
                          {speaker.position && (
                            <p className="mt-1 text-sm text-slate-500">
                              {speaker.position}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">
                      Спикеры не указаны.
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-[#1D3557]">Материалы</h3>

                  <div className="mt-4 space-y-3">
                    {event.materialLinks.map((material) => (
                      <Link
                        key={material.id}
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#457B9D] hover:underline"
                      >
                        {material.name}
                        <ExternalLink size={14} />
                      </Link>
                    ))}

                    {event.materialLinks.length === 0 && (
                      <p className="text-sm text-slate-400">
                        Дополнительные материалы не добавлены.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
