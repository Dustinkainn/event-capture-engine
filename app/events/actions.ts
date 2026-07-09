"use server";

import {
  CountSourceType,
  EventStatus,
  EventVisibility,
  QuestionScope,
  QuestionType,
  RegistrationStatus,
  SyncStatus
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateEventCounts } from "@/lib/counts";
import { prisma } from "@/lib/prisma";
import { buildSyncPayload } from "@/lib/syncPayloads";

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
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

export async function setRegistrationOpen(eventId: string, open: boolean) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    throw new Error("Event could not be found.");
  }

  const now = new Date();
  // When reopening, clear a stale window that would otherwise keep registration
  // blocked (a close date already in the past, or an open date still in the future).
  const clearStaleClose = open && event.registrationClosesAt !== null && event.registrationClosesAt < now;
  const clearFutureOpen = open && event.registrationOpensAt !== null && event.registrationOpensAt > now;

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: open ? "open" : "closed",
      registrationClosesAt: clearStaleClose ? null : event.registrationClosesAt,
      registrationOpensAt: clearFutureOpen ? null : event.registrationOpensAt
    }
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/register/${eventId}`);
  redirect(`/events/${eventId}?registration=${open ? "open" : "closed"}`);
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

function getCountItems(formData: FormData) {
  return getString(formData, "items")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((label, index) => ({
      label,
      value: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      displayOrder: index + 1
    }));
}

function getCountCategoryPayload(eventId: string, formData: FormData) {
  const name = getString(formData, "name");

  if (!name) {
    throw new Error("Count category name is required.");
  }

  return {
    eventId,
    name,
    sourceType: getString(formData, "sourceType") as CountSourceType,
    displayOrder: getOptionalNumber(formData, "displayOrder") ?? 0
  };
}

export async function createCountCategory(eventId: string, formData: FormData) {
  const items = getCountItems(formData);

  await prisma.countCategory.create({
    data: {
      ...getCountCategoryPayload(eventId, formData),
      items: items.length > 0 ? { create: items } : undefined
    }
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/counts`);
  redirect(`/events/${eventId}/counts`);
}

