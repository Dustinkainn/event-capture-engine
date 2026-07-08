"use server";

import { randomBytes } from "crypto";
import { AgeGroup } from "@prisma/client";
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

function getOptionalDate(formData: FormData, name: string) {
  const value = getString(formData, name);
  return value ? new Date(value) : null;
}

export async function submitRegistration(eventId: string, formData: FormData) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      questions: {
        include: { options: true },
        orderBy: { displayOrder: "asc" }
      }
    }
  });

  if (!event) {
    throw new Error("Event could not be found.");
  }

  const primaryFirstName = getString(formData, "primaryFirstName");
  const primaryLastName = getString(formData, "primaryLastName");
  const attendeeFirstName = getString(formData, "attendeeFirstName");

  if (!primaryFirstName || !primaryLastName || !attendeeFirstName) {
    throw new Error("Primary contact and attendee name are required.");
  }

  const registration = await prisma.$transaction(async (tx) => {
    const createdRegistration = await tx.registration.create({
      data: {
        eventId,
        primaryFirstName,
        primaryLastName,
        primaryEmail: getOptionalString(formData, "primaryEmail"),
        primaryPhone: getOptionalString(formData, "primaryPhone"),
        status: event.isPaid ? "submitted" : "complete",
        paymentStatus: event.isPaid ? "pending" : "not_required",
        submittedAt: new Date(),
        completedAt: event.isPaid ? null : new Date(),
        attendees: {
          create: {
            eventId,
            firstName: attendeeFirstName,
            lastName: getOptionalString(formData, "attendeeLastName"),
            email: getOptionalString(formData, "attendeeEmail"),
            phone: getOptionalString(formData, "attendeePhone"),
            ageGroup: (getString(formData, "ageGroup") || "unknown") as AgeGroup
          }
        }
      },
      include: {
        attendees: true
      }
    });

    const attendee = createdRegistration.attendees[0];
    const answerData = event.questions.flatMap((question) => {
      const fieldName = question.scope === "attendee" ? `attendeeQuestion-${question.id}` : `question-${question.id}`;
      const rawValue = getString(formData, fieldName);
      const checkboxChecked = formData.get(fieldName) === "on";
      const isBooleanType = question.questionType === "checkbox" || question.questionType === "waiver";

      if (!rawValue && !checkboxChecked && !question.isRequired) {
        return [];
      }

      const selectedOption = question.options.find((option) => option.id === rawValue);

      return [{
        registrationId: createdRegistration.id,
        attendeeId: question.scope === "attendee" ? attendee.id : null,
        questionId: question.id,
        optionId: selectedOption?.id ?? null,
        valueText: selectedOption ? selectedOption.label : isBooleanType ? null : rawValue || null,
        valueBoolean: isBooleanType ? checkboxChecked : null,
        valueDate: question.questionType === "date" ? getOptionalDate(formData, fieldName) : null
      }];
    });

    if (answerData.length > 0) {
      await tx.registrationAnswer.createMany({
        data: answerData
      });
    }

    await tx.qrToken.create({
      data: {
        eventId,
        registrationId: createdRegistration.id,
        tokenHash: randomBytes(24).toString("hex"),
        scope: "registration",
        status: "unused"
      }
    });

    await tx.syncQueueItem.create({
      data: {
        eventId,
        recordType: "registration",
        recordId: createdRegistration.id,
        status: "ready",
        attempts: 0
      }
    });

    return createdRegistration;
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  redirect(`/register/${eventId}/confirmation/${registration.id}`);
}
