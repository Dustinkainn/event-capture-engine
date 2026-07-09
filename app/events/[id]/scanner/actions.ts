"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateEventCounts } from "@/lib/counts";
import { prisma } from "@/lib/prisma";

type ScannerResult = "checked-in" | "undo-saved" | "already-checked-in" | "needs-review" | "wrong-event" | "not-found";

function scannerRedirect(eventId: string, result: ScannerResult): never {
  redirect(`/events/${eventId}/scanner?result=${result}`);
}

function stationCookieName(eventId: string) {
  return `ece_station_${eventId}`;
}

export async function getActiveStationId(eventId: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(stationCookieName(eventId))?.value;
  if (!value) {
    return null;
  }

  const device = await prisma.eventDevice.findFirst({
    where: { id: value, eventId },
    select: { id: true }
  });

  return device?.id ?? null;
}

export async function selectStation(eventId: string, formData: FormData) {
  const deviceId = typeof formData.get("deviceId") === "string" ? (formData.get("deviceId") as string).trim() : "";
  const newStationName =
    typeof formData.get("newStationName") === "string" ? (formData.get("newStationName") as string).trim() : "";

  let stationId: string | null = null;

  if (newStationName) {
    const device = await prisma.eventDevice.create({
      data: { eventId, name: newStationName, deviceType: "scanner", lastSeenAt: new Date() }
    });
    stationId = device.id;
  } else if (deviceId) {
    const device = await prisma.eventDevice.findFirst({ where: { id: deviceId, eventId } });
    if (device) {
      await prisma.eventDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
      stationId = device.id;
    }
  }

  const cookieStore = await cookies();
  if (stationId) {
    cookieStore.set(stationCookieName(eventId), stationId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 });
  } else {
    cookieStore.delete(stationCookieName(eventId));
  }

  revalidatePath(`/events/${eventId}/scanner`);
  redirect(`/events/${eventId}/scanner?result=station-set`);
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

  const stationId = await getActiveStationId(eventId);

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
        deviceId: stationId,
        action: "check_in",
        checkedInAt: new Date()
      }
    }),
    ...(stationId
      ? [prisma.eventDevice.update({ where: { id: stationId }, data: { lastSeenAt: new Date() } })]
      : []),
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

  await generateEventCounts(prisma, eventId);

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/counts`);
  revalidatePath(`/events/${eventId}/scanner`);
  scannerRedirect(eventId, "checked-in");
}

export async function checkInToken(eventId: string, formData: FormData) {
  const tokenValue = formData.get("token");
  const tokenHash = typeof tokenValue === "string" ? tokenValue.trim() : "";

  if (!tokenHash) {
    scannerRedirect(eventId, "not-found");
  }

  const token = await prisma.qrToken.findUnique({
    where: { tokenHash },
    include: {
      registration: {
        include: {
          attendees: true
        }
      }
    }
  });

  if (!token) {
    scannerRedirect(eventId, "not-found");
  }

  if (token.eventId !== eventId) {
    scannerRedirect(eventId, "wrong-event");
  }

  if (token.registration.status !== "complete") {
    scannerRedirect(eventId, "needs-review");
  }

  const activeAttendees = token.registration.attendees.filter((attendee) => attendee.status === "active");
  const attendeesToCheckIn = activeAttendees.filter((attendee) => attendee.checkInStatus !== "checked_in");

  if (activeAttendees.length === 0 || attendeesToCheckIn.length === 0 || token.status === "used") {
    scannerRedirect(eventId, "already-checked-in");
  }

  const checkedInAt = new Date();
  const stationId = await getActiveStationId(eventId);

  await prisma.$transaction([
    prisma.attendee.updateMany({
      where: {
        id: { in: attendeesToCheckIn.map((attendee) => attendee.id) }
      },
      data: { checkInStatus: "checked_in" }
    }),
    prisma.checkIn.createMany({
      data: attendeesToCheckIn.map((attendee) => ({
        eventId,
        registrationId: token.registrationId,
        attendeeId: attendee.id,
        qrTokenId: token.id,
        deviceId: stationId,
        action: "check_in",
        checkedInAt
      }))
    }),
    prisma.qrToken.update({
      where: { id: token.id },
      data: {
        status: "used",
        usedAt: checkedInAt
      }
    }),
    ...(stationId
      ? [prisma.eventDevice.update({ where: { id: stationId }, data: { lastSeenAt: new Date() } })]
      : []),
    prisma.syncQueueItem.create({
      data: {
        eventId,
        recordType: "check_in",
        recordId: token.registrationId,
        status: "ready",
        attempts: 0
      }
    })
  ]);

  await generateEventCounts(prisma, eventId);

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/counts`);
  revalidatePath(`/events/${eventId}/scanner`);
  scannerRedirect(eventId, "checked-in");
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

  const stationId = await getActiveStationId(eventId);

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
        deviceId: stationId,
        action: "undo",
        checkedInAt: new Date(),
        notes: "Undone from scanner"
      }
    })
  ]);

  await generateEventCounts(prisma, eventId);

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/counts`);
  revalidatePath(`/events/${eventId}/scanner`);
  scannerRedirect(eventId, "undo-saved");
}
