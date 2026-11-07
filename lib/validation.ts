import { z } from "zod";
import { isValidDate } from "./time";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  email,
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password.") });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: z.string().trim().max(30).regex(/^[+\d\s().-]*$/, "Enter a valid phone number."),
  faculty: z.enum(["", "engineering", "finance", "law"]),
  goals: z.string().trim().max(500, "Keep goals under 500 characters."),
});

const date = z.string().refine(isValidDate, "Choose a valid date.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time.");

export const bookingSchema = z.object({
  tutorId: z.string().min(1, "Choose a tutor."),
  specialization: z.string().min(1, "Choose a subject."),
  topic: z.string().trim().min(3, "Describe the topic in a few words.").max(140, "Keep the topic under 140 characters."),
  notes: z.string().trim().max(1000, "Keep notes under 1000 characters.").default(""),
  date,
  start: time,
  duration: z.number().int().positive("Choose a session length."),
  format: z.enum(["online", "in-person"], { message: "Choose a session format." }),
  contactName: z.string().trim().min(2, "Enter your name.").max(100),
  contactEmail: email,
  contactPhone: z.string().trim().max(30).regex(/^[+\d\s().-]*$/, "Enter a valid phone number.").default(""),
  acceptPolicy: z.literal(true, { errorMap: () => ({ message: "Please accept the cancellation policy." }) }),
});

export const rescheduleSchema = z.object({ date, start: time });
