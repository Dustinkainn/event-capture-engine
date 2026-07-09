"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RegistrationError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="publicShell">
      <section className="publicContent messageContent">
        <article className="publicCard messageCard">
          <p className="eyebrow">Registration</p>
          <h1>We hit a snag saving this registration.</h1>
          <p>
            Nothing was charged and no confirmation was created. Please try again in a
            moment. If it keeps happening, let an event staff member know.
          </p>
          <div className="messageActions">
            <button className="primaryButton" type="button" onClick={reset}>
              Try again
            </button>
          </div>
          {error.digest ? <small className="messageMeta">Reference: {error.digest}</small> : null}
        </article>
      </section>
    </main>
  );
}
