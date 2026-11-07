import type { FacultySlug } from "./data";

export type BookingStatus = "confirmed" | "cancelled";
export type SessionFormat = "online" | "in-person";

export interface Booking {
  id: string;
  userId: string;
  tutorId: string;
  specialization: string;
  topic: string;
  notes: string;
  date: string; // YYYY-MM-DD (platform time zone)
  start: string; // HH:MM
  duration: number; // minutes
  format: SessionFormat;
  price: number; // USD
  status: BookingStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string; // ISO
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  faculty: FacultySlug | "";
  goals: string;
}

export interface Slot {
  start: string; // HH:MM
  available: boolean;
}
