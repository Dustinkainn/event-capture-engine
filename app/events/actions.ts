"use server";

import { EventStatus, EventVisibility, QuestionScope, QuestionType } from "@prisma/client";
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

function getQuestionPayload(eventId: string, formData: FormData) {
  const label = getString(formData, "label");

  if (!label) {
    throw new Error("Question label is required.");
  }

  return {
    eventId,
    label,
    helpText: getOptionalString(formData, "helpText"),
    questionType: getString(formData, "questionType") as QuestionType,
    scope: getString(formData, "scope") as QuestionScope,
    isRequired: formData.get("isRequired") === "on",
    displayOrder: getOptionalNumber(formData, "displayOrder") ?? 0
  };
}

function getQuestionOptions(formData: FormData) {
  return getString(formData, "options")
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean)
    .map((label, index) => ({
      label,
      value: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      displayOrder: index + 1
    }));
}

export async function createQuestion(eventId: string, formData: FormData) {
  const options = getQuestionOptions(formData);

  await prisma.registrationQuestion.create({
    data: {
      ...getQuestionPayload(eventId, formData),
      options: options.length > 0 ? { create: options } : undefined
    }
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/form`);
  redirect(`/events/${eventId}/form`);
}

export async function updateQuestion(eventId: string, questionId: string, formData: FormData) {
  const options = getQuestionOptions(formData);
  const currentOptions = await prisma.questionOption.findMany({
    where: { questionId },
    orderBy: { displayOrder: "asc" }
  });
  const currentLabels = currentOptions.map((option) => option.label);
  const nextLabels = options.map((option) => option.label);
  const optionsChanged =
    currentLabels.length !== nextLabels.length ||
    currentLabels.some((label, index) => label !== nextLabels[index]);

  if (!optionsChanged) {
    await prisma.registrationQuestion.update({
      where: { id: questionId },
      data: getQuestionPayload(eventId, formData)
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/form`);
    redirect(`/events/${eventId}/form`);
  }

  await prisma.$transaction([
    prisma.questionCountMapping.deleteMany({
      where: { questionId }
    }),
    prisma.registrationAnswer.deleteMany({
      where: { questionId }
    }),
    prisma.questionOption.deleteMany({
      where: { questionId }
    }),
    prisma.registrationQuestion.update({
      where: { id: questionId },
      data: {
        ...getQuestionPayload(eventId, formData),
        options: options.length > 0 ? { create: options } : undefined
      }
    })
  ]);

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/form`);
  redirect(`/events/${eventId}/form`);
}

export async function deleteQuestion(eventId: string, questionId: string) {
  await prisma.$transaction([
    prisma.questionCountMapping.deleteMany({
      where: { questionId }
    }),
    prisma.registrationAnswer.deleteMany({
      where: { questionId }
    }),
    prisma.questionOption.deleteMany({
      where: { questionId }
    }),
    prisma.registrationQuestion.delete({
      where: { id: questionId }
    })
  ]);

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/form`);
  redirect(`/events/${eventId}/form`);
}
