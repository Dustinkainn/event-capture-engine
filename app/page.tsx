import { prisma } from "@/lib/prisma";
import { formatEventDate, formatStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const [events, staffUsers, generatedCounts, syncItems] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startsAt: "asc" },
      include: {
        registrations: true,
        attendees: true,
        checkIns: true,
        syncQueueItems: true
      }
    }),
    prisma.staffUser.findMany({
      orderBy: { displayName: "asc" },
      include: {
        activeDevices: true
      }
    }),
    prisma.generatedCount.findMany({
      where: { sourceFilter: "complete" },
      orderBy: { generatedAt: "desc" },
      include: {
        countItem: true,
        countCategory: true
      },
      take: 12
    }),
    prisma.syncQueueItem.findMany({
      include: { event: true },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const primaryEvent = events[0];
  const completeRegistrations = events.reduce(
    (total, event) => total + event.registrations.filter((registration) => registration.status === "complete").length,
    0
  );
  const activeAttendees = events.reduce(
    (total, event) => total + event.attendees.filter((attendee) => attendee.status === "active").length,
    0
  );
  const checkedIn = events.reduce(
    (total, event) => total + event.attendees.filter((attendee) => attendee.checkInStatus === "checked_in").length,
    0
  );
  const reviewItems = syncItems.filter((item) => item.status === "failed" || item.status === "review_required").length;

  return {
    events,
    staffUsers,
    generatedCounts,
    syncItems,
    primaryEvent,
    metrics: [
      { label: "Complete Registrations", value: completeRegistrations.toString(), detail: "Read from registration records" },
      { label: "Active Attendees", value: activeAttendees.toString(), detail: "Read from attendee records" },
      { label: "Checked In", value: checkedIn.toString(), detail: "Read from check-in status" },
      { label: "Needs Review", value: reviewItems.toString(), detail: "Failed or review sync items" }
    ]
  };
}

export default async function Home() {
  const { events, staffUsers, generatedCounts, syncItems, primaryEvent, metrics } = await getDashboardData();

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">EC</span>
          <div>
            <strong>Event Capture Engine</strong>
            <span>Operations</span>
          </div>
        </div>
        <nav className="nav" aria-label="Primary">
          <a href="#dashboard" className="active">Dashboard</a>
          <a href="/events">Events</a>
          <a href="#counts">Counts</a>
          <a href="#access">Access</a>
          <a href="#sync">External Sync</a>
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Internal event operations</p>
            <h1>{primaryEvent?.name ?? "Core Capture"}</h1>
          </div>
          <div className="actions">
            <a className="secondaryButton" href="/preview/index.html">Preview Home</a>
            <a className="primaryButton" href="/events/new">New Event</a>
          </div>
        </header>

        <section id="dashboard" className="section">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h2>Event Control Center</h2>
            </div>
            <span className="statusPill">Database connected</span>
          </div>

          <div className="metricGrid">
            {metrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <section id="events" className="section twoColumn">
          <article className="panel">
            <div className="panelHeading">
              <h2>Events</h2>
              <a className="textButton" href="/events">View All</a>
            </div>
            <div className="eventList">
              {events.map((event) => {
                const registered = event.attendees.filter((attendee) => attendee.status === "active").length;
                const checkedIn = event.attendees.filter((attendee) => attendee.checkInStatus === "checked_in").length;

                return (
                  <div className="eventRow" key={event.id}>
                    <div>
                    <a className="rowLink" href={`/events/${event.id}`}>{event.name}</a>
                      <span>{formatEventDate(event.startsAt)}</span>
                    </div>
                    <div>
                      <b>{registered}</b>
                      <span>{event.capacity ?? "No"} capacity</span>
                    </div>
                    <div>
                      <b>{checkedIn}</b>
                      <span>checked in</span>
                    </div>
                    <em>{formatStatus(event.status)}</em>
                  </div>
                );
              })}
            </div>
          </article>

          <article id="access" className="panel">
            <div className="panelHeading">
              <h2>Event Access</h2>
            </div>
            <div className="accessList">
              {staffUsers.map((user) => (
                <div className="accessRow" key={user.id}>
                  <strong>{user.displayName}</strong>
                  <span>{formatStatus(user.role)} | {user.activeDevices[0]?.name ?? "Shared event access"}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section id="counts" className="section twoColumn">
          <article className="panel">
            <h2>Count Summary</h2>
            <div className="barList">
              {generatedCounts.slice(0, 6).map((count) => {
                const width = `${Math.min(100, Math.max(8, count.total))}%`;
                return (
                  <div key={count.id}>
                    <span>{count.countItem?.label ?? count.countCategory.name}</span>
                    <b style={{ width }} />
                    <em>{count.total}</em>
                  </div>
                );
              })}
            </div>
          </article>

          <article id="sync" className="panel">
            <h2>External Sync</h2>
            <div className="syncRows">
              {syncItems.map((item) => {
                const className =
                  item.status === "failed" ? "danger" : item.status === "review_required" ? "warn" : "ok";

                return (
                  <div className={className} key={item.id}>
                    <strong>{formatStatus(item.status)}</strong>
                    <span>{item.event.name} | {item.errorMessage ?? `${formatStatus(item.recordType)} ready`}</span>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
