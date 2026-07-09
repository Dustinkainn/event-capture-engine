"use client";

import { useState } from "react";

type ConfirmationActionsProps = {
  qrDataUrl: string | null;
  downloadName: string;
};

export function ConfirmationActions({ qrDataUrl, downloadName }: ConfirmationActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="confirmationActions">
      {qrDataUrl ? (
        <a className="primaryButton" download={downloadName} href={qrDataUrl}>
          Download QR
        </a>
      ) : null}
      <button className="secondaryButton" type="button" onClick={() => window.print()}>
        Print
      </button>
      <button className="secondaryButton" type="button" onClick={copyLink}>
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
