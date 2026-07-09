import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { checkInAttendee, checkInToken, undoLatestCheckIn } from "./actions";
import { QrCameraScanner } from "./QrCameraScanner";
import { EventWorkspaceNav } from "../EventWorkspaceNav";
import { AppTopbar } from "../../../AppTopbar";

export const dynamic = "force-dynamic";

type ScannerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string }>;
};

const resultMessages: Record<string, { title: string; detail: string; tone: string }> = {
  "checked-in": {
    title: "Check-in saved",
    detail: "The attendee status and event totals have been updated.",
    tone: "ok"
  },
  "undo-saved": {
    title: "Check-in undone",
    detail: "The attendee was moved back to not checked in.",
    tone: "ok"
  },
  "already-checked-in": {
    title: "Already checked in",
    detail: "This attendee was already marked present for this event.",
    tone: "warn"
  },
  "needs-review": {
    title: "Needs review",
    detail: "This registration is not ready for check-in yet.",
    tone: "warn"
  },
  "wrong-event": {
    title: "Wrong event",
    detail: "This QR code belongs to a different event.",
    tone: "danger"
  },
  "not-found": {
    title: "No matching attendee",
    detail: "The selected attendee could not be found for this event.",
    tone: "danger"
  }
};

export default async function ScannerPage({ params, searchParams }: ScannerPageProps) {
  const { id } = await params;
  const { result } = await searchParams;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendees: {
        include: {
          registration: true
        },
        orderBy: [{ updatedAt: "desc" }, { lastName: "asc" }, { firstName: "asc" }]
      },
      registrations: true,
      devices: {
        include: {
          activeStaffUser: true
        },
        orderBy: { lastSeenAt: "desc" }
      },
      checkIns: {
        include: {
          attendee: true,
          registration: true,
          staffUser: true,
          device: true
        },
        orderBy: { checkedInAt: "desc" },
        take: 6
      }
    }
  });

  if (!event) {
    notFound();
  }

  const registeredGuests = event.attendees.filter((attendee) => attendee.status === "active").length;
  const checkedInGuests = event.attendees.filter((attendee) => attendee.checkInStatus === "checked_in").length;
  const remainingGuests = Math.max(registeredGuests - checkedInGuests, 0);
  const duplicateScans = event.checkIns.filter((checkIn) => checkIn.action === "undo").length;
  const activeStations = event.devices.filter((device) => device.lastSeenAt).length;
  const latestScan = event.checkIns[0];
  const lookupResults = event.attendees.slice(0, 4);
  const resultMessage = result ? resultMessages[result] : null;
  const undoCheckIn = undoLatestCheckIn.bind(null, event.id);
  const scanToken = checkInToken.bind(null, event.id);

  return (
    <main className="scannerShell">
      <AppTopbar
        active="events"
        variant="dark"
        eyebrow="Event Day Check-In"
        title={event.name}
        subtitle={`${formatEventDateTime(event.startsAt)}${event.locationName ? ` | ${event.locationName}` : ""}`}
      />
      <EventWorkspaceNav active="check-in" eventId={event.id} />

      <section className="scannerLayout">
        <article className="scanStage">
          <div className="scanFrame">
            <QrCameraScanner action={scanToken} eventId={event.id} />
          </div>
          <form action={scanToken} className="tokenEntry">
            <label htmlFor="token">QR token</label>
            <div>
              <input id="token" name="token" placeholder="Paste or type QR token" />
              <button className="primaryButton" type="submit">Check Token</button>
            </div>
          </form>
        </article>

        <aside className="scannerSide">
          {resultMessage ? (
            <article className={`scannerResult ${resultMessage.tone}`}>
              <strong>{resultMessage.title}</strong>
              <span>{resultMessage.detail}</span>
            </article>
          ) : null}

          <article className="scannerPanel">
            <div className="panelHeading">
              <h2>Event Totals</h2>
              <span className="statusPill">Live</span>
            </div>
            <div className="scannerTotals">
              <div>
                <strong>{registeredGuests}</strong>
                <span>registered guests</span>
              </div>
              <div>
                <strong>{checkedInGuests}</strong>
                <span>checked in</span>
              </div>
              <div>
                <strong>{remainingGuests}</strong>
                <span>not checked in</span>
              </div>
              <div>
                <strong>{activeStations || 1}</strong>
                <span>active stations</span>
              </div>
            </div>
          </article>

          <article className="scannerPanel">
            <div className="panelHeading">
              <h2>Latest Scan</h2>
              <span className="statusPill">Ready</span>
            </div>
            {latestScan ? (
              <div className="latestScan">
                <strong>{latestScan.attendee ? `${latestScan.attendee.firstName} ${latestScan.attendee.lastName ?? ""}` : `${latestScan.registration.primaryFirstName} ${latestScan.registration.primaryLastName}`}</strong>
                <span>{formatStatus(latestScan.action)} at {latestScan.checkedInAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                <small>{latestScan.device?.name ?? "No station"}{latestScan.staffUser ? ` | ${latestScan.staffUser.displayName}` : ""}</small>
              </div>
            ) : (
              <div className="latestScan">
                <strong>No scans yet</strong>
                <span>Scanned registrations will appear here.</span>
              </div>
            )}
            <div className="scannerActions">
              <button className="primaryButton" type="button">Check In Group</button>
              <button className="secondaryButton" type="button">Choose Individuals</button>
              <form action={undoCheckIn}>
                <button className="secondaryButton" type="submit">Undo Last Check-In</button>
              </form>
            </div>
          </article>

          <article className="scannerPanel">
            <h2>Manual Lookup</h2>
            <input className="lookupInput" aria-label="Search attendee or group" placeholder="Name, email, phone, or QR code" />
            <div className="lookupList">
              {lookupResults.map((attendee) => {
                const checkIn = checkInAttendee.bind(null, event.id, attendee.id);
                const isReady = attendee.status === "active" && attendee.registration.status === "complete";
                const isCheckedIn = attendee.checkInStatus === "checked_in";

                return (
                  <div className="lookupRow" key={attendee.id}>
                    <div>
                      <strong>{attendee.firstName} {attendee.lastName ?? ""}</strong>
                      <span>{attendee.registration.primaryFirstName} {attendee.registration.primaryLastName} | {formatStatus(attendee.checkInStatus)}</span>
                    </div>
                    <form action={checkIn}>
                      <button className={isCheckedIn ? "secondaryButton" : "primaryButton"} type="submit" disabled={!isReady || isCheckedIn}>
                        {isCheckedIn ? "Checked In" : isReady ? "Check In" : "Review"}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="scannerPanel compactScannerPanel">
            <h2>Scan Notes</h2>
            <div className="scannerTotals">
              <div>
                <strong>{duplicateScans}</strong>
                <span>undo actions</span>
              </div>
              <div>
                <strong>{event.registrations.length}</strong>
                <span>registrations</span>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
