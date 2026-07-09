import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { AppTopbar } from "../AppTopbar";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
    include: {
      attendees: true,
      registrations: true,
      syncQueueItems: true
    }
  });

  return (
    <main className="pageShell">
      <AppTopbar
        active="events"
        eyebrow="Events"
        title="Event List"
        actions={<a className="primaryButton" href="/events/new">New Event</a>}
      />

      <section className="section">
        <div className="metricGrid">
          <article className="metric">
            <span>Total Events</span>
            <strong>{events.length}</strong>
            <small>All active event records</small>
          </article>
          <article className="metric">
            <span>Open Events</span>
            <strong>{events.filter((event) => event.status === "open").length}</strong>
            <small>Accepting registration</small>
          </article>
          <article className="metric">
            <span>Registered Guests</span>
            <strong>{events.reduce((total, event) => total + event.attendees.filter((attendee) => attendee.status === "active").length, 0)}</strong>
            <small>Across all events</small>
          </article>
          <article className="metric">
            <span>Checked In</span>
            <strong>{events.reduce((total, event) => total + event.attendees.filter((attendee) => attendee.checkInStatus === "checked_in").length, 0)}</strong>
            <small>Current event-day total</small>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="panel">
          <div className="panelHeading">
            <h2>All Events</h2>
            <span className="statusPill">{events.length} total</span>
          </div>
          <div className="eventList">
            {events.map((event) => {
              const activeAttendees = event.attendees.filter((attendee) => attendee.status === "active").length;
              const checkedIn = event.attendees.filter((attendee) => attendee.checkInStatus === "checked_in").length;
              const reviewFlags = event.syncQueueItems.filter(
                (item) => item.status === "failed" || item.status === "review_required"
              ).length;
              const completeRegistrations = event.registrations.filter((registration) => registration.status === "complete").length;
              const publicRegistrationOpen = event.status === "open" && event.visibility === "public";

              return (
                <article className="eventDirectoryRow" key={event.id}>
                  <div className="eventDirectoryMain">
                    <a className="rowLink" href={`/events/${event.id}`}>{event.name}</a>
                    <span>{formatEventDateTime(event.startsAt)}</span>
                    <small>{formatStatus(event.visibility)} registration | {formatStatus(event.status)}</small>
                  </div>
                  <div>
                    <b>{activeAttendees}</b>
                    <span>registered</span>
                  </div>
                  <div>
                    <b>{checkedIn}</b>
                    <span>checked in</span>
                  </div>
                  <div>
                    <b>{completeRegistrations}</b>
                    <span>complete</span>
                  </div>
                  <div>
                    <b>{reviewFlags}</b>
                    <span>review</span>
                  </div>
                  <div className="eventLaunchActions">
                    <a className="primaryButton" href={`/events/${event.id}`}>Overview</a>
                    <a className="secondaryButton" href={`/events/${event.id}/scanner`}>Check-In</a>
                    <a className="secondaryButton" href={`/events/${event.id}/registrations`}>Registrations</a>
                    <a className="secondaryButton" href={publicRegistrationOpen ? `/register/${event.id}` : `/events/${event.id}/edit`}>
                      {publicRegistrationOpen ? "Public Page" : "Event Details"}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
