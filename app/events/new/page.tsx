import { createEvent } from "../actions";
import { EventForm } from "../EventForm";

export default function NewEventPage() {
  return (
    <main className="pageShell">
      <header className="simpleTopbar">
        <div>
          <p className="eyebrow">Events</p>
          <h1>New Event</h1>
        </div>
        <div className="actions">
          <a className="secondaryButton" href="/events">Events</a>
          <a className="secondaryButton" href="/">Dashboard</a>
        </div>
      </header>

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
