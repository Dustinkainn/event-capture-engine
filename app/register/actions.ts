"use server";

import { randomBytes } from "crypto";
import { AgeGroup } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateEventCounts } from "@/lib/counts";
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
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAttendeeKeys(formData: FormData) {
  const keys = getString(formData, "attendeeKeys")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  return keys.length > 0 ? keys : ["0"];
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type RegistrationFormState = {
  error: string | null;
};

export async function submitRegistration(
  eventId: string,
  _prevState: RegistrationFormState,
  formData: FormData
): Promise<RegistrationFormState> {
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
    return { error: "This event could not be found. It may have been removed." };
  }

  if (event.status !== "open" || event.visibility !== "public") {
    return { error: "Registration for this event is not currently open." };
  }

  const now = new Date();
  if (event.registrationOpensAt && now < event.registrationOpensAt) {
    return { error: "Registration for this event has not opened yet." };
  }

  if (event.registrationClosesAt && now > event.registrationClosesAt) {
    return { error: "Registration for this event has closed." };
  }

  const primaryFirstName = getString(formData, "primaryFirstName");
  const primaryLastName = getString(formData, "primaryLastName");
  const primaryEmail = getOptionalString(formData, "primaryEmail");
  const attendeeKeys = getAttendeeKeys(formData);
  const attendeesToCreate = attendeeKeys
    .map((key) => ({
      key,
      firstName: getString(formData, `attendeeFirstName-${key}`),
      lastName: getOptionalString(formData, `attendeeLastName-${key}`),
      email: getOptionalString(formData, `attendeeEmail-${key}`),
      phone: getOptionalString(formData, `attendeePhone-${key}`),
      ageGroup: (getString(formData, `ageGroup-${key}`) || "unknown") as AgeGroup
    }))
    .filter((attendee) => attendee.firstName);

  if (!primaryFirstName || !primaryLastName) {
    return { error: "Please enter the primary contact's first and last name." };
  }

  if (attendeesToCreate.length === 0) {
    return { error: "Add at least one attendee with a first name." };
  }

  if (primaryEmail && !looksLikeEmail(primaryEmail)) {
    return { error: "Please enter a valid email address for the primary contact." };
  }

  const invalidAttendeeEmail = attendeesToCreate.find(
    (attendee) => attendee.email && !looksLikeEmail(attendee.email)
  );
  if (invalidAttendeeEmail) {
    return { error: "Please check the attendee email addresses. One does not look valid." };
  }

  if (event.capacity !== null) {
    const activeAttendees = await prisma.attendee.count({
      where: { eventId, status: "active" }
    });
    const remaining = event.capacity - activeAttendees;

    if (remaining <= 0) {
      return { error: "This event is full. No spots remain." };
    }

    if (attendeesToCreate.length > remaining) {
      return {
        error: `Only ${remaining} ${remaining === 1 ? "spot remains" : "spots remain"} for this event. Please remove some attendees.`
      };
    }
  }

  const registration = await prisma.$transaction(async (tx) => {
    const createdRegistration = await tx.registration.create({
      data: {
        eventId,
        primaryFirstName,
        primaryLastName,
        primaryEmail,
        primaryPhone: getOptionalString(formData, "primaryPhone"),
        status: event.isPaid ? "submitted" : "complete",
        paymentStatus: event.isPaid ? "pending" : "not_required",
        submittedAt: new Date(),
        completedAt: event.isPaid ? null : new Date()
      }
    });

    const createdAttendees = [];
    for (const attendee of attendeesToCreate) {
      const createdAttendee = await tx.attendee.create({
        data: {
          eventId,
          registrationId: createdRegistration.id,
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          email: attendee.email,
          phone: attendee.phone,
          ageGroup: attendee.ageGroup
        }
      });

      createdAttendees.push({ ...createdAttendee, formKey: attendee.key });
    }

    const answerData = [];
    for (const question of event.questions) {
      if (question.scope === "registration") {
        const fieldName = `question-${question.id}`;
        const rawValue = getString(formData, fieldName);
        const checkboxChecked = formData.get(fieldName) === "on";
        const isBooleanType = question.questionType === "checkbox" || question.questionType === "waiver";

        if (!rawValue && !checkboxChecked && !question.isRequired) {
          continue;
        }

        const selectedOption = question.options.find((option) => option.id === rawValue);

        answerData.push({
          registrationId: createdRegistration.id,
          attendeeId: null,
          questionId: question.id,
          optionId: selectedOption?.id ?? null,
          valueText: selectedOption ? selectedOption.label : isBooleanType ? null : rawValue || null,
          valueBoolean: isBooleanType ? checkboxChecked : null,
          valueDate: question.questionType === "date" ? getOptionalDate(formData, fieldName) : null
        });
        continue;
      }

      for (const attendee of createdAttendees) {
        const fieldName = `attendeeQuestion-${question.id}-${attendee.formKey}`;
      const rawValue = getString(formData, fieldName);
      const checkboxChecked = formData.get(fieldName) === "on";
      const isBooleanType = question.questionType === "checkbox" || question.questionType === "waiver";

      if (!rawValue && !checkboxChecked && !question.isRequired) {
          continue;
      }

      const selectedOption = question.options.find((option) => option.id === rawValue);

        answerData.push({
        registrationId: createdRegistration.id,
          attendeeId: attendee.id,
        questionId: question.id,
        optionId: selectedOption?.id ?? null,
        valueText: selectedOption ? selectedOption.label : isBooleanType ? null : rawValue || null,
        valueBoolean: isBooleanType ? checkboxChecked : null,
        valueDate: question.questionType === "date" ? getOptionalDate(formData, fieldName) : null
        });
      }
    }

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

  await generateEventCounts(prisma, eventId);

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  redirect(`/register/${eventId}/confirmation/${registration.id}`);
}
