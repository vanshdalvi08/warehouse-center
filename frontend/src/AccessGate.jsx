import React, { useEffect, useState } from "react";
import { Boxes, ArrowRight } from "lucide-react";
import { api, setAuthorization, Field } from "./ui";
import { AccessContext, roleLabel } from "./AccessContext";
import { WarehouseBackdrop } from "./WarehouseBackdrop";

export function AccessGate({ children }) {
  const [state, setState] = useState("checking"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selectedRole, setSelectedRole] = useState("ADMIN"),
    [user, setUser] = useState(null);
  async function check() {
    setError("");
    setState("checking");
    try {
      const status = await api("/auth/status");
      setState(status.enabled ? "login" : "local");
    } catch (e) {
      setError(e.message);
      setState("error");
    }
  }
  useEffect(() => {
    check();
    const expired = () => {
      setState("login");
      setError("Please sign in again.");
    };
    window.addEventListener("warehouse:unauthorized", expired);
    return () => window.removeEventListener("warehouse:unauthorized", expired);
  }, []);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const credentials = new TextEncoder().encode(
      `${form.get("username")}:${form.get("password")}`,
    );
    setAuthorization(
      "Basic " +
        btoa(Array.from(credentials, (c) => String.fromCharCode(c)).join("")),
    );
    try {
      const user = await api(
        `/auth/me?role=${encodeURIComponent(selectedRole)}`,
      );
      if (user.role !== selectedRole) {
        throw new Error(
          "This account is not assigned to the selected role. Choose the correct role and try again.",
        );
      }
      setUser(user);
      setState("authenticated");
    } catch (error) {
      setAuthorization("");
      setError(
        error.message ||
          "Sign-in failed. Check your credentials and the server connection.",
      );
      setState("login");
    } finally {
      setBusy(false);
    }
  }
  if (state === "local")
    return (
      <AccessContext.Provider
        value={{ username: "local-demo-operator", role: "ADMIN" }}
      >
        {children}
      </AccessContext.Provider>
    );
  if (state === "authenticated")
    return (
      <AccessContext.Provider value={user}>
        <div className="access-session">
          <span>
            {user.displayName || user.username} ·{" "}
            {roleLabel(user.role || "WAREHOUSE_OPERATOR")}
          </span>
          <button
            onClick={async () => {
              try {
                await api("/auth/sign-out", "POST", {});
              } catch {
                /* Always clear local credentials. */
              } finally {
                setAuthorization("");
                setUser(null);
                setState("login");
                setError("");
              }
            }}
          >
            Sign out
          </button>
        </div>
        {children}
      </AccessContext.Provider>
    );
  return (
    <div className="access-screen">
      <WarehouseBackdrop />
      <section className="access-panel">
        <div className="access-brand">
          <Boxes size={23} />
          <strong>Warehouse Center</strong>
        </div>
        <h1>
          {state === "login" ? "Workspace sign-in" : "Connecting to workspace"}
        </h1>
        <p>Warehouse operations and inventory management.</p>
        {error && (
          <div role="alert" className="alert error">
            {error}
          </div>
        )}
        {state === "login" ? (
          <form onSubmit={login}>
            <fieldset className="access-role-toggle" disabled={busy}>
              <legend>Sign in as</legend>
              <div className="access-role-options">
                {["ADMIN", "SUPERVISOR", "WAREHOUSE_OPERATOR"].map((role) => (
                  <label className="access-role-option" key={role}>
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={selectedRole === role}
                      onChange={() => {
                        setSelectedRole(role);
                        setError("");
                      }}
                    />
                    <span>{roleLabel(role)}</span>
                  </label>
                ))}
              </div>
              <p className="access-role-description">
                {
                  {
                    ADMIN: "Manage users, master data and settings.",
                    SUPERVISOR:
                      "Manage orders, allocation and warehouse activity.",
                    WAREHOUSE_OPERATOR:
                      "Receive, store, pick, pack and dispatch goods.",
                  }[selectedRole]
                }
              </p>
            </fieldset>
            <Field
              name="username"
              label="Username"
              autoComplete="username"
              maxLength={100}
              disabled={busy}
            />
            <Field
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              disabled={busy}
            />
            <button disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
              <ArrowRight size={14} />
            </button>
          </form>
        ) : state === "error" ? (
          <button onClick={check}>Retry connection</button>
        ) : (
          <p role="status">Checking workspace access...</p>
        )}
        <small>Access is restricted to authorised operators.</small>
      </section>
    </div>
  );
}
