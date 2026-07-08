"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type ScannerResult = "checked-in" | "undo-saved" | "already-checked-in" | "needs-review" | "not-found";

function scannerRedirect(eventId: string, result: ScannerResult): never {
  redirect(`/events/${eventId}/scanner?result=${result}`);
}

export async function checkInAttendee(eventId: string, attendeeId: string) {
  const attendee = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    include: {
      registration: true
    }
  });

  if (!attendee || attendee.eventId !== eventId) {
    scannerRedirect(eventId, "not-found");
  }

  if (attendee.status !== "active" || attendee.registration.status !== "complete") {
    scannerRedirect(eventId, "needs-review");
  }

  if (attendee.checkInStatus === "checked_in") {
    scannerRedirect(eventId, "already-checked-in");
  }

  await prisma.$transaction([
    prisma.attendee.update({
      where: { id: attendee.id },
      data: { checkInStatus: "checked_in" }
    }),
    prisma.checkIn.create({
      data: {
        eventId,
        registrationId: attendee.registrationId,
        attendeeId: attendee.id,
        action: "check_in",
        checkedInAt: new Date()
      }
    }),
    prisma.syncQueueItem.create({
      data: {
        eventId,
        recordType: "check_in",
        recordId: attendee.id,
        status: "ready",
        attempts: 0
      }
    })
  ]);

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/scanner`);
  scannerRedirect(eventId, "undo-saved");
}

export async function undoLatestCheckIn(eventId: string) {
  const latestCheckIn = await prisma.checkIn.findFirst({
    where: {
      eventId,
      action: "check_in",
      attendeeId: { not: null }
    },
    orderBy: { checkedInAt: "desc" }
  });

  if (!latestCheckIn?.attendeeId) {
    scannerRedirect(eventId, "not-found");
  }

  await prisma.$transaction([
    prisma.attendee.update({
      where: { id: latestCheckIn.attendeeId },
      data: { checkInStatus: "not_checked_in" }
    }),
    prisma.checkIn.create({
      data: {
        eventId,
        registrationId: latestCheckIn.registrationId,
        attendeeId: latestCheckIn.attendeeId,
        action: "undo",
        checkedInAt: new Date(),
        notes: "Undone from scanner"
      }
    })
  ]);

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/scanner`);
  scannerRedirect(eventId, "checked-in");
}
