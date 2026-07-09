"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="messageScreen">
      <div className="messageCard">
        <p className="eyebrow">Something went wrong</p>
        <h1>This screen ran into a problem.</h1>
        <p>
          The action could not be completed. Your data was not changed by this error.
          You can try again, or go back to the events list.
        </p>
        <div className="messageActions">
          <button className="primaryButton" type="button" onClick={reset}>
            Try again
          </button>
          <a className="secondaryButton" href="/events">
            Back to events
          </a>
        </div>
        {error.digest ? <small className="messageMeta">Reference: {error.digest}</small> : null}
      </div>
    </main>
  );
}
