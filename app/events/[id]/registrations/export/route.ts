import { prisma } from "@/lib/prisma";

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function isoOrEmpty(date: Date | null | undefined) {
  return date ? date.toISOString() : "";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const columns = [
  "Registration ID",
  "Primary First Name",
  "Primary Last Name",
  "Primary Email",
  "Primary Phone",
  "Registration Status",
  "Payment Status",
  "Submitted At",
  "Attendee First Name",
  "Attendee Last Name",
  "Attendee Email",
  "Attendee Phone",
  "Age Group",
  "Attendee Status",
  "Check-In Status"
];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { createdAt: "asc" },
        include: {
          attendees: {
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
          }
        }
      }
    }
  });

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  const rows: string[] = [columns.map(csvCell).join(",")];

  for (const registration of event.registrations) {
    const base = [
      registration.id,
      registration.primaryFirstName,
      registration.primaryLastName,
      registration.primaryEmail,
      registration.primaryPhone,
      registration.status,
      registration.paymentStatus,
      isoOrEmpty(registration.submittedAt)
    ];

    if (registration.attendees.length === 0) {
      rows.push([...base, "", "", "", "", "", "", ""].map(csvCell).join(","));
      continue;
    }

    for (const attendee of registration.attendees) {
      rows.push(
        [
          ...base,
          attendee.firstName,
          attendee.lastName,
          attendee.email,
          attendee.phone,
          attendee.ageGroup ?? "",
          attendee.status,
          attendee.checkInStatus
        ]
          .map(csvCell)
          .join(",")
      );
    }
  }

  const csv = `${rows.join("\r\n")}\r\n`;
  const filename = `${slugify(event.name) || "event"}-registrations.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
