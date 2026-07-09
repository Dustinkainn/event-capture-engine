import type { ReactNode } from "react";

type AppTopbarProps = {
  active?: "dashboard" | "events";
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  variant?: "light" | "dark";
};

const globalLinks = [
  { key: "dashboard", label: "Dashboard", href: "/" },
  { key: "events", label: "Events", href: "/events" }
] as const;

export function AppTopbar({ active, eyebrow, title, subtitle, actions, variant = "light" }: AppTopbarProps) {
  return (
    <header className={variant === "dark" ? "appTopbar appTopbarDark" : "appTopbar"}>
      <div className="appTopbarBar">
        <a className="appBrand" href="/">
          <span className="brandMark">EC</span>
          <span className="appBrandName">Event Capture Engine</span>
        </a>
        <nav className="appNav" aria-label="Primary">
          {globalLinks.map((link) => (
            <a
              aria-current={active === link.key ? "page" : undefined}
              className={active === link.key ? "active" : undefined}
              href={link.href}
              key={link.key}
            >
              {link.label}
            </a>
          ))}
        </nav>
        {actions ? <div className="appTopbarActions">{actions}</div> : null}
      </div>
      <div className="appTopbarTitle">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
    </header>
  );
}
