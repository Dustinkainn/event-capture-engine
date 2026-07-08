import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { updateSyncStatus } from "../../actions";

type SyncReviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
};

export default async function SyncReviewPage({ params, searchParams }: SyncReviewPageProps) {
  const { id } = await params;
  const { updated } = await searchParams;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      syncQueueItems: {
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
      }
    }
  });

  if (!event) {
    notFound();
  }

  const ready = event.syncQueueItems.filter((item) => item.status === "ready" || item.status === "queued").length;
  const review = event.syncQueueItems.filter((item) => item.status === "failed" || item.status === "review_required").length;
  const synced = event.syncQueueItems.filter((item) => item.status === "synced").length;

  return (
    <main className="pageShell">
      <header className="simpleTopbar">
        <div>
          <p className="eyebrow">External Sync</p>
          <h1>{event.name}</h1>
        </div>
        <div className="actions">
          <a className="secondaryButton" href={`/events/${event.id}`}>Event Detail</a>
          <a className="secondaryButton" href={`/events/${event.id}/registrations`}>Registrations</a>
          <a className="secondaryButton" href="/events">Events</a>
        </div>
      </header>

      {updated ? (
        <section className="section">
          <article className="noticePanel ok">
            <strong>Sync item updated</strong>
            <span>The queue status has been changed.</span>
          </article>
        </section>
      ) : null}

      <section className="section">
        <div className="metricGrid">
          <article className="metric">
            <span>Ready</span>
            <strong>{ready}</strong>
            <small>Waiting for configured destination</small>
          </article>
          <article className="metric">
            <span>Needs Review</span>
            <strong>{review}</strong>
            <small>Failed or requires staff review</small>
          </article>
          <article className="metric">
            <span>Synced</span>
            <strong>{synced}</strong>
            <small>Marked complete</small>
          </article>
          <article className="metric">
            <span>Total</span>
            <strong>{event.syncQueueItems.length}</strong>
            <small>{formatEventDateTime(event.updatedAt)}</small>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="panel">
          <div className="panelHeading">
            <h2>Queue</h2>
            <span className="statusPill">{event.syncQueueItems.length} items</span>
          </div>

          <div className="registrationReviewList">
            {event.syncQueueItems.length === 0 ? (
              <div className="emptyState">
                <strong>No sync items yet</strong>
                <span>Registrations, check-ins, and counts will queue here.</span>
              </div>
            ) : event.syncQueueItems.map((item) => {
              const markReady = updateSyncStatus.bind(null, event.id, item.id, "ready");
              const markReview = updateSyncStatus.bind(null, event.id, item.id, "review_required");
              const markSynced = updateSyncStatus.bind(null, event.id, item.id, "synced");

              return (
                <details className="reviewItem" key={item.id}>
                  <summary>
                    <span>
                      <strong>{formatStatus(item.recordType)}</strong>
                      <small>{item.recordId} | {item.attempts} attempts</small>
                    </span>
                    <em>{formatStatus(item.status)}</em>
                  </summary>

                  <div className="reviewBody">
                    <div className="reviewMeta">
                      <div><strong>Updated</strong><span>{formatEventDateTime(item.updatedAt)}</span></div>
                      <div><strong>Destination</strong><span>{item.destination ?? "Configured later"}</span></div>
                      <div><strong>Next retry</strong><span>{item.nextRetryAt ? formatEventDateTime(item.nextRetryAt) : "Not scheduled"}</span></div>
                    </div>

                    <div className="syncSnapshot">
                      <strong>Payload snapshot</strong>
                      <pre>{item.payloadSnapshotJson ?? "{\n  \"status\": \"No payload snapshot yet\"\n}"}</pre>
                    </div>

                    {item.errorMessage ? (
                      <div className="noticePanel warn">
                        <strong>Error</strong>
                        <span>{item.errorMessage}</span>
                      </div>
                    ) : null}

                    <div className="formActions">
                      <form action={markReady}>
                        <button className="secondaryButton" type="submit">Mark Ready</button>
                      </form>
                      <form action={markReview}>
                        <button className="secondaryButton" type="submit">Needs Review</button>
                      </form>
                      <form action={markSynced}>
                        <button className="primaryButton" type="submit">Mark Synced</button>
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
