"use server";

import { EventStatus, EventVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, name: string) {
  const value = getString(formData, name);
  return value.length > 0 ? value : null;
}

function getOptionalNumber(formData: FormData, name: string) {
  const value = getString(formData, name);
  if (!value) {
    return null;
  }

  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function getOptionalDate(formData: FormData, name: string) {
  const value = getString(formData, name);
  return value ? new Date(value) : null;
}

function getEventPayload(formData: FormData) {
  const name = getString(formData, "name");
  const startsAt = getOptionalDate(formData, "startsAt");

  if (!name || !startsAt) {
    throw new Error("Event name and start date are required.");
  }

  return {
    name,
    startsAt,
    endsAt: getOptionalDate(formData, "endsAt"),
    locationName: getOptionalString(formData, "locationName"),
    description: getOptionalString(formData, "description"),
    capacity: getOptionalNumber(formData, "capacity"),
    registrationOpensAt: getOptionalDate(formData, "registrationOpensAt"),
    registrationClosesAt: getOptionalDate(formData, "registrationClosesAt"),
    imageUrl: getOptionalString(formData, "imageUrl"),
    isPaid: formData.get("isPaid") === "on",
    visibility: getString(formData, "visibility") as EventVisibility,
    status: getString(formData, "status") as EventStatus,
    internalNotes: getOptionalString(formData, "internalNotes")
  };
}

export async function createEvent(formData: FormData) {
  const event = await prisma.event.create({
    data: getEventPayload(formData)
  });

  revalidatePath("/");
  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  await prisma.event.update({
    where: { id: eventId },
    data: getEventPayload(formData)
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}
