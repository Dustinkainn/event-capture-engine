import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          attendees: true
        },
        orderBy: { createdAt: "asc" }
      },
      attendees: {
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
      },
      questions: {
        include: {
          options: true,
          countMappings: {
            include: {
              countItem: true
            }
          }
        },
        orderBy: { displayOrder: "asc" }
      },
      generatedCounts: {
        include: {
          countCategory: true,
          countItem: true
        },
        orderBy: { generatedAt: "desc" }
      },
      checkIns: {
        include: {
          attendee: true,
          staffUser: true,
          device: true
        },
        orderBy: { checkedInAt: "desc" }
      },
      syncQueueItems: {
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  if (!event) {
    notFound();
  }

  const activeAttendees = event.attendees.filter((attendee) => attendee.status === "active");
  const checkedIn = activeAttendees.filter((attendee) => attendee.checkInStatus === "checked_in");
  const completeRegistrations = event.registrations.filter((registration) => registration.status === "complete");
  const reviewItems = event.syncQueueItems.filter(
    (item) => item.status === "failed" || item.status === "review_required"
  );

  return (
    <main className="pageShell">
      <header className="simpleTopbar">
        <div>
          <p className="eyebrow">Event Detail</p>
          <h1>{event.name}</h1>
        </div>
        <div className="actions">
          <a className="primaryButton" href={`/events/${event.id}/edit`}>Edit Event</a>
          <a className="secondaryButton" href="/">Dashboard</a>
          <a className="secondaryButton" href="/events">Events</a>
          <a className="secondaryButton" href="/preview/scanner.html">Scanner Preview</a>
        </div>
      </header>

      <section className="section">
        <div className="metricGrid">
          <article className="metric">
            <span>Status</span>
            <strong className="metricText">{formatStatus(event.status)}</strong>
            <small>{formatStatus(event.visibility)} registration</small>
          </article>
          <article className="metric">
            <span>Complete Registrations</span>
            <strong>{completeRegistrations.length}</strong>
            <small>{event.registrations.length} total records</small>
          </article>
          <article className="metric">
            <span>Active Attendees</span>
            <strong>{activeAttendees.length}</strong>
            <small>{event.capacity ?? "No"} capacity</small>
          </article>
          <article className="metric">
            <span>Checked In</span>
            <strong>{checkedIn.length}</strong>
            <small>{reviewItems.length} review items</small>
          </article>
        </div>
      </section>

      <section className="section detailGrid">
        <article className="panel">
          <h2>Overview</h2>
          <dl className="detailList">
            <div><dt>Date</dt><dd>{formatEventDateTime(event.startsAt)}</dd></div>
            <div><dt>Location</dt><dd>{event.locationName ?? "No location set"}</dd></div>
            <div><dt>Registration</dt><dd>{formatStatus(event.visibility)} | {event.registrationClosesAt ? `Closes ${formatEventDateTime(event.registrationClosesAt)}` : "No close date"}</dd></div>
            <div><dt>Notes</dt><dd>{event.internalNotes ?? "No internal notes"}</dd></div>
          </dl>
        </article>

        <article className="panel">
          <div className="panelHeading">
            <h2>Registration Form</h2>
            <a className="textButton" href={`/events/${event.id}/form`}>Manage</a>
          </div>
          <div className="questionList">
            {event.questions.map((question) => (
              <div className="questionRow" key={question.id}>
                <strong>{question.label}</strong>
                <span>{formatStatus(question.questionType)} | {formatStatus(question.scope)} | {question.isRequired ? "Required" : "Optional"}</span>
                {question.options.length > 0 ? <small>{question.options.map((option) => option.label).join(", ")}</small> : null}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="section detailGrid">
        <article className="panel">
          <div className="panelHeading">
            <h2>Count Summary</h2>
            <a className="textButton" href={`/events/${event.id}/counts`}>Manage</a>
          </div>
          <div className="barList">
            {event.generatedCounts.slice(0, 8).map((count) => {
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

        <article className="panel">
          <h2>Attendees</h2>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Check-In</th>
                </tr>
              </thead>
              <tbody>
                {event.attendees.slice(0, 12).map((attendee) => (
                  <tr key={attendee.id}>
                    <td>{attendee.firstName} {attendee.lastName ?? ""}</td>
                    <td>{formatStatus(attendee.status)}</td>
                    <td>{formatStatus(attendee.checkInStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="section detailGrid">
        <article className="panel">
          <h2>Check-In Snapshot</h2>
          <div className="accessList">
            {event.checkIns.length === 0 ? (
              <div className="accessRow"><strong>No check-ins yet</strong><span>Event-day activity will appear here.</span></div>
            ) : event.checkIns.map((checkIn) => (
              <div className="accessRow" key={checkIn.id}>
                <strong>{checkIn.attendee ? `${checkIn.attendee.firstName} ${checkIn.attendee.lastName ?? ""}` : "Group check-in"}</strong>
                <span>{formatStatus(checkIn.action)} | {checkIn.staffUser?.displayName ?? "Unknown operator"} | {checkIn.device?.name ?? "No device"}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>External Sync</h2>
          <div className="syncRows">
            {event.syncQueueItems.map((item) => {
              const className =
                item.status === "failed" ? "danger" : item.status === "review_required" ? "warn" : "ok";
              return (
                <div className={className} key={item.id}>
                  <strong>{formatStatus(item.status)}</strong>
                  <span>{formatStatus(item.recordType)} | {item.errorMessage ?? "Ready for configured destination"}</span>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
