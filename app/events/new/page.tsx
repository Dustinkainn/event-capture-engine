import { createEvent } from "../actions";
import { EventForm } from "../EventForm";
import { AppTopbar } from "../../AppTopbar";

export default function NewEventPage() {
  return (
    <main className="pageShell">
      <AppTopbar active="events" eyebrow="Events" title="New Event" />

      <section className="section editorLayout">
        <article className="panel">
          <h2>Event Details</h2>
          <EventForm action={createEvent} submitLabel="Create Event" />
        </article>
        <aside className="panel sidePanel">
          <h2>Builder Notes</h2>
          <div className="accessList">
            <div className="accessRow">
              <strong>Event record</strong>
              <span>Name, date, location, registration timing, and status.</span>
            </div>
            <div className="accessRow">
              <strong>Next setup step</strong>
              <span>Registration questions and count mapping can be added after the event exists.</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
