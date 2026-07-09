import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { EventWorkspaceNav } from "../EventWorkspaceNav";
import { AppTopbar } from "../../../AppTopbar";

export const dynamic = "force-dynamic";

type CheckInLogPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string }>;
};

const attendanceFilters = [
  { key: "all", label: "All Attendees" },
  { key: "checked-in", label: "Checked In" },
  { key: "not-checked-in", label: "Not Checked In" },
  { key: "needs-review", label: "Needs Review" }
] as const;

type AttendanceFilterKey = (typeof attendanceFilters)[number]["key"];

export default async function CheckInLogPage({ params, searchParams }: CheckInLogPageProps) {
  const { id } = await params;
  const { show } = await searchParams;
  const activeFilter: AttendanceFilterKey = attendanceFilters.some((filter) => filter.key === show)
    ? (show as AttendanceFilterKey)
    : "all";

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendees: {
        include: { registration: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
      },
      checkIns: {
        include: {
          attendee: true,
          registration: true,
          staffUser: true,
          device: true
        },
        orderBy: [{ checkedInAt: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!event) {
    notFound();
  }

  const needsReview = (attendee: (typeof event.attendees)[number]) =>
    attendee.status !== "active" || attendee.registration.status !== "complete";

  const activeAttendees = event.attendees.filter((attendee) => attendee.status === "active");
  const checkedIn = activeAttendees.filter((attendee) => attendee.checkInStatus === "checked_in");
  const notCheckedIn = event.attendees.filter(
    (attendee) => !needsReview(attendee) && attendee.checkInStatus !== "checked_in"
  );
  const reviewAttendees = event.attendees.filter(needsReview);
  const undoCount = event.checkIns.filter((checkIn) => checkIn.action === "undo").length;

  const latestActivity = new Map<string, Date>();
  for (const checkIn of event.checkIns) {
    if (checkIn.attendeeId && !latestActivity.has(checkIn.attendeeId)) {
      latestActivity.set(checkIn.attendeeId, checkIn.checkedInAt);
    }
  }

  const filteredAttendees =
    activeFilter === "checked-in"
      ? event.attendees.filter((attendee) => attendee.checkInStatus === "checked_in")
      : activeFilter === "not-checked-in"
        ? notCheckedIn
        : activeFilter === "needs-review"
          ? reviewAttendees
          : event.attendees;

  return (
    <main className="pageShell">
      <AppTopbar
        active="events"
        eyebrow="Check-In Log"
        title={event.name}
        actions={<a className="secondaryButton" href={`/events/${event.id}/scanner`}>Open Scanner</a>}
      />
      <EventWorkspaceNav active="check-in-log" eventId={event.id} />

      <section className="section">
        <div className="metricGrid">
          <article className="metric">
            <span>Registered</span>
            <strong>{activeAttendees.length}</strong>
            <small>Active attendees for this event</small>
          </article>
          <article className="metric">
            <span>Checked In</span>
            <strong>{checkedIn.length}</strong>
            <small>{activeAttendees.length > 0 ? `${Math.round((checkedIn.length / activeAttendees.length) * 100)}% of registered` : "No attendees yet"}</small>
          </article>
          <article className="metric">
            <span>Not Checked In</span>
            <strong>{notCheckedIn.length}</strong>
            <small>Approved and expected</small>
          </article>
          <article className="metric">
            <span>Corrections</span>
            <strong>{undoCount}</strong>
            <small>Check-ins undone by staff</small>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="panel">
          <div className="panelHeading">
            <h2>Attendance Review</h2>
            <span className="statusPill">{filteredAttendees.length} shown</span>
          </div>

          <div className="filterBar">
            {attendanceFilters.map((filter) => (
              <a
                className={activeFilter === filter.key ? "active" : undefined}
                href={`/events/${event.id}/checkins${filter.key === "all" ? "" : `?show=${filter.key}`}`}
                key={filter.key}
              >
                {filter.label}
              </a>
            ))}
          </div>

          <div className="attendanceList">
            {filteredAttendees.length === 0 ? (
              <div className="emptyState">
                <strong>No attendees match this view</strong>
                <span>Try another filter, or check the registration review page.</span>
              </div>
            ) : filteredAttendees.map((attendee) => {
              const review = needsReview(attendee);
              const rowClass = review ? "warn" : attendee.checkInStatus === "checked_in" ? "ok" : undefined;
              const lastSeen = latestActivity.get(attendee.id);

              return (
                <div className={`attendanceRow${rowClass ? ` ${rowClass}` : ""}`} key={attendee.id}>
                  <div>
                    <strong>{attendee.firstName} {attendee.lastName ?? ""}</strong>
                    <span>
                      Registered by {attendee.registration.primaryFirstName} {attendee.registration.primaryLastName}
                      {review ? ` | ${formatStatus(attendee.registration.status)} registration` : ""}
                      {attendee.status !== "active" ? ` | ${formatStatus(attendee.status)} attendee` : ""}
                    </span>
                  </div>
                  <small>
                    {formatStatus(attendee.checkInStatus)}
                    {lastSeen ? <span>{formatEventDateTime(lastSeen)}</span> : null}
                  </small>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="section">
        <article className="panel">
          <div className="panelHeading">
            <h2>Activity Log</h2>
            <span className="statusPill">{event.checkIns.length} entries</span>
          </div>

          <div className="logList">
            {event.checkIns.length === 0 ? (
              <div className="emptyState">
                <strong>No check-in activity yet</strong>
                <span>Every scan, manual check-in, and undo will appear here in time order.</span>
              </div>
            ) : event.checkIns.map((checkIn) => {
              const isUndo = checkIn.action === "undo";
              const method = isUndo ? "Staff correction" : checkIn.qrTokenId ? "QR scan" : "Manual entry";

              return (
                <div className={`logRow${isUndo ? " warn" : ""}`} key={checkIn.id}>
                  <div>
                    <strong>
                      {checkIn.attendee
                        ? `${checkIn.attendee.firstName} ${checkIn.attendee.lastName ?? ""}`
                        : `${checkIn.registration.primaryFirstName} ${checkIn.registration.primaryLastName} (registration)`}
                    </strong>
                    <span>
                      {isUndo ? "Check-in undone" : "Checked in"} | {method}
                      {checkIn.staffUser ? ` | ${checkIn.staffUser.displayName}` : ""}
                      {checkIn.device ? ` | ${checkIn.device.name}` : ""}
                    </span>
                    {checkIn.notes ? <span>{checkIn.notes}</span> : null}
                  </div>
                  <em>{formatEventDateTime(checkIn.checkedInAt)}</em>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
