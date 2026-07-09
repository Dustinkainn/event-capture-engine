import { notFound } from "next/navigation";
import { formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { EventWorkspaceNav } from "../EventWorkspaceNav";
import { AppTopbar } from "../../../AppTopbar";
import { AttendeeSearch, type AttendeeRow } from "./AttendeeSearch";

export const dynamic = "force-dynamic";

type AttendeesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AttendeesPage({ params }: AttendeesPageProps) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendees: {
        include: { registration: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
      }
    }
  });

  if (!event) {
    notFound();
  }

  const activeAttendees = event.attendees.filter((attendee) => attendee.status === "active");
  const checkedIn = activeAttendees.filter((attendee) => attendee.checkInStatus === "checked_in");

  const rows: AttendeeRow[] = event.attendees.map((attendee) => ({
    id: attendee.id,
    name: `${attendee.firstName} ${attendee.lastName ?? ""}`.trim(),
    registrantName: `${attendee.registration.primaryFirstName} ${attendee.registration.primaryLastName}`,
    email: attendee.email,
    phone: attendee.phone,
    ageGroupLabel: attendee.ageGroup ? formatStatus(attendee.ageGroup) : "Unknown",
    statusLabel: formatStatus(attendee.status),
    checkInLabel: formatStatus(attendee.checkInStatus)
  }));

  return (
    <main className="pageShell">
      <AppTopbar active="events" eyebrow="Attendees" title={event.name} />
      <EventWorkspaceNav active="attendees" eventId={event.id} />

      <section className="section">
        <div className="metricGrid">
          <article className="metric">
            <span>Total Attendees</span>
            <strong>{event.attendees.length}</strong>
            <small>All registered attendee records</small>
          </article>
          <article className="metric">
            <span>Active</span>
            <strong>{activeAttendees.length}</strong>
            <small>Expected for this event</small>
          </article>
          <article className="metric">
            <span>Checked In</span>
            <strong>{checkedIn.length}</strong>
            <small>Current event-day progress</small>
          </article>
          <article className="metric">
            <span>Not Checked In</span>
            <strong>{activeAttendees.length - checkedIn.length}</strong>
            <small>Active and not yet arrived</small>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="panel">
          <div className="panelHeading">
            <h2>Attendee Search</h2>
            <span className="statusPill">{event.attendees.length} total</span>
          </div>
          {event.attendees.length === 0 ? (
            <div className="emptyState">
              <strong>No attendees yet</strong>
              <span>Attendees appear here once registrations come in.</span>
            </div>
          ) : (
            <AttendeeSearch attendees={rows} />
          )}
        </article>
      </section>
    </main>
  );
}
