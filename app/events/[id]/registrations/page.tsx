import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { updateRegistrationStatus } from "../../actions";
import { EventWorkspaceNav } from "../EventWorkspaceNav";
import { AppTopbar } from "../../../AppTopbar";

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
          qrTokens: true,
          checkIns: true,
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
  const checkedInCount = event.registrations.reduce(
    (total, registration) => total + registration.attendees.filter((attendee) => attendee.checkInStatus === "checked_in").length,
    0
  );

  return (
    <main className="pageShell">
      <AppTopbar
        active="events"
        eyebrow="Registration Review"
        title={event.name}
        actions={<a className="secondaryButton" href={`/register/${event.id}`}>Public Page</a>}
      />
      <EventWorkspaceNav active="registrations" eventId={event.id} />

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
          <article className="metric">
            <span>Checked In</span>
            <strong>{checkedInCount}</strong>
            <small>Current event-day progress</small>
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
              const attendeeTotal = registration.attendees.length;
              const checkedInTotal = registration.attendees.filter((attendee) => attendee.checkInStatus === "checked_in").length;
              const readyToken = registration.qrTokens.find((token) => token.status === "unused");
              const usedToken = registration.qrTokens.find((token) => token.status === "used");
              const isCheckInReady = registration.status === "complete" && Boolean(readyToken);
              const latestCheckIn = registration.checkIns
                .filter((checkIn) => checkIn.action === "check_in")
                .sort((a, b) => b.checkedInAt.getTime() - a.checkedInAt.getTime())[0];

              return (
                <details className="reviewItem" key={registration.id}>
                  <summary>
                    <span className="reviewSummaryMain">
                      <strong>{registration.primaryFirstName} {registration.primaryLastName}</strong>
                      <small>{registration.primaryEmail ?? "No email"} | {attendeeTotal} {attendeeTotal === 1 ? "attendee" : "attendees"}</small>
                    </span>
                    <span className="reviewSummaryBadges">
                      <em>{formatStatus(registration.status)}</em>
                      <small>{checkedInTotal}/{attendeeTotal} checked in</small>
                    </span>
                  </summary>

                  <div className="reviewBody">
                    <div className="registrationOverview">
                      <div>
                        <span>Contact</span>
                        <strong>{registration.primaryEmail ?? "No email"}</strong>
                        <small>{registration.primaryPhone ?? "No phone"}</small>
                      </div>
                      <div>
                        <span>Group Size</span>
                        <strong>{attendeeTotal}</strong>
                        <small>{checkedInTotal} checked in</small>
                      </div>
                      <div>
                        <span>QR Status</span>
                        <strong>{isCheckInReady ? "Ready" : usedToken ? "Used" : "Not ready"}</strong>
                        <small>{readyToken ? "Group QR available" : usedToken ? "QR already scanned" : "Needs review"}</small>
                      </div>
                      <div>
                        <span>Payment</span>
                        <strong>{formatStatus(registration.paymentStatus)}</strong>
                        <small>{registration.status === "complete" ? "Registration complete" : "Review before check-in"}</small>
                      </div>
                    </div>

                    <div className="reviewMeta">
                      <div><strong>Submitted</strong><span>{registration.submittedAt ? formatEventDateTime(registration.submittedAt) : "Not submitted"}</span></div>
                      <div><strong>Last check-in</strong><span>{latestCheckIn ? formatEventDateTime(latestCheckIn.checkedInAt) : "No check-ins yet"}</span></div>
                      <div><strong>Sync ready</strong><span>{registration.status === "complete" ? "Yes" : "No"}</span></div>
                    </div>

                    <div className="reviewColumns">
                      <section>
                        <h3>Attendees</h3>
                        <div className="attendeeReviewList">
                          {registration.attendees.map((attendee) => (
                            <article className="attendeeReviewRow" key={attendee.id}>
                              <div>
                                <strong>{attendee.firstName} {attendee.lastName ?? ""}</strong>
                                <span>{attendee.email ?? "No email"}</span>
                              </div>
                              <small>{formatStatus(attendee.checkInStatus)}</small>
                            </article>
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
                        <button className="secondaryButton" type="submit">Needs Review</button>
                      </form>
                      <form action={markComplete}>
                        <button className="primaryButton" type="submit">Approve for Check-In</button>
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
