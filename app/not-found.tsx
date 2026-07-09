export default function NotFound() {
  return (
    <main className="messageScreen">
      <div className="messageCard">
        <p className="eyebrow">Not found</p>
        <h1>We could not find that page.</h1>
        <p>
          The event or registration you are looking for may have been removed, closed,
          or is not open to the public.
        </p>
        <div className="messageActions">
          <a className="primaryButton" href="/events">
            Back to events
          </a>
        </div>
      </div>
    </main>
  );
}
