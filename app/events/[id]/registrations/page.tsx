import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { updateRegistrationStatus } from "../../actions";

type RegistrationReviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
};

export default async function RegistrationReviewPage({ params, searchParams }: RegistrationReviewPageProps) {
  const { id } = await params;
  const { updated } = await searchParams;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          attendees: {
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
          },
          answers: {
            include: {
              question: true,
              option: true,
              attendee: true
            },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!event) {
    notFound();
  }

  const completeCount = event.registrations.filter((registration) => registration.status === "complete").length;
  const reviewCount = event.registrations.filter(
    (registration) => registration.status === "submitted" || registration.status === "incomplete"
  ).length;
  const attendeeCount = event.registrations.reduce((total, registration) => total + registration.attendees.length, 0);

  return (
    <main className="pageShell">
      <header className="simpleTopbar">
        <div>
          <p className="eyebrow">Registration Review</p>
          <h1>{event.name}</h1>
        </div>
        <div className="actions">
          <a className="secondaryButton" href={`/events/${event.id}`}>Event Detail</a>
          <a className="secondaryButton" href={`/events/${event.id}/counts`}>Counts</a>
          <a className="secondaryButton" href={`/events/${event.id}/scanner`}>Check-In Scanner</a>
        </div>
      </header>

      {updated ? (
        <section className="section">
          <article className="noticePanel ok">
            <strong>Registration updated</strong>
            <span>Status changed and counts were refreshed.</span>
          </article>
        </section>
      ) : null}

      <section className="section">
        <div className="metricGrid">
          <article className="metric">
            <span>Total Registrations</span>
            <strong>{event.registrations.length}</strong>
            <small>{formatEventDateTime(event.startsAt)}</small>
          </article>
          <article className="metric">
            <span>Complete</span>
            <strong>{completeCount}</strong>
            <small>Ready for counts and check-in</small>
          </article>
          <article className="metric">
            <span>Needs Review</span>
            <strong>{reviewCount}</strong>
            <small>Submitted or incomplete</small>
          </article>
          <article className="metric">
            <span>Attendees</span>
            <strong>{attendeeCount}</strong>
            <small>Across all registrations</small>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="panel">
          <div className="panelHeading">
            <h2>Registrations</h2>
            <span className="statusPill">{event.registrations.length} total</span>
          </div>

          <div className="registrationReviewList">
            {event.registrations.length === 0 ? (
              <div className="emptyState">
                <strong>No registrations yet</strong>
                <span>Public submissions will appear here.</span>
              </div>
            ) : event.registrations.map((registration) => {
              const markComplete = updateRegistrationStatus.bind(null, event.id, registration.id, "complete");
              const markSubmitted = updateRegistrationStatus.bind(null, event.id, registration.id, "submitted");
              const cancelRegistration = updateRegistrationStatus.bind(null, event.id, registration.id, "canceled");

              return (
                <details className="reviewItem" key={registration.id}>
                  <summary>
                    <span>
                      <strong>{registration.primaryFirstName} {registration.primaryLastName}</strong>
                      <small>{registration.primaryEmail ?? "No email"} | {registration.attendees.length} attendees</small>
                    </span>
                    <em>{formatStatus(registration.status)}</em>
                  </summary>

                  <div className="reviewBody">
                    <div className="reviewMeta">
                      <div><strong>Payment</strong><span>{formatStatus(registration.paymentStatus)}</span></div>
                      <div><strong>Submitted</strong><span>{registration.submittedAt ? formatEventDateTime(registration.submittedAt) : "Not submitted"}</span></div>
                      <div><strong>Phone</strong><span>{registration.primaryPhone ?? "No phone"}</span></div>
                    </div>

                    <div className="reviewColumns">
                      <section>
                        <h3>Attendees</h3>
                        <div className="accessList">
                          {registration.attendees.map((attendee) => (
                            <div className="accessRow" key={attendee.id}>
                              <strong>{attendee.firstName} {attendee.lastName ?? ""}</strong>
                              <span>{formatStatus(attendee.status)} | {formatStatus(attendee.checkInStatus)}</span>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <h3>Answers</h3>
                        <div className="accessList">
                          {registration.answers.length === 0 ? (
                            <div className="accessRow">
                              <strong>No answers saved</strong>
                              <span>This registration did not include custom answers.</span>
                            </div>
                          ) : registration.answers.map((answer) => (
                            <div className="accessRow" key={answer.id}>
                              <strong>{answer.question.label}</strong>
                              <span>{answer.option?.label ?? answer.valueText ?? (answer.valueBoolean ? "Yes" : "No answer")}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    <div className="formActions">
                      <form action={markSubmitted}>
                        <button className="secondaryButton" type="submit">Mark Submitted</button>
                      </form>
                      <form action={markComplete}>
                        <button className="primaryButton" type="submit">Mark Complete</button>
                      </form>
                      <form action={cancelRegistration}>
                        <button className="textButton dangerText" type="submit">Cancel</button>
                      </form>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
