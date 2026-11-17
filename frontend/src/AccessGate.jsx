import React, { useEffect, useState } from "react";
import { Boxes, ArrowRight } from "lucide-react";
import { api, setAuthorization, Field } from "./ui";

export function AccessGate({ children }) {
  const [state, setState] = useState("checking"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [username, setUsername] = useState("");
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
      const user = await api("/auth/me");
      setUsername(user.username);
      setState("authenticated");
    } catch {
      setAuthorization("");
      setError(
        "Sign-in failed. Check your credentials and the server connection.",
      );
      setState("login");
    } finally {
      setBusy(false);
    }
  }
  if (state === "local") return children;
  if (state === "authenticated")
    return (
      <>
        <div className="access-session">
          <span>Signed in as {username}</span>
          <button
            onClick={() => {
              setAuthorization("");
              setState("login");
              setError("");
            }}
          >
            Sign out
          </button>
        </div>
        {children}
      </>
    );
  return (
    <div className="access-screen">
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
            <Field
              name="username"
              label="Username"
              autoComplete="username"
              maxLength={100}
            />
            <Field
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
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
