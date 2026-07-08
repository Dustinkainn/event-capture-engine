import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateEvent } from "../../actions";
import { EventForm } from "../../EventForm";

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
          <a className="secondaryButton" href={`/events/${event.id}`}>Event Detail</a>
          <a className="secondaryButton" href="/events">Events</a>
        </div>
      </header>

      <section className="section editorLayout">
        <article className="panel">
          <h2>{event.name}</h2>
          <EventForm action={saveEvent} event={event} submitLabel="Save Changes" />
        </article>
        <aside className="panel sidePanel">
          <h2>Setup Status</h2>
          <div className="accessList">
            <div className="accessRow">
              <strong>Core details</strong>
              <span>Changes here update the dashboard, event list, public registration preview, and event detail.</span>
            </div>
            <div className="accessRow">
              <strong>Still separate</strong>
              <span>Registration questions, counts, attendees, and sync activity keep their own records.</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
