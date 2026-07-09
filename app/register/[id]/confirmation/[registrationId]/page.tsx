import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { formatEventDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ConfirmationActions } from "./ConfirmationActions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type ConfirmationPageProps = {
  params: Promise<{ id: string; registrationId: string }>;
};

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { id, registrationId } = await params;
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      event: true,
      attendees: true,
      qrTokens: true
    }
  });

  if (!registration || registration.eventId !== id) {
    notFound();
  }

  const token = registration.qrTokens[0];
  const qrImage = token ? await QRCode.toDataURL(token.tokenHash, { margin: 1, width: 280 }) : null;
  const isReadyForCheckIn = token?.status === "unused";
  const qrDownloadName = `${slugify(registration.event.name) || "event"}-checkin-qr.png`;

  return (
    <main className="publicShell">
      <section className="publicHero compactHero">
        <div>
          <p className="eyebrow">Registration Complete</p>
          <h1>{registration.event.name}</h1>
          <p>{formatEventDateTime(registration.event.startsAt)}{registration.event.locationName ? ` | ${registration.event.locationName}` : ""}</p>
        </div>
      </section>

      <section className="publicContent">
        <article className="publicCard confirmationCard">
          <div className="confirmationHeader">
            <div>
              <span className="statusPill">{isReadyForCheckIn ? "Ready for check-in" : "Checked in"}</span>
              <h2>{registration.primaryFirstName}, your registration is saved.</h2>
              <p className="confirmationEvent">{registration.event.name} | {formatEventDateTime(registration.event.startsAt)}{registration.event.locationName ? ` | ${registration.event.locationName}` : ""}</p>
              <p>Keep this page handy. Save or print your QR code, or bookmark this link to return to it. Staff can also find you by name at check-in.</p>
            </div>
          </div>

          <div className="confirmationGrid">
            <section className="qrPanel">
              {qrImage ? (
                <div className="qrCard">
                  <img alt="Registration QR code" src={qrImage} />
                  <span>Show this at check-in</span>
                </div>
              ) : (
                <div className="qrFallback">
                  <strong>QR code unavailable</strong>
                  <span>Staff can still find this registration by name.</span>
                </div>
              )}
              <ConfirmationActions qrDataUrl={qrImage} downloadName={qrDownloadName} />
              <div className="checkInInstructions">
                <strong>At the event</strong>
                <span>Have this QR code ready when you arrive. Staff can scan it once for the full registration.</span>
              </div>
            </section>

            <section className="confirmationDetails">
              <div className="detailList">
                <div><dt>Registration</dt><dd>{registration.primaryFirstName} {registration.primaryLastName}</dd></div>
                <div><dt>Email</dt><dd>{registration.primaryEmail ?? "Not provided"}</dd></div>
                <div><dt>Status</dt><dd>{isReadyForCheckIn ? "Ready for check-in" : "Already used"}</dd></div>
              </div>

              <div className="attendeeSummary">
                <h3>Attendees</h3>
                <div>
                  {registration.attendees.map((attendee, index) => (
                    <article key={attendee.id}>
                      <strong>{attendee.firstName} {attendee.lastName ?? ""}</strong>
                      <span>Attendee {index + 1}</span>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="formActions">
            <a className="secondaryButton" href={`/register/${registration.eventId}`}>Register another attendee</a>
            <a className="primaryButton" href={`/register/${registration.eventId}`}>Back to event</a>
          </div>
        </article>
      </section>
    </main>
  );
}
