import { CountSourceFilter, type PrismaClient } from "@prisma/client";

type CountPrisma = PrismaClient;

export async function generateEventCounts(prisma: CountPrisma, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      countCategories: {
        include: {
          items: {
            include: {
              countMappings: true
            }
          }
        }
      }
    }
  });

  if (!event) {
    throw new Error("Event could not be found.");
  }

  const answers = await prisma.registrationAnswer.findMany({
    where: {
      registration: {
        eventId,
        status: "complete"
      }
    },
    select: {
      questionId: true,
      optionId: true
    }
  });

  const generatedAt = new Date();
  const rows = event.countCategories.flatMap((category) =>
    category.items.map((item) => {
      const total = item.countMappings.reduce((sum, mapping) => {
        const matches = answers.filter((answer) => {
          if (answer.questionId !== mapping.questionId) {
            return false;
          }

          return mapping.optionId ? answer.optionId === mapping.optionId : true;
        });

        return sum + matches.length * mapping.quantity;
      }, 0);

      return {
        eventId,
        countCategoryId: category.id,
        countItemId: item.id,
        total,
        sourceFilter: CountSourceFilter.complete,
        generatedAt
      };
    })
  );

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
