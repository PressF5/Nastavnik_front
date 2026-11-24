export type EventLevel = "FEDERAL" | "REGIONAL" | "MUNICIPAL";

export type EventFormat = "ONLINE" | "OFFLINE" | "HYBRID";

export type EventStatus = "PLANNED" | "ONGOING" | "COMPLETED";

export type EventSpeaker = {
  id: number;
  fullName: string;
  position: string | null;
  sortOrder: number;
};

export type EventMaterialLink = {
  id: number;
  name: string;
  url: string;
  sortOrder: number;
};

export type EventItem = {
  id: number;
  name: string;
  description: string | null;
  level: EventLevel;
  format: EventFormat;
  status: EventStatus;
  startAt: string;
  endAt: string;
  nextStatusChangeAt: string | null;
  location: string | null;
  organizerPersonName: string | null;
  organizerOrganizationName: string | null;
  url: string | null;
  active: boolean;
  regionId: number;
  msuId: number | null;
  speakers: EventSpeaker[];
  materialLinks: EventMaterialLink[];
  createdAt: string;
  updatedAt: string;
};
