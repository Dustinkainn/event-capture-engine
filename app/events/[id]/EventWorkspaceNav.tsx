type EventWorkspaceNavProps = {
  eventId: string;
  active: "overview" | "details" | "form" | "registrations" | "attendees" | "counts" | "check-in" | "check-in-log" | "sync";
};

const workspaceLinks = [
  { key: "overview", label: "Overview", href: (eventId: string) => `/events/${eventId}` },
  { key: "details", label: "Event Details", href: (eventId: string) => `/events/${eventId}/edit` },
  { key: "form", label: "Form Builder", href: (eventId: string) => `/events/${eventId}/form` },
  { key: "registrations", label: "Registrations", href: (eventId: string) => `/events/${eventId}/registrations` },
  { key: "attendees", label: "Attendees", href: (eventId: string) => `/events/${eventId}/attendees` },
  { key: "counts", label: "Counts", href: (eventId: string) => `/events/${eventId}/counts` },
  { key: "check-in", label: "Check-In", href: (eventId: string) => `/events/${eventId}/scanner` },
  { key: "check-in-log", label: "Check-In Log", href: (eventId: string) => `/events/${eventId}/checkins` },
  { key: "sync", label: "External Sync", href: (eventId: string) => `/events/${eventId}/sync` }
] as const;

export function EventWorkspaceNav({ eventId, active }: EventWorkspaceNavProps) {
  return (
    <nav className="eventWorkspaceNav" aria-label="Event workspace">
      {workspaceLinks.map((link) => (
        <a
          aria-current={active === link.key ? "page" : undefined}
          className={active === link.key ? "active" : undefined}
          href={link.href(eventId)}
          key={link.key}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
