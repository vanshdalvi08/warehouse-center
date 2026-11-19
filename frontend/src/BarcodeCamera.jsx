import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ScanLine } from "lucide-react";
import "./BarcodeCamera.css";

function cameraMessage(error) {
  if (["NotAllowedError", "SecurityError"].includes(error.name))
    return "Camera access was denied. Allow camera access in your browser, then retry, or enter the barcode manually.";
  if (["NotFoundError", "DevicesNotFoundError"].includes(error.name))
    return "No camera was found. Connect a camera or enter the barcode manually.";
  if (["NotReadableError", "TrackStartError"].includes(error.name))
    return "The camera is busy or unavailable. Close other apps using it and retry.";
  return (
    error.message ||
    "The scanner could not start. Retry or enter the barcode manually."
  );
}

export function BarcodeCamera({ label, onDetected, onClose }) {
  const dialog = useRef(null),
    video = useRef(null);
  const callbacks = useRef({ onDetected, onClose });
  callbacks.current = { onDetected, onClose };
  const titleId = useId(),
    descriptionId = useId();
  const [error, setError] = useState(""),
    [ready, setReady] = useState(false),
    [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    if (element.showModal) element.showModal();
    else element.setAttribute("open", "");
    return () => {
      if (element.close && element.open) element.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false,
      stream,
      controls;
    const preview = video.current;
    setError("");
    setReady(false);
    function release() {
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
      if (preview) preview.srcObject = null;
    }
    async function start() {
      try {
        if (window.isSecureContext === false)
          throw new Error(
            "Camera scanning needs HTTPS or localhost. Open the local app on this computer, or use its HTTPS address.",
          );
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "Camera access is unavailable in this browser. Use a current browser with camera support, or enter the barcode manually.",
          );
        const [
          { BrowserMultiFormatReader },
          { BarcodeFormat, DecodeHintType },
        ] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (cancelled) return;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          release();
          return;
        }
        const hints = new Map([
          [
            DecodeHintType.POSSIBLE_FORMATS,
            [
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.ITF,
              BarcodeFormat.QR_CODE,
            ],
          ],
        ]);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 200,
          delayBetweenScanSuccess: 500,
        });
        controls = await reader.decodeFromStream(
          stream,
          preview,
          (result, _error, activeControls) => {
            if (!result || cancelled) return;
            const text = result.getText();
            if (!text) return;
            cancelled = true;
            activeControls?.stop();
            release();
            callbacks.current.onDetected(text);
          },
        );
        if (cancelled) release();
        else setReady(true);
      } catch (e) {
        release();
        if (!cancelled) setError(cameraMessage(e));
      }
    }
    start();
    return () => {
      cancelled = true;
      release();
    };
  }, [attempt]);

  return createPortal(
    <dialog
      ref={dialog}
      className="barcode-camera"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(e) => {
        e.preventDefault();
        callbacks.current.onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) callbacks.current.onClose();
      }}
    >
      <div className="barcode-camera-content">
        <div className="barcode-camera-header">
          <div>
            <h2 id={titleId}>Scan barcode</h2>
            <p>{label}</p>
          </div>
          <button
            type="button"
            autoFocus
            className="icon-button"
            aria-label="Close barcode scanner"
            onClick={() => callbacks.current.onClose()}
          >
            <X size={19} />
          </button>
        </div>
        <p id={descriptionId}>
          Hold the complete barcode inside the camera view. Once detected, its
          value will fill the field for you to review.
        </p>
        <div className="barcode-camera-preview">
          <video
            ref={video}
            muted
            playsInline
            autoPlay
            aria-label="Barcode camera preview"
          />
          <div className="barcode-camera-guide" aria-hidden="true">
            <ScanLine size={42} />
          </div>
        </div>
        {error ? (
          <div className="alert error" role="alert">
            {error}
          </div>
        ) : (
          <p role="status">
            {ready
              ? "Looking for a barcode… Keep the label steady and well lit."
              : "Starting camera… Allow access if your browser asks."}
          </p>
        )}
        <div className="barcode-camera-footer">
          <small>
            Decoding happens on this device. Camera images are not uploaded.
          </small>
          <div className="row-actions">
            {error && (
              <button type="button" onClick={() => setAttempt((v) => v + 1)}>
                Retry camera
              </button>
            )}
            <button
              type="button"
              className="text-button"
              onClick={() => callbacks.current.onClose()}
            >
              Close and type manually
            </button>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
