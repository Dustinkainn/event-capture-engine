"use client";

import { useRef, useState } from "react";

type QrCameraScannerProps = {
  action: (formData: FormData) => void;
  eventId: string;
};

export function QrCameraScanner({ action, eventId }: QrCameraScannerProps) {
  const [status, setStatus] = useState("Camera not started");
  const [token, setToken] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const readerId = `qr-reader-${eventId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  async function stopScanner() {
    if (!scannerRef.current) {
      return;
    }

    await scannerRef.current.stop().catch(() => undefined);
    scannerRef.current.clear();
    scannerRef.current = null;
    setStatus("Camera stopped");
  }

  async function startScanner() {
    if (scannerRef.current) {
      return;
    }

    setStatus("Starting camera");
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode(readerId);
    scannerRef.current = scanner;

    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 260, height: 260 } },
      async (decodedText) => {
        setStatus("QR code read");
        setToken(decodedText);
        await stopScanner();
        window.setTimeout(() => formRef.current?.requestSubmit(), 0);
      },
      () => undefined
    ).catch((error) => {
      scannerRef.current = null;
      setStatus(error instanceof Error ? error.message : "Camera could not start");
    });
  }

  return (
    <div className="cameraScanner">
      <div id={readerId} className="cameraReader" />
      <form action={action} ref={formRef}>
        <input name="token" type="hidden" value={token} readOnly />
      </form>
      <div className="cameraControls">
        <button className="primaryButton" type="button" onClick={startScanner}>Start Camera</button>
        <button className="secondaryButton" type="button" onClick={stopScanner}>Stop Camera</button>
      </div>
      <span>{status}</span>
    </div>
  );
}
