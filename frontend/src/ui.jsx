import React, { useId, useRef, useState } from "react";
import { ArrowRight, Camera } from "lucide-react";
import { BarcodeCamera } from "./BarcodeCamera";
const API = import.meta.env.VITE_API_BASE || "/api";
let authorization = "";
export function setAuthorization(value) {
  authorization = value;
}
export async function api(path, method = "GET", data) {
  let r;
  try {
    r = await fetch(API + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    throw new Error(
      "Backend unavailable. Start Spring Boot and check the database connection.",
    );
  }
  const body = await r.json().catch(() => ({}));
  if (r.status === 401 && authorization) {
    authorization = "";
    window.dispatchEvent(new Event("warehouse:unauthorized"));
  }
  if (!r.ok)
    throw new Error(
      body.message || body.detail || `Request failed (${r.status})`,
    );
  return body;
}
export function Badge({ children }) {
  return (
    <span
      className={
        "badge " +
        (["SHIPPED", "RECEIVED", "ACKNOWLEDGED", "Active"].includes(children)
          ? "green"
          : ["FAILED", "Blocked"].includes(children)
            ? "red"
            : "")
      }
    >
      {children?.replaceAll("_", " ")}
    </span>
  );
}
export function Table({ headers, rows, empty = "No records yet." }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j}>{v}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="empty">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  children,
  scan = false,
  ...rest
}) {
  const id = useId();
  const control = useRef(null),
    scanButton = useRef(null);
  const [scanning, setScanning] = useState(false),
    [scanMessage, setScanMessage] = useState(""),
    [scanError, setScanError] = useState(false);
  if (scan) {
    const inputProps = { id, ref: control, name, value, onChange, ...rest };
    function close() {
      setScanning(false);
      scanButton.current?.focus();
    }
    function detected(text) {
      const element = control.current;
      if (
        children &&
        !Array.from(element.options).some(
          (o) => o.value === text && !o.disabled,
        )
      ) {
        setScanError(true);
        setScanMessage(
          `Scanned ${text}, but it is not an available location. Choose a listed location or scan its label.`,
        );
        close();
        return;
      }
      const prototype = children
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(
        element,
        text,
      );
      element.dispatchEvent(
        new Event(children ? "change" : "input", { bubbles: true }),
      );
      setScanError(false);
      setScanMessage(
        `Scanned ${text}. Review the value, then confirm the operation.`,
      );
      setScanning(false);
      element.focus();
    }
    return (
      <div className="scan-field">
        <label htmlFor={id}>
          <span>{label}</span>
        </label>
        <div className="scan-field-control">
          {children ? (
            <select {...inputProps}>{children}</select>
          ) : (
            <input {...inputProps} type={type} required />
          )}
          <button
            type="button"
            className="camera-scan-button"
            ref={scanButton}
            aria-label={`Scan ${label} with camera`}
            disabled={rest.disabled}
            onClick={() => setScanning(true)}
          >
            <Camera size={16} />
            <span>Scan</span>
          </button>
        </div>
        {scanMessage && (
          <p
            className="scan-field-message"
            role={scanError ? "alert" : "status"}
          >
            {scanMessage}
          </p>
        )}
        {scanning && (
          <BarcodeCamera label={label} onDetected={detected} onClose={close} />
        )}
      </div>
    );
  }
  return (
    <label>
      <span>{label}</span>
      {children ? (
        <select name={name} value={value} onChange={onChange} {...rest}>
          {children}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          min={type === "number" ? 1 : undefined}
          step={type === "number" ? 1 : undefined}
          required
          {...rest}
        />
      )}
    </label>
  );
}
export function Form({
  children,
  onSubmit,
  label = "Confirm",
  className = "",
}) {
  return (
    <form
      className={"form " + className}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      {children}
      <button type="submit">
        {label}
        <ArrowRight size={15} />
      </button>
    </form>
  );
}
export function Panel({ title, description, children, action }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