export async function updateCountCategory(eventId: string, categoryId: string, formData: FormData) {
  const items = getCountItems(formData);
  const currentItems = await prisma.countItem.findMany({
    where: { countCategoryId: categoryId },
    orderBy: { displayOrder: "asc" }
  });
  const currentLabels = currentItems.map((item) => item.label);
  const nextLabels = items.map((item) => item.label);
  const itemsChanged =
    currentLabels.length !== nextLabels.length ||
    currentLabels.some((label, index) => label !== nextLabels[index]);

  if (!itemsChanged) {
    await prisma.countCategory.update({
      where: { id: categoryId },
      data: getCountCategoryPayload(eventId, formData)
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/counts`);
    redirect(`/events/${eventId}/counts`);
  }

  await prisma.$transaction([
    prisma.questionCountMapping.deleteMany({
      where: { countItem: { countCategoryId: categoryId } }
    }),
    prisma.generatedCount.deleteMany({
      where: { countCategoryId: categoryId }
    }),
    prisma.countItem.deleteMany({
      where: { countCategoryId: categoryId }
    }),
    prisma.countCategory.update({
      where: { id: categoryId },
      data: {
        ...getCountCategoryPayload(eventId, formData),
        items: items.length > 0 ? { create: items } : undefined
      }
    })
  ]);

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/counts`);
  redirect(`/events/${eventId}/counts`);
}

export async function deleteCountCategory(eventId: string, categoryId: string) {
  await prisma.$transaction([
    prisma.questionCountMapping.deleteMany({
      where: { countItem: { countCategoryId: categoryId } }
    }),
    prisma.generatedCount.deleteMany({
      where: { countCategoryId: categoryId }
    }),
    prisma.countItem.deleteMany({
      where: { countCategoryId: categoryId }
    }),
    prisma.countCategory.delete({
      where: { id: categoryId }
    })
  ]);

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/counts`);
  redirect(`/events/${eventId}/counts`);
}

export async function createCountMapping(eventId: string, formData: FormData) {
  const questionId = getString(formData, "questionId");
  const optionId = getString(formData, "optionId");
  const countItemId = getString(formData, "countItemId");
  const quantity = getOptionalNumber(formData, "quantity") ?? 1;

  if (!questionId || !countItemId) {
    throw new Error("Question and count item are required.");
  }

  await prisma.questionCountMapping.create({
    data: {
      questionId,
      optionId: optionId || null,
      countItemId,
      quantity
    }
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/counts`);
  redirect(`/events/${eventId}/counts`);
}

export async function deleteCountMapping(eventId: string, mappingId: string) {
  await prisma.questionCountMapping.delete({
    where: { id: mappingId }
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/counts`);
  redirect(`/events/${eventId}/counts`);
}

export async function refreshEventCounts(eventId: string) {
  await generateEventCounts(prisma, eventId);

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/counts`);
  redirect(`/events/${eventId}/counts?counts=refreshed`);
}

export async function updateRegistrationStatus(eventId: string, registrationId: string, status: RegistrationStatus) {
  const now = new Date();

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status,
      completedAt: status === "complete" ? now : null,
      canceledAt: status === "canceled" ? now : null
    }
  });

  await generateEventCounts(prisma, eventId);

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/registrations`);
  redirect(`/events/${eventId}/registrations?updated=1`);
}

export async function updateSyncStatus(eventId: string, syncItemId: string, status: SyncStatus) {
  await prisma.syncQueueItem.update({
    where: { id: syncItemId },
    data: {
      status,
      attempts: status === "ready" ? 0 : undefined,
      nextRetryAt: null
    }
  });

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/sync`);
  redirect(`/events/${eventId}/sync?updated=1`);
}

export async function buildEventSyncPayloads(eventId: string) {
  const items = await prisma.syncQueueItem.findMany({
    where: { eventId },
    orderBy: { updatedAt: "asc" }
  });

  for (const item of items) {
    const result = await buildSyncPayload(prisma, item.recordType, item.recordId);

    await prisma.syncQueueItem.update({
      where: { id: item.id },
      data: {
        destination: "External connector placeholder",
        payloadSnapshotJson: result.payloadJson,
        errorMessage: result.errorMessage,
        responseSnapshotJson: null,
        status: result.errorMessage ? "review_required" : "ready",
        nextRetryAt: null
      }
    });
  }

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/sync`);
  redirect(`/events/${eventId}/sync?payloads=generated`);
}

export async function simulateSyncAttempt(eventId: string, syncItemId: string, outcome: "success" | "failure") {
  const item = await prisma.syncQueueItem.findFirst({
    where: { id: syncItemId, eventId }
  });

  if (!item) {
    throw new Error("Sync item could not be found.");
  }

  const now = new Date();
  const attempts = item.attempts + 1;
  const nextRetryAt = outcome === "failure" ? new Date(now.getTime() + 15 * 60_000) : null;
  const responseSnapshotJson = JSON.stringify(
    {
      mode: "simulation",
      attemptedAt: now.toISOString(),
      destination: item.destination ?? "External connector placeholder",
      outcome,
      message:
        outcome === "success"
          ? "Local simulation marked this item as synced. No external API call was made."
          : "Local simulation marked this item as failed. No external API call was made.",
      recordType: item.recordType,
      recordId: item.recordId
    },
    null,
    2
  );

  await prisma.syncQueueItem.update({
    where: { id: item.id },
    data: {
      status: outcome === "success" ? "synced" : "failed",
      attempts,
      responseSnapshotJson,
      errorMessage: outcome === "failure" ? "Simulated connector failure for local review." : null,
      nextRetryAt
    }
  });

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/sync`);
  redirect(`/events/${eventId}/sync?simulated=${outcome}`);
}
