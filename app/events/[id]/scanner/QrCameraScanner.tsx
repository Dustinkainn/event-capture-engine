"use client";

import { useEffect, useRef, useState } from "react";

type QrCameraScannerProps = {
  action: (formData: FormData) => void;
  eventId: string;
};

type CameraDevice = {
  deviceId: string;
  label: string;
};

export function QrCameraScanner({ action, eventId }: QrCameraScannerProps) {
  const [status, setStatus] = useState("Checking camera access");
  const [statusTone, setStatusTone] = useState<"idle" | "ok" | "warn" | "danger">("idle");
  const [canUseCamera, setCanUseCamera] = useState(false);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraDetails, setCameraDetails] = useState<string[]>(["Checking this browser and device"]);
  const [token, setToken] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const scanLockRef = useRef(false);
  const readerId = `qr-reader-${eventId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const resumeKey = `ece_scanner_resume_${eventId}`;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const canUse = await inspectCamera();
      if (cancelled) {
        return;
      }

      if (canUse && window.sessionStorage.getItem(resumeKey) === "1") {
        await startScanner();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function inspectCamera() {
    if (!window.isSecureContext) {
      setStatus("Camera requires localhost or HTTPS");
      setStatusTone("danger");
      setCanUseCamera(false);
      setCameraDetails(["Open this page from localhost or a secure HTTPS address"]);
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera is not available in this browser");
      setStatusTone("danger");
      setCanUseCamera(false);
      setCameraDetails(["Try Chrome, Edge, Safari, or another browser with camera support"]);
      return false;
    }

    let permissionState = "Camera permission has not been requested";
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions
        .query({ name: "camera" as PermissionName })
        .catch(() => null);
      if (permission?.state === "granted") {
        permissionState = "Camera permission is allowed";
      } else if (permission?.state === "denied") {
        permissionState = "Camera permission is blocked";
      } else if (permission?.state === "prompt") {
        permissionState = "Camera permission will be requested when starting";
      }
    }

    const mediaDevices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const videoDevices = mediaDevices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`
      }));

    const canUse = videoDevices.length > 0 && permissionState !== "Camera permission is blocked";
    setDevices(videoDevices);
    setSelectedCameraId((current) => current || videoDevices[0]?.deviceId || "");
    setCanUseCamera(canUse);

    if (permissionState === "Camera permission is blocked") {
      setStatus("Camera permission was blocked");
      setStatusTone("danger");
    } else if (videoDevices.length > 0) {
      setStatus("Camera ready to test");
      setStatusTone("ok");
    } else {
      setStatus("No camera found");
      setStatusTone("warn");
    }

    setCameraDetails([
      permissionState,
      videoDevices.length === 1 ? "1 camera detected" : `${videoDevices.length} cameras detected`,
      window.location.protocol === "https:" ? "Secure page" : "Localhost camera access"
    ]);

    return canUse;
  }

  async function stopScanner(userInitiated = false) {
    if (userInitiated) {
      window.sessionStorage.removeItem(resumeKey);
    }

    if (!scannerRef.current) {
      return;
    }

    await scannerRef.current.stop().catch(() => undefined);
    scannerRef.current.clear();
    scannerRef.current = null;
    scanLockRef.current = false;

    if (userInitiated) {
      setStatus("Camera stopped");
      setStatusTone("idle");
    }
  }

  async function startScanner() {
    if (scannerRef.current) {
      return;
    }

    if (!canUseCamera) {
      setStatus("Camera is not available");
      setStatusTone("warn");
      await inspectCamera();
      return;
    }

    setStatus("Starting camera");
    setStatusTone("idle");
    const { Html5Qrcode } = await import("html5-qrcode");
    const cameras = await Html5Qrcode.getCameras().catch(() => []);

    if (cameras.length === 0) {
      setStatus("No camera found");
      setStatusTone("warn");
      setDevices([]);
      setCameraDetails(["This device or browser is not exposing a camera"]);
      return;
    }

    const availableDevices = cameras.map((camera, index) => ({
      deviceId: camera.id,
      label: camera.label || `Camera ${index + 1}`
    }));
    setDevices(availableDevices);

    const cameraId = selectedCameraId || availableDevices[0]?.deviceId || "";
    const scanner = new Html5Qrcode(readerId);
    scannerRef.current = scanner;
    scanLockRef.current = false;

    try {
      await scanner.start(
        cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          if (scanLockRef.current) {
            return;
          }

          scanLockRef.current = true;
          setStatus("QR code read");
          setStatusTone("ok");
          setToken(decodedText);
          await stopScanner();
          window.setTimeout(() => formRef.current?.requestSubmit(), 0);
        },
        () => undefined
      );

      window.sessionStorage.setItem(resumeKey, "1");
      setStatus("Scanning — point the camera at a QR code");
      setStatusTone("ok");
    } catch (error) {
      scannerRef.current = null;
      const message = error instanceof Error ? error.message : "Camera could not start";
      setStatus(message.includes("Permission") ? "Camera permission was blocked" : message);
      setStatusTone(message.includes("Permission") ? "danger" : "warn");
      void inspectCamera();
    }
  }

  return (
    <div className="cameraScanner">
      <div id={readerId} className="cameraReader" />
      <form action={action} ref={formRef}>
        <input name="token" type="hidden" value={token} readOnly />
      </form>
      {devices.length > 1 ? (
        <label className="cameraSelect">
          Camera
          <select value={selectedCameraId} onChange={(event) => setSelectedCameraId(event.target.value)}>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="cameraControls">
        <button className="primaryButton" type="button" onClick={startScanner} disabled={!canUseCamera}>Start Camera</button>
        <button className="secondaryButton" type="button" onClick={() => void stopScanner(true)}>Stop Camera</button>
        <button className="secondaryButton" type="button" onClick={() => void inspectCamera()}>Recheck Camera</button>
      </div>
      <div className={`cameraStatus ${statusTone}`}>
        <strong>{status}</strong>
        {cameraDetails.map((detail) => (
          <span key={detail}>{detail}</span>
        ))}
      </div>
    </div>
  );
}
