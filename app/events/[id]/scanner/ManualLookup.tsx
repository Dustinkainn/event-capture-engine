"use client";

import { useMemo, useState } from "react";

export type LookupAttendee = {
  id: string;
  firstName: string;
  lastName: string | null;
  registrantName: string;
  email: string | null;
  phone: string | null;
  checkInStatusLabel: string;
  isReady: boolean;
  isCheckedIn: boolean;
};

type ManualLookupProps = {
  eventId: string;
  attendees: LookupAttendee[];
  checkInAction: (eventId: string, attendeeId: string) => void;
};

export function ManualLookup({ eventId, attendees, checkInAction }: ManualLookupProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return attendees.slice(0, 8);
    }

    return attendees
      .filter((attendee) => {
        const haystack = [
          attendee.firstName,
          attendee.lastName ?? "",
          attendee.registrantName,
          attendee.email ?? "",
          attendee.phone ?? ""
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 25);
  }, [attendees, query]);

  return (
    <>
      <input
        className="lookupInput"
        aria-label="Search attendee or group"
        placeholder="Search by name, email, or phone"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="lookupList">
        {results.length === 0 ? (
          <div className="lookupEmpty">
            <strong>No matches</strong>
            <span>No attendee matches that search for this event.</span>
          </div>
        ) : (
          results.map((attendee) => (
            <div className="lookupRow" key={attendee.id}>
              <div>
                <strong>{attendee.firstName} {attendee.lastName ?? ""}</strong>
                <span>{attendee.registrantName} | {attendee.checkInStatusLabel}</span>
              </div>
              <form action={checkInAction.bind(null, eventId, attendee.id)}>
                <button
                  className={attendee.isCheckedIn ? "secondaryButton" : "primaryButton"}
                  type="submit"
                  disabled={!attendee.isReady || attendee.isCheckedIn}
                >
                  {attendee.isCheckedIn ? "Checked In" : attendee.isReady ? "Check In" : "Review"}
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </>
  );
}
