import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateEvent } from "../../actions";
import { EventForm } from "../../EventForm";
import { EventWorkspaceNav } from "../EventWorkspaceNav";

type EditEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id }
  });

  if (!event) {
    notFound();
  }

  const saveEvent = updateEvent.bind(null, event.id);

  return (
    <main className="pageShell">
      <header className="simpleTopbar">
        <div>
          <p className="eyebrow">Event Builder</p>
          <h1>Edit Event</h1>
        </div>
        <div className="actions">
          <a className="secondaryButton" href="/events">Events</a>
        </div>
      </header>
      <EventWorkspaceNav active="details" eventId={event.id} />

      <section className="section editorLayout">
        <article className="panel">
          <h2>{event.name}</h2>
          <EventForm action={saveEvent} event={event} submitLabel="Save Changes" />
        </article>
        <aside className="panel sidePanel">
          <h2>Setup Status</h2>
          <div className="accessList">
            <div className="accessRow">
              <strong>Event details</strong>
              <span>Changes here update the event list, public registration page, and event overview.</span>
            </div>
            <div className="accessRow">
              <strong>Connected areas</strong>
              <span>Questions, counts, registrations, check-in, and sync each keep their own workspace.</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
