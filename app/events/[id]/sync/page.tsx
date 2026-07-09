import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildEventSyncPayloads, simulateSyncAttempt, updateSyncStatus } from "../../actions";
import { EventWorkspaceNav } from "../EventWorkspaceNav";
import { AppTopbar } from "../../../AppTopbar";

type SyncReviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payloads?: string; simulated?: string; updated?: string }>;
};

export default async function SyncReviewPage({ params, searchParams }: SyncReviewPageProps) {
  const { id } = await params;
  const { payloads, simulated, updated } = await searchParams;
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
  const withPayload = event.syncQueueItems.filter((item) => item.payloadSnapshotJson).length;
  const hasConnectorKey = Boolean(process.env.MINISTRY_PLATFORM_API_KEY);
  const buildPayloads = buildEventSyncPayloads.bind(null, event.id);

  return (
    <main className="pageShell">
      <AppTopbar active="events" eyebrow="External Sync" title={event.name} />
      <EventWorkspaceNav active="sync" eventId={event.id} />

      {payloads === "generated" ? (
        <section className="section">
          <article className="noticePanel ok">
            <strong>Payload snapshots generated</strong>
            <span>Records were prepared locally. No external connection was attempted.</span>
          </article>
        </section>
      ) : null}

      {updated ? (
        <section className="section">
          <article className="noticePanel ok">
            <strong>Sync item updated</strong>
            <span>The queue status has been changed.</span>
          </article>
        </section>
      ) : null}

      {simulated ? (
        <section className="section">
          <article className={simulated === "success" ? "noticePanel ok" : "noticePanel warn"}>
            <strong>{simulated === "success" ? "Simulated sync completed" : "Simulated sync failed"}</strong>
            <span>No external API call was made. A local response snapshot was saved for review.</span>
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
        <article className="panel connectorPanel">
          <div>
            <p className="eyebrow">Connector</p>
            <h2>External System Placeholder</h2>
            <p>
              Payloads can be reviewed and marked locally. A live MinistryPlatform connection is intentionally not active.
            </p>
          </div>
          <div className="connectorStatusGrid">
            <div>
              <strong>{hasConnectorKey ? "Key present" : "No key set"}</strong>
              <span>MINISTRY_PLATFORM_API_KEY placeholder</span>
            </div>
            <div>
              <strong>{withPayload}/{event.syncQueueItems.length}</strong>
              <span>payload snapshots</span>
            </div>
            <div>
              <strong>Local only</strong>
              <span>No outbound API calls</span>
            </div>
          </div>
          <form action={buildPayloads}>
            <button className="primaryButton" type="submit">Build Payload Snapshots</button>
          </form>
        </article>
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
              const simulateSuccess = simulateSyncAttempt.bind(null, event.id, item.id, "success");
              const simulateFailure = simulateSyncAttempt.bind(null, event.id, item.id, "failure");
              const canSimulate = Boolean(item.payloadSnapshotJson) && item.status !== "review_required";

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

                    <div className="syncSnapshot">
                      <strong>Response snapshot</strong>
                      <pre>{item.responseSnapshotJson ?? "{\n  \"status\": \"No simulated response yet\"\n}"}</pre>
                    </div>

                    {item.errorMessage ? (
                      <div className="noticePanel warn">
                        <strong>Error</strong>
                        <span>{item.errorMessage}</span>
                      </div>
                    ) : null}

                    <div className="formActions">
                      <form action={simulateSuccess}>
                        <button className="primaryButton" type="submit" disabled={!canSimulate}>Simulate Success</button>
                      </form>
                      <form action={simulateFailure}>
                        <button className="secondaryButton" type="submit" disabled={!canSimulate}>Simulate Failure</button>
                      </form>
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
