import React, { useEffect, useState } from "react";
import { api, Panel, Form, Field, Table, Badge } from "./ui";
import { useAccess, roleLabel } from "./AccessContext";
export function AccessHistory() {
  const [rows, setRows] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("/users/audit")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Panel
      title="Access history"
      description="User changes, sign-ins, lockouts and denied operations."
    >
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      <Table
        headers={["Event", "Actor", "Account", "Details", "Recorded"]}
        rows={rows.map((r) => [
          <Badge>{r.event}</Badge>,
          r.actor,
          r.target,
          r.detail,
          new Date(r.createdAt).toLocaleString(),
        ])}
      />
    </Panel>
  );
}
export function UserManagement() {
  const actor = useAccess();
  const [users, setUsers] = useState([]),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    api("/users")
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, [revision]);
  async function write(path, body, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, "POST", body);
      setRevision((n) => n + 1);
      setNotice(message);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="alert success">
          {notice}
        </div>
      )}
      <fieldset disabled={busy} className="workspace">
        <Panel
          title="Create user"
          description="Only administrators can create accounts. Passwords require 12–64 characters (at most 72 UTF-8 bytes)."
        >
          <Form
            key={"create-" + revision}
            label="Create account"
            className="four-col"
            onSubmit={async (v) => {
              await write("/users", v, "User account created");
            }}
          >
            <Field
              label="Username"
              name="username"
              pattern="[A-Za-z0-9._-]{3,60}"
              maxLength={60}
              autoComplete="off"
            />
            <Field label="Full name" name="displayName" maxLength={100} />
            <Field
              label="Initial password"
              name="password"
              type="password"
              minLength={12}
              maxLength={64}
              autoComplete="new-password"
            />
            <Field label="Role" name="role">
              <option value="WAREHOUSE_OPERATOR">
                Warehouse Operator - warehouse execution
              </option>
              <option value="SUPERVISOR">
                Supervisor - orders and allocation
              </option>
              <option value="ADMIN">Admin - users and settings</option>
            </Field>
          </Form>
        </Panel>
        <Panel
          title="User accounts"
          description="Deactivate accounts to retain their history. Roles and account status are checked on every request."
        >
          <Table
            headers={["Username", "Name", "Role", "Status", "Actions"]}
            rows={users.map((u) => [
              u.username,
              u.displayName,
              <Badge>{roleLabel(u.role)}</Badge>,
              <Badge>
                {!u.active
                  ? "Inactive"
                  : u.lockedUntil && new Date(u.lockedUntil) > new Date()
                    ? "Locked"
                    : "Active"}
              </Badge>,
              <div className="row-actions">
                <button className="text-button" onClick={() => setEditing(u)}>
                  Manage {u.username === actor.username ? "your account" : ""}
                </button>
                {u.lockedUntil && (
                  <button
                    className="text-button"
                    onClick={() =>
                      write(`/users/${u.id}/unlock`, {}, "Account unlocked")
                    }
                  >
                    Unlock
                  </button>
                )}
              </div>,
            ])}
          />
        </Panel>
        {editing && (
          <Panel
            title={`Manage ${editing.username}`}
            description="Changing a role or deactivating an account takes effect on its next request."
          >
            <Form
              key={"details" + editing.id}
              label="Save account"
              className="three-col"
              onSubmit={async (v) => {
                if (
                  await write(
                    `/users/${editing.id}`,
                    {
                      displayName: v.displayName,
                      role: v.role,
                      active: v.active === "true",
                    },
                    "Account updated",
                  )
                )
                  setEditing(null);
              }}
            >
              <Field
                label="Full name"
                name="displayName"
                defaultValue={editing.displayName}
                maxLength={100}
              />
              <Field
                label="Role"
                name="role"
                required
                defaultValue={
                  ["ADMIN", "SUPERVISOR", "WAREHOUSE_OPERATOR"].includes(
                    editing.role,
                  )
                    ? editing.role
                    : ""
                }
              >
                <option value="" disabled>
                  Choose a role
                </option>
                <option value="ADMIN">Admin</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="WAREHOUSE_OPERATOR">Warehouse Operator</option>
              </Field>
              <Field
                label="Account status"
                name="active"
                defaultValue={String(editing.active)}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Field>
            </Form>
            <Form
              key={"password" + editing.id}
              label="Reset password"
              onSubmit={async (v) => {
                if (
                  await write(
                    `/users/${editing.id}/password`,
                    v,
                    "Password reset. Previous credentials are now invalid.",
                  )
                )
                  setEditing(null);
              }}
            >
              <Field
                label="New password"
                name="password"
                type="password"
                minLength={12}
                maxLength={64}
                autoComplete="new-password"
              />
            </Form>
            <button className="text-button" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </Panel>
        )}
        <AccessHistory key={revision} />
      </fieldset>
    </>
  );
}
