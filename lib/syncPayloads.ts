import { PrismaClient, SyncRecordType } from "@prisma/client";

type SyncPrisma = PrismaClient;

type SyncPayloadResult = {
  payloadJson: string | null;
  errorMessage: string | null;
};

function stringifyPayload(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}

function buildAnswerValue(answer: {
  option: { label: string; value: string } | null;
  valueText: string | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
  valueJson: string | null;
}) {
  if (answer.option) {
    return { label: answer.option.label, value: answer.option.value };
  }

  if (answer.valueBoolean !== null) {
    return answer.valueBoolean;
  }

  if (answer.valueDate) {
    return answer.valueDate.toISOString();
  }

  if (answer.valueJson) {
    try {
      return JSON.parse(answer.valueJson);
    } catch {
      return answer.valueJson;
    }
  }

  return answer.valueText;
}

async function buildRegistrationPayload(prisma: SyncPrisma, recordId: string): Promise<SyncPayloadResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: recordId },
    include: {
      event: true,
      attendees: {
        include: {
          answers: {
            include: {
              option: true,
              question: true
            },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
      },
      answers: {
        include: {
          attendee: true,
          option: true,
          question: true
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!registration) {
    return { payloadJson: null, errorMessage: "Registration could not be found." };
  }

  if (registration.status !== "complete") {
    return { payloadJson: null, errorMessage: "Registration must be complete before it can sync." };
  }

  const payload = {
    schemaVersion: 1,
    destination: "external-system-placeholder",
    recordType: "registration",
    localIds: {
      eventId: registration.eventId,
      registrationId: registration.id
    },
    event: {
      name: registration.event.name,
      startsAt: registration.event.startsAt.toISOString(),
      locationName: registration.event.locationName
    },
    primaryContact: {
      firstName: registration.primaryFirstName,
      lastName: registration.primaryLastName,
      email: registration.primaryEmail,
      phone: registration.primaryPhone
    },
    registration: {
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      submittedAt: registration.submittedAt?.toISOString() ?? null,
      completedAt: registration.completedAt?.toISOString() ?? null
    },
    attendees: registration.attendees.map((attendee) => ({
      localId: attendee.id,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email,
      phone: attendee.phone,
      ageGroup: attendee.ageGroup,
      status: attendee.status,
      checkInStatus: attendee.checkInStatus,
      answers: attendee.answers.map((answer) => ({
        question: answer.question.label,
        type: answer.question.questionType,
        value: buildAnswerValue(answer)
      }))
    })),
    registrationAnswers: registration.answers
      .filter((answer) => !answer.attendeeId)
      .map((answer) => ({
        question: answer.question.label,
        type: answer.question.questionType,
        value: buildAnswerValue(answer)
      }))
  };

  return { payloadJson: stringifyPayload(payload), errorMessage: null };
}

async function buildCheckInPayload(prisma: SyncPrisma, recordId: string): Promise<SyncPayloadResult> {
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: recordId },
    include: {
      attendee: true,
      device: true,
      event: true,
      registration: true
    }
  });

  if (!checkIn) {
    const attendee = await prisma.attendee.findUnique({
      where: { id: recordId },
      include: {
        event: true,
        registration: true,
        checkIns: {
          include: { device: true },
          orderBy: { checkedInAt: "desc" },
          take: 1
        }
      }
    });

    if (!attendee) {
      return { payloadJson: null, errorMessage: "Check-in record could not be found." };
    }

    const latest = attendee.checkIns[0] ?? null;
    const payload = {
      schemaVersion: 1,
      destination: "external-system-placeholder",
      recordType: "check_in",
      localIds: {
        eventId: attendee.eventId,
        attendeeId: attendee.id,
        registrationId: attendee.registrationId,
        checkInId: latest?.id ?? null
      },
      event: {
        name: attendee.event.name,
        startsAt: attendee.event.startsAt.toISOString()
      },
      attendee: {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        checkInStatus: attendee.checkInStatus
      },
      registration: {
        primaryFirstName: attendee.registration.primaryFirstName,
        primaryLastName: attendee.registration.primaryLastName
      },
      checkIn: latest
        ? {
            action: latest.action,
            checkedInAt: latest.checkedInAt.toISOString(),
            station: latest.device?.name ?? null
          }
        : null
    };

    return { payloadJson: stringifyPayload(payload), errorMessage: null };
  }

  const payload = {
    schemaVersion: 1,
    destination: "external-system-placeholder",
    recordType: "check_in",
    localIds: {
      eventId: checkIn.eventId,
      attendeeId: checkIn.attendeeId,
      registrationId: checkIn.registrationId,
      checkInId: checkIn.id
    },
    event: {
      name: checkIn.event.name,
      startsAt: checkIn.event.startsAt.toISOString()
    },
    attendee: checkIn.attendee
      ? {
          firstName: checkIn.attendee.firstName,
          lastName: checkIn.attendee.lastName,
          checkInStatus: checkIn.attendee.checkInStatus
        }
      : null,
    registration: {
      primaryFirstName: checkIn.registration.primaryFirstName,
      primaryLastName: checkIn.registration.primaryLastName
    },
    checkIn: {
      action: checkIn.action,
      checkedInAt: checkIn.checkedInAt.toISOString(),
      station: checkIn.device?.name ?? null
    }
  };

  return { payloadJson: stringifyPayload(payload), errorMessage: null };
}

async function buildCountPayload(prisma: SyncPrisma, recordId: string): Promise<SyncPayloadResult> {
  const count = await prisma.generatedCount.findUnique({
    where: { id: recordId },
    include: {
      countCategory: true,
      countItem: true,
      event: true
    }
  });

  if (!count) {
    return { payloadJson: null, errorMessage: "Count record could not be found." };
  }

  const payload = {
    schemaVersion: 1,
    destination: "external-system-placeholder",
    recordType: "count",
    localIds: {
      eventId: count.eventId,
      countId: count.id,
      countCategoryId: count.countCategoryId,
      countItemId: count.countItemId
    },
    event: {
      name: count.event.name,
      startsAt: count.event.startsAt.toISOString()
    },
    count: {
      category: count.countCategory.name,
      item: count.countItem?.label ?? null,
      sourceFilter: count.sourceFilter,
      total: count.total,
      generatedAt: count.generatedAt.toISOString()
    }
  };

  return { payloadJson: stringifyPayload(payload), errorMessage: null };
}

export async function buildSyncPayload(prisma: SyncPrisma, recordType: SyncRecordType, recordId: string) {
  if (recordType === "registration") {
    return buildRegistrationPayload(prisma, recordId);
  }

  if (recordType === "check_in" || recordType === "attendee") {
    return buildCheckInPayload(prisma, recordId);
  }

  if (recordType === "count") {
    return buildCountPayload(prisma, recordId);
  }

  return { payloadJson: null, errorMessage: "This sync record type is not supported yet." };
}
