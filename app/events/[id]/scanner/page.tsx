import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { checkInAttendee, checkInToken, getActiveStationId, selectStation, undoLatestCheckIn } from "./actions";
import { QrCameraScanner } from "./QrCameraScanner";
import { ManualLookup, type LookupAttendee } from "./ManualLookup";
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
  "station-set": {
    title: "Station updated",
    detail: "New check-ins on this device will record this station.",
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
  const lookupAttendees: LookupAttendee[] = event.attendees.map((attendee) => ({
    id: attendee.id,
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    registrantName: `${attendee.registration.primaryFirstName} ${attendee.registration.primaryLastName}`,
    email: attendee.email,
    phone: attendee.phone,
    checkInStatusLabel: formatStatus(attendee.checkInStatus),
    isReady: attendee.status === "active" && attendee.registration.status === "complete",
    isCheckedIn: attendee.checkInStatus === "checked_in"
  }));
  const resultMessage = result ? resultMessages[result] : null;
  const undoCheckIn = undoLatestCheckIn.bind(null, event.id);
  const scanToken = checkInToken.bind(null, event.id);
  const setStation = selectStation.bind(null, event.id);
  const activeStationId = await getActiveStationId(event.id);
  const activeStation = event.devices.find((device) => device.id === activeStationId) ?? null;

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
              <h2>Station</h2>
              <span className="statusPill">{activeStation ? activeStation.name : "Not set"}</span>
            </div>
            <p className="stationHint">
              {activeStation
                ? "Check-ins from this device are recorded to this station."
                : "Set a station so check-ins record where they happened."}
            </p>
            <form action={setStation} className="stationForm">
              <label htmlFor="deviceId">Use an existing station</label>
              <select id="deviceId" name="deviceId" defaultValue={activeStation?.id ?? ""}>
                <option value="">No station</option>
                {event.devices.map((device) => (
                  <option key={device.id} value={device.id}>{device.name}</option>
                ))}
              </select>
              <label htmlFor="newStationName">Or add a new station</label>
              <input id="newStationName" name="newStationName" placeholder="e.g. Front Door iPad" />
              <button className="secondaryButton" type="submit">Set Station</button>
            </form>
          </article>

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
              <form action={undoCheckIn}>
                <button className="secondaryButton" type="submit">Undo Last Check-In</button>
              </form>
            </div>
          </article>

          <article className="scannerPanel">
            <h2>Manual Lookup</h2>
            <ManualLookup attendees={lookupAttendees} checkInAction={checkInAttendee} eventId={event.id} />
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
