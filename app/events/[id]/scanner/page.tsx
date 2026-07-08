import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ScannerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScannerPage({ params }: ScannerPageProps) {
  const { id } = await params;
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

  return (
    <main className="scannerShell">
      <header className="scannerHeader">
        <div>
          <p className="eyebrow">Event Day Check-In</p>
          <h1>{event.name}</h1>
          <span>{formatEventDateTime(event.startsAt)}{event.locationName ? ` | ${event.locationName}` : ""}</span>
        </div>
        <div className="actions">
          <a className="secondaryButton" href={`/events/${event.id}`}>Event Detail</a>
          <a className="secondaryButton" href="/events">Events</a>
        </div>
      </header>

      <section className="scannerLayout">
        <article className="scanStage">
          <div className="scanFrame">
            <span>QR scan area</span>
          </div>
        </article>

        <aside className="scannerSide">
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
              <button className="secondaryButton" type="button">Undo Last Check-In</button>
            </div>
          </article>

          <article className="scannerPanel">
            <h2>Manual Lookup</h2>
            <input className="lookupInput" aria-label="Search attendee or group" placeholder="Name, email, phone, or QR code" />
            <div className="lookupList">
              {lookupResults.map((attendee) => (
                <div className="lookupRow" key={attendee.id}>
                  <strong>{attendee.firstName} {attendee.lastName ?? ""}</strong>
                  <span>{attendee.registration.primaryFirstName} {attendee.registration.primaryLastName} | {formatStatus(attendee.checkInStatus)}</span>
                </div>
              ))}
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
