const events = [
  {
    name: "Spring Volunteer Rally",
    date: "Apr 18, 2027",
    status: "Open",
    registered: 184,
    capacity: 220,
    checkedIn: 67,
    syncIssues: 3
  },
  {
    name: "Family Picnic",
    date: "May 9, 2027",
    status: "Draft",
    registered: 0,
    capacity: 300,
    checkedIn: 0,
    syncIssues: 0
  },
  {
    name: "Youth Retreat",
    date: "Jun 3, 2027",
    status: "Open",
    registered: 96,
    capacity: 120,
    checkedIn: 0,
    syncIssues: 0
  }
];

const counts = [
  { label: "Meals", value: "184", detail: "Generated from attendee answers" },
  { label: "Childcare", value: "37", detail: "Needed across active attendees" },
  { label: "Shirts", value: "145", detail: "Mapped size selections" },
  { label: "Review", value: "12", detail: "Incomplete payment or answer states" }
];

const accessRows = [
  ["Taylor Reed", "Admin", "Full event setup"],
  ["Jordan Miles", "Staff", "Registration review"],
  ["Front Door iPad", "Device", "Event-day check-in"]
];

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">EC</span>
          <div>
            <strong>Event Capture Engine</strong>
            <span>Operations</span>
          </div>
        </div>
        <nav className="nav" aria-label="Primary">
          <a href="#dashboard" className="active">Dashboard</a>
          <a href="#events">Events</a>
          <a href="#counts">Counts</a>
          <a href="#access">Access</a>
          <a href="#sync">External Sync</a>
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Internal event operations</p>
            <h1>Core Capture</h1>
          </div>
          <div className="actions">
            <a className="secondaryButton" href="/wireframes/index.html">Preview Home</a>
            <button className="primaryButton" type="button">New Event</button>
          </div>
        </header>

        <section id="dashboard" className="section">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h2>Event Control Center</h2>
            </div>
            <span className="statusPill">MVP scaffold</span>
          </div>

          <div className="metricGrid">
            {counts.map((count) => (
              <article className="metric" key={count.label}>
                <span>{count.label}</span>
                <strong>{count.value}</strong>
                <small>{count.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <section id="events" className="section twoColumn">
          <article className="panel">
            <div className="panelHeading">
              <h2>Events</h2>
              <button className="textButton" type="button">Export CSV</button>
            </div>
            <div className="eventList">
              {events.map((event) => (
                <div className="eventRow" key={event.name}>
                  <div>
                    <strong>{event.name}</strong>
                    <span>{event.date}</span>
                  </div>
                  <div>
                    <b>{event.registered}</b>
                    <span>{event.capacity} capacity</span>
                  </div>
                  <div>
                    <b>{event.checkedIn}</b>
                    <span>checked in</span>
                  </div>
                  <em>{event.status}</em>
                </div>
              ))}
            </div>
          </article>

          <article id="access" className="panel">
            <div className="panelHeading">
              <h2>Event Access</h2>
              <button className="textButton" type="button">Manage</button>
            </div>
            <div className="accessList">
              {accessRows.map(([name, role, note]) => (
                <div className="accessRow" key={name}>
                  <strong>{name}</strong>
                  <span>{role} | {note}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section id="counts" className="section twoColumn">
          <article className="panel">
            <h2>Count Summary</h2>
            <div className="barList">
              <div><span>Chicken meals</span><b style={{ width: "72%" }} /><em>112</em></div>
              <div><span>Vegetarian meals</span><b style={{ width: "28%" }} /><em>44</em></div>
              <div><span>Childcare needed</span><b style={{ width: "32%" }} /><em>37</em></div>
            </div>
          </article>

          <article id="sync" className="panel">
            <h2>External Sync</h2>
            <div className="syncRows">
              <div className="ok"><strong>174 ready</strong><span>Validated and waiting</span></div>
              <div className="warn"><strong>7 review</strong><span>Needs matching or staff review</span></div>
              <div className="danger"><strong>3 failed</strong><span>Payload snapshots retained</span></div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
