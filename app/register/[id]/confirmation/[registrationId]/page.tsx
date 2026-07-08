import { notFound } from "next/navigation";
import { formatEventDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

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
          <span className="statusPill">Confirmed</span>
          <h2>{registration.primaryFirstName}, your registration is saved.</h2>
          <p>Your event record is ready for check-in. A confirmation message and QR access can be connected here in the next pass.</p>
          <div className="detailList">
            <div><dt>Registration</dt><dd>{registration.primaryFirstName} {registration.primaryLastName}</dd></div>
            <div><dt>Attendees</dt><dd>{registration.attendees.map((attendee) => `${attendee.firstName} ${attendee.lastName ?? ""}`).join(", ")}</dd></div>
            <div><dt>Access token</dt><dd>{registration.qrTokens[0]?.status === "unused" ? "Ready for check-in" : "Pending"}</dd></div>
          </div>
          <div className="formActions">
            <a className="secondaryButton" href={`/register/${registration.eventId}`}>Register another attendee</a>
            <a className="primaryButton" href={`/events/${registration.eventId}`}>Event Detail</a>
          </div>
        </article>
      </section>
    </main>
  );
}
