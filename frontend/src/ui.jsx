import React from "react";
import { ArrowRight } from "lucide-react";
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
  ...rest
}) {
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
