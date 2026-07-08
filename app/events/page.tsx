import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";

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
      <header className="simpleTopbar">
        <div>
          <p className="eyebrow">Events</p>
          <h1>Event List</h1>
        </div>
        <div className="actions">
          <a className="secondaryButton" href="/">Dashboard</a>
          <a className="primaryButton" href="/events/new">New Event</a>
        </div>
      </header>

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

              return (
                <a className="eventRow eventRowLink" href={`/events/${event.id}`} key={event.id}>
                  <div>
                    <strong>{event.name}</strong>
                    <span>{formatEventDateTime(event.startsAt)}</span>
                  </div>
                  <div>
                    <b>{activeAttendees}</b>
                    <span>{event.capacity ?? "No"} capacity</span>
                  </div>
                  <div>
                    <b>{checkedIn}</b>
                    <span>checked in</span>
                  </div>
                  <div>
                    <b>{reviewFlags}</b>
                    <span>review flags</span>
                  </div>
                  <em>{formatStatus(event.status)}</em>
                </a>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
