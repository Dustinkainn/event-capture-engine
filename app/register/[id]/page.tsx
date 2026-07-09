import { notFound } from "next/navigation";
import { formatEventDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { submitRegistration } from "../actions";
import { RegistrationForm } from "./RegistrationForm";

type RegistrationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RegistrationPage({ params }: RegistrationPageProps) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      questions: {
        include: { options: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]
      },
      attendees: true,
      registrations: true
    }
  });

  if (!event || event.status !== "open" || event.visibility !== "public") {
    notFound();
  }

  const register = submitRegistration.bind(null, event.id);
  const activeAttendees = event.attendees.filter((attendee) => attendee.status === "active").length;
  const remaining = event.capacity !== null ? Math.max(event.capacity - activeAttendees, 0) : null;

  const now = new Date();
  const notYetOpen = Boolean(event.registrationOpensAt && now < event.registrationOpensAt);
  const closed = Boolean(event.registrationClosesAt && now > event.registrationClosesAt);
  const isFull = remaining !== null && remaining <= 0;
  const unavailableReason = notYetOpen
    ? `Registration opens ${formatEventDateTime(event.registrationOpensAt as Date)}.`
    : closed
      ? "Registration for this event has closed."
      : isFull
        ? "This event is full. No spots remain."
        : null;

  return (
    <main className="publicShell">
      <section className="publicHero">
        <div>
          <p className="eyebrow">Event Registration</p>
          <h1>{event.name}</h1>
          <p>{formatEventDateTime(event.startsAt)}{event.locationName ? ` | ${event.locationName}` : ""}</p>
        </div>
      </section>

      <section className="publicContent">
        <article className="publicCard introCard">
          <div>
            <p className="eyebrow">Event Details</p>
            <h2>Register for this event</h2>
            <p>{event.description ?? "Complete the registration details below."}</p>
          </div>
          <div className="publicStats">
            <div><strong>{activeAttendees}</strong><span>registered</span></div>
            <div><strong>{remaining ?? "Open"}</strong><span>{remaining === null ? "capacity" : "spots left"}</span></div>
            <div><strong>{event.isPaid ? "Paid" : "Free"}</strong><span>event</span></div>
          </div>
        </article>

        {unavailableReason ? (
          <article className="publicCard registrationClosedCard">
            <p className="eyebrow">Registration</p>
            <h2>Registration is not open right now.</h2>
            <p>{unavailableReason}</p>
            <div className="messageActions">
              <a className="secondaryButton" href="/events">Back to events</a>
            </div>
          </article>
        ) : (
          <RegistrationForm action={register} questions={event.questions} />
        )}
      </section>
    </main>
  );
}
