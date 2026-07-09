"use client";

import { useMemo, useState } from "react";

export type AttendeeRow = {
  id: string;
  name: string;
  registrantName: string;
  email: string | null;
  phone: string | null;
  ageGroupLabel: string;
  statusLabel: string;
  checkInLabel: string;
};

export function AttendeeSearch({ attendees }: { attendees: AttendeeRow[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return attendees;
    }

    return attendees.filter((attendee) =>
      [attendee.name, attendee.registrantName, attendee.email ?? "", attendee.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [attendees, query]);

  return (
    <div className="attendeeSearch">
      <input
        className="lookupInput"
        aria-label="Search attendees"
        placeholder="Search by attendee name, registrant, email, or phone"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="searchMeta">
        Showing {results.length} of {attendees.length} attendees
      </p>

      {results.length === 0 ? (
        <div className="emptyState">
          <strong>No attendees match</strong>
          <span>Try a different name, email, or phone number.</span>
        </div>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Registered By</th>
                <th>Contact</th>
                <th>Age</th>
                <th>Status</th>
                <th>Check-In</th>
              </tr>
            </thead>
            <tbody>
              {results.map((attendee) => (
                <tr key={attendee.id}>
                  <td>{attendee.name}</td>
                  <td>{attendee.registrantName}</td>
                  <td>{attendee.email ?? attendee.phone ?? "No contact"}</td>
                  <td>{attendee.ageGroupLabel}</td>
                  <td>{attendee.statusLabel}</td>
                  <td>{attendee.checkInLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
