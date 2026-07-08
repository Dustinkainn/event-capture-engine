const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.syncQueueItem.deleteMany();
  await prisma.generatedCount.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.qrToken.deleteMany();
  await prisma.questionCountMapping.deleteMany();
  await prisma.registrationAnswer.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.registrationQuestion.deleteMany();
  await prisma.countItem.deleteMany();
  await prisma.countCategory.deleteMany();
  await prisma.attendee.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.eventDevice.deleteMany();
  await prisma.staffUser.deleteMany();
  await prisma.event.deleteMany();

  const spring = await prisma.event.create({
    data: {
      name: "Spring Volunteer Rally",
      startsAt: new Date("2027-04-18T18:30:00-04:00"),
      endsAt: new Date("2027-04-18T20:30:00-04:00"),
      locationName: "Main Campus Auditorium",
      description: "Equip volunteers, collect meal counts, and confirm ministry area assignments.",
      capacity: 220,
      registrationOpensAt: new Date("2027-02-01T09:00:00-05:00"),
      registrationClosesAt: new Date("2027-04-16T17:00:00-04:00"),
      isPaid: false,
      visibility: "public",
      status: "open",
      internalNotes: "Confirm childcare room staffing before final reminder email."
    }
  });

  await prisma.event.createMany({
    data: [
      {
        name: "Family Picnic",
        startsAt: new Date("2027-05-09T12:00:00-04:00"),
        locationName: "East Lawn",
        capacity: 300,
        isPaid: false,
        visibility: "private",
        status: "draft"
      },
      {
        name: "Youth Retreat",
        startsAt: new Date("2027-06-03T16:00:00-04:00"),
        locationName: "Retreat Center",
        capacity: 120,
        isPaid: true,
        visibility: "public",
        status: "open"
      }
    ]
  });

  const [admin, reviewer, operator] = await Promise.all([
    prisma.staffUser.create({
      data: {
        displayName: "Taylor Reed",
        email: "taylor@example.com",
        role: "admin"
      }
    }),
    prisma.staffUser.create({
      data: {
        displayName: "Jordan Miles",
        email: "jordan@example.com",
        role: "staff"
      }
    }),
    prisma.staffUser.create({
      data: {
        displayName: "Sam Carter",
        role: "volunteer"
      }
    })
  ]);

  await prisma.eventDevice.create({
    data: {
      eventId: spring.id,
      name: "Front Door iPad",
      deviceType: "tablet",
      activeStaffUserId: operator.id,
      lastSeenAt: new Date("2027-04-18T18:04:00-04:00")
    }
  });

  const mealQuestion = await prisma.registrationQuestion.create({
    data: {
      eventId: spring.id,
      label: "Meal selection",
      questionType: "dropdown",
      scope: "attendee",
      isRequired: true,
      displayOrder: 1,
      options: {
        create: [
          { label: "Chicken", value: "chicken", displayOrder: 1 },
          { label: "Vegetarian", value: "vegetarian", displayOrder: 2 },
          { label: "No meal", value: "no_meal", displayOrder: 3 }
        ]
      }
    },
    include: { options: true }
  });

  const shirtQuestion = await prisma.registrationQuestion.create({
    data: {
      eventId: spring.id,
      label: "Shirt size",
      questionType: "dropdown",
      scope: "attendee",
      isRequired: true,
      displayOrder: 2,
      options: {
        create: [
          { label: "Adult M", value: "adult_m", displayOrder: 1 },
          { label: "Adult L", value: "adult_l", displayOrder: 2 },
          { label: "Youth", value: "youth", displayOrder: 3 }
        ]
      }
    },
    include: { options: true }
  });

  const childcareQuestion = await prisma.registrationQuestion.create({
    data: {
      eventId: spring.id,
      label: "Childcare needed",
      questionType: "dropdown",
      scope: "attendee",
      isRequired: false,
      displayOrder: 3,
      options: {
        create: [
          { label: "Needed", value: "needed", displayOrder: 1 },
          { label: "Not needed", value: "not_needed", displayOrder: 2 }
        ]
      }
    },
    include: { options: true }
  });

  const mealCategory = await prisma.countCategory.create({
    data: {
      eventId: spring.id,
      name: "Meals",
      sourceType: "answer",
      displayOrder: 1,
      items: {
        create: [
          { label: "Chicken meals", value: "chicken", displayOrder: 1 },
          { label: "Vegetarian meals", value: "vegetarian", displayOrder: 2 },
          { label: "No meal", value: "no_meal", displayOrder: 3 }
        ]
      }
    },
    include: { items: true }
  });

  const childcareCategory = await prisma.countCategory.create({
    data: {
      eventId: spring.id,
      name: "Childcare",
      sourceType: "answer",
      displayOrder: 2,
      items: {
        create: [
          { label: "Childcare needed", value: "needed", displayOrder: 1 }
        ]
      }
    },
    include: { items: true }
  });

  const shirtCategory = await prisma.countCategory.create({
    data: {
      eventId: spring.id,
      name: "Shirts",
      sourceType: "answer",
      displayOrder: 3,
      items: {
        create: [
          { label: "Adult M shirts", value: "adult_m", displayOrder: 1 },
          { label: "Adult L shirts", value: "adult_l", displayOrder: 2 },
          { label: "Youth shirts", value: "youth", displayOrder: 3 }
        ]
      }
    },
    include: { items: true }
  });

  const mapByValue = (items) => new Map(items.map((item) => [item.value, item.id]));
  const mealItems = mapByValue(mealCategory.items);
  const shirtItems = mapByValue(shirtCategory.items);
  const childcareItems = mapByValue(childcareCategory.items);

  await prisma.questionCountMapping.createMany({
    data: [
      ...mealQuestion.options.map((option) => ({
        questionId: mealQuestion.id,
        optionId: option.id,
        countItemId: mealItems.get(option.value),
        quantity: 1
      })),
      ...shirtQuestion.options.map((option) => ({
        questionId: shirtQuestion.id,
        optionId: option.id,
        countItemId: shirtItems.get(option.value),
        quantity: 1
      })),
      {
        questionId: childcareQuestion.id,
        optionId: childcareQuestion.options.find((option) => option.value === "needed").id,
        countItemId: childcareItems.get("needed"),
        quantity: 1
      }
    ]
  });

  const createRegistration = async ({
    primaryFirstName,
    primaryLastName,
    status,
    paymentStatus,
    attendees
  }) => {
    return prisma.registration.create({
      data: {
        eventId: spring.id,
        primaryFirstName,
        primaryLastName,
        primaryEmail: `${primaryFirstName.toLowerCase()}@example.com`,
        status,
        paymentStatus,
        submittedAt: new Date("2027-03-12T14:30:00-04:00"),
        completedAt: status === "complete" ? new Date("2027-03-12T14:34:00-04:00") : null,
        attendees: {
          create: attendees
        }
      },
      include: { attendees: true }
    });
  };

  const leeRegistration = await createRegistration({
    primaryFirstName: "Jordan",
    primaryLastName: "Lee",
    status: "complete",
    paymentStatus: "not_required",
    attendees: [
      { eventId: spring.id, firstName: "Jordan", lastName: "Lee", ageGroup: "adult", checkInStatus: "checked_in" },
      { eventId: spring.id, firstName: "Avery", lastName: "Lee", ageGroup: "child", checkInStatus: "checked_in" },
      { eventId: spring.id, firstName: "Morgan", lastName: "Lee", ageGroup: "adult" },
      { eventId: spring.id, firstName: "Riley", lastName: "Lee", ageGroup: "student" }
    ]
  });

  await createRegistration({
    primaryFirstName: "Maria",
    primaryLastName: "Santos",
    status: "incomplete",
    paymentStatus: "pending",
    attendees: [
      { eventId: spring.id, firstName: "Maria", lastName: "Santos", ageGroup: "adult" }
    ]
  });

  await createRegistration({
    primaryFirstName: "North",
    primaryLastName: "Team",
    status: "complete",
    paymentStatus: "comped",
    attendees: Array.from({ length: 12 }, (_, index) => ({
      eventId: spring.id,
      firstName: `North ${index + 1}`,
      lastName: "Team",
      ageGroup: index % 3 === 0 ? "student" : "adult"
    }))
  });

  await prisma.qrToken.create({
    data: {
      eventId: spring.id,
      registrationId: leeRegistration.id,
      tokenHash: "sample-group-token-hash",
      scope: "registration",
      status: "used",
      usedAt: new Date("2027-04-18T18:04:00-04:00")
    }
  });

  await prisma.checkIn.createMany({
    data: leeRegistration.attendees.slice(0, 2).map((attendee) => ({
      eventId: spring.id,
      registrationId: leeRegistration.id,
      attendeeId: attendee.id,
      action: "check_in",
      checkedInAt: new Date("2027-04-18T18:04:00-04:00"),
      staffUserId: operator.id,
      notes: "Seeded event-day check-in"
    }))
  });

  const now = new Date();
  await prisma.generatedCount.createMany({
    data: [
      {
        eventId: spring.id,
        countCategoryId: mealCategory.id,
        countItemId: mealItems.get("chicken"),
        total: 112,
        sourceFilter: "complete",
        generatedAt: now
      },
      {
        eventId: spring.id,
        countCategoryId: mealCategory.id,
        countItemId: mealItems.get("vegetarian"),
        total: 44,
        sourceFilter: "complete",
        generatedAt: now
      },
      {
        eventId: spring.id,
        countCategoryId: childcareCategory.id,
        countItemId: childcareItems.get("needed"),
        total: 37,
        sourceFilter: "complete",
        generatedAt: now
      }
    ]
  });

  await prisma.syncQueueItem.createMany({
    data: [
      {
        eventId: spring.id,
        recordType: "registration",
        recordId: leeRegistration.id,
        status: "ready",
        attempts: 0
      },
      {
        eventId: spring.id,
        recordType: "registration",
        recordId: "review-placeholder",
        status: "review_required",
        attempts: 1,
        errorMessage: "Needs contact match review"
      },
      {
        eventId: spring.id,
        recordType: "check_in",
        recordId: "failed-placeholder",
        status: "failed",
        attempts: 2,
        errorMessage: "Sample failed destination response"
      }
    ]
  });

  console.log(`Seeded ${spring.name} with sample registrations, counts, and access users.`);
  console.log(`Admin user placeholder: ${admin.displayName}`);
  console.log(`Review user placeholder: ${reviewer.displayName}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
