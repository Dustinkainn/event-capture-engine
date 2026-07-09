import { CountSourceFilter, Prisma, type PrismaClient } from "@prisma/client";

type CountPrisma = PrismaClient;

const attendanceCategoryName = "Attendance";

async function ensureAttendanceCategory(prisma: CountPrisma, eventId: string) {
  const existing = await prisma.countCategory.findFirst({
    where: { eventId, sourceType: "check_in", name: attendanceCategoryName },
    include: { items: true }
  });

  if (existing) {
    const missingItems = [
      ...(existing.items.some((item) => item.value === "registered")
        ? []
        : [{ countCategoryId: existing.id, label: "Registered", value: "registered", displayOrder: 1 }]),
      ...(existing.items.some((item) => item.value === "checked_in")
        ? []
        : [{ countCategoryId: existing.id, label: "Checked In", value: "checked_in", displayOrder: 2 }])
    ];

    if (missingItems.length === 0) {
      return existing;
    }

    await prisma.countItem.createMany({ data: missingItems });

    return prisma.countCategory.findFirstOrThrow({
      where: { id: existing.id },
      include: { items: true }
    });
  }

  return prisma.countCategory.create({
    data: {
      eventId,
      name: attendanceCategoryName,
      sourceType: "check_in",
      displayOrder: 0,
      items: {
        create: [
          { label: "Registered", value: "registered", displayOrder: 1 },
          { label: "Checked In", value: "checked_in", displayOrder: 2 }
        ]
      }
    },
    include: { items: true }
  });
}

export async function generateEventCounts(prisma: CountPrisma, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new Error("Event could not be found.");
  }

  const attendanceCategory = await ensureAttendanceCategory(prisma, eventId);

  const categories = await prisma.countCategory.findMany({
    where: { eventId },
    include: {
      items: {
        include: {
          countMappings: true
        }
      }
    }
  });

  const answers = await prisma.registrationAnswer.findMany({
    where: {
      registration: {
        eventId,
        status: "complete"
      }
    },
    select: {
      questionId: true,
      optionId: true,
      attendeeId: true,
      registrationId: true
    }
  });

  const attendees = await prisma.attendee.findMany({
    where: { eventId, status: "active" },
    select: {
      id: true,
      registrationId: true,
      checkInStatus: true
    }
  });

  const checkedInAttendees = attendees.filter((attendee) => attendee.checkInStatus === "checked_in");
  const checkedInAttendeeIds = new Set(checkedInAttendees.map((attendee) => attendee.id));
  const checkedInRegistrationIds = new Set(checkedInAttendees.map((attendee) => attendee.registrationId));

  const isCheckedInAnswer = (answer: (typeof answers)[number]) =>
    answer.attendeeId
      ? checkedInAttendeeIds.has(answer.attendeeId)
      : checkedInRegistrationIds.has(answer.registrationId);

  const generatedAt = new Date();
  const rows: Prisma.GeneratedCountCreateManyInput[] = [];

  for (const category of categories) {
    if (category.id === attendanceCategory.id) {
      continue;
    }

    for (const item of category.items) {
      let completeTotal = 0;
      let checkedInTotal = 0;

      for (const mapping of item.countMappings) {
        const matches = answers.filter((answer) => {
          if (answer.questionId !== mapping.questionId) {
            return false;
          }

          return mapping.optionId ? answer.optionId === mapping.optionId : true;
        });

        completeTotal += matches.length * mapping.quantity;
        checkedInTotal += matches.filter(isCheckedInAnswer).length * mapping.quantity;
      }

      rows.push({
        eventId,
        countCategoryId: category.id,
        countItemId: item.id,
        total: completeTotal,
        sourceFilter: CountSourceFilter.complete,
        generatedAt
      });

      if (item.countMappings.length > 0) {
        rows.push({
          eventId,
          countCategoryId: category.id,
          countItemId: item.id,
          total: checkedInTotal,
          sourceFilter: CountSourceFilter.checked_in,
          generatedAt
        });
      }
    }
  }

  const registeredItem = attendanceCategory.items.find((item) => item.value === "registered");
  const checkedInItem = attendanceCategory.items.find((item) => item.value === "checked_in");

  if (registeredItem) {
    rows.push({
      eventId,
      countCategoryId: attendanceCategory.id,
      countItemId: registeredItem.id,
      total: attendees.length,
      sourceFilter: CountSourceFilter.registered,
      generatedAt
    });
  }

  if (checkedInItem) {
    rows.push({
      eventId,
      countCategoryId: attendanceCategory.id,
      countItemId: checkedInItem.id,
      total: checkedInAttendees.length,
      sourceFilter: CountSourceFilter.checked_in,
      generatedAt
    });
  }

  await prisma.$transaction([
    prisma.generatedCount.deleteMany({
      where: { eventId }
    }),
    ...(rows.length > 0
      ? [
          prisma.generatedCount.createMany({
            data: rows
          })
        ]
      : [])
  ]);

  return rows;
}
