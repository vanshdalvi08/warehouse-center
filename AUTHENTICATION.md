# Authentication and access control

## Scope from the project handoff

The Markdown's M01 MVP decision calls for real role-based permissions. The selected MVP now has three roles requested for the warehouse: **Admin**, **Supervisor**, and **Warehouse Operator**. These are enforced on the server and reflected in navigation. The entire enterprise M01 module is not claimed.

## Sign in locally

Start the project with `Dev.ps1 backend` and `Dev.ps1 frontend`. Open http://127.0.0.1:5173.

On first local start, the helper generates a unique administrator password and saves the login details in `.runtime/local-access.json`. Open that file to obtain the username and password. It is ignored by Git and is not uploaded to GitHub. Treat it as a local secret. The default username is `admin`.

The first account is stored in PostgreSQL with a BCrypt password hash. On later starts, bootstrap does not overwrite users, passwords, roles or disabled status. Reset existing passwords through **Users & access**, rather than changing the bootstrap environment variables. If you delete the local credentials file after the first startup, generating a new file does not reset the existing account's database password.

If running Maven directly, set `APP_USERNAME` and `APP_PASSWORD` before the first authenticated startup. Use a username of 3–60 letters, digits, dots, underscores or hyphens; usernames are normalized to lowercase. A password requires 12–64 characters and at most 72 UTF-8 bytes. Do not commit these values.

## Roles and permissions

| Capability | Admin | Supervisor | Warehouse Operator |
|---|---|---|---|
| View stock, products, locations, orders and movements | Yes | Yes | Yes |
| Receive, move, pick, pack and dispatch | Yes | Yes | Yes |
| Import simulated purchase/sales orders | Yes | Yes | No |
| Allocate stock to sales orders | Yes | Yes | No |
| Block/unblock bins and retry simulated ERP messages | Yes | Yes | No |
| Create products/locations and prepare sample master data | Yes | No | No |
| Run the guided workflow | Yes | Yes, using existing master data | No |
| Create users, assign roles, deactivate, reset/unlock | Yes | No | No |
| View account/access history | Yes | Yes | No |

Admins manage users and master data. Supervisors coordinate orders and reserve stock, then Warehouse Operators execute receiving and fulfilment. An operator viewing an open sales order sees **Awaiting supervisor allocation** until a Supervisor or Admin allocates it. Supervisors can also perform warehouse tasks when necessary.

Compatibility: existing `OPERATOR` accounts are renamed to `WAREHOUSE_OPERATOR` on startup without changing credentials. Previous `AUDITOR` accounts retain read-only access; they are not silently promoted to Supervisor. An Admin must explicitly select one of the new roles when reassigning them. New accounts cannot be assigned retired roles. Role changes are audited.

API authorization checks run on the server for every request. Hiding or enabling a browser button does not grant permission. A role change, password reset or deactivation affects the account's next authenticated request. Accounts are deactivated, never deleted through the application. An administrator cannot disable/demote their own account; at least one active administrator must remain.

## Administration and traceability

Sign in as administrator, open **Master data & integration → Users & access**, then create a Supervisor or Warehouse Operator with their own initial password. The same screen changes account names, roles and status, resets passwords and clears lockouts. Password hashes and failed-attempt counters are never returned by the user API.

Access history records user creation/updates, password resets, unlocks, successful/failed sign-ins, lockouts, sign-outs and permission denials. Passwords and Authorization headers are not included. Warehouse transaction actors use the authenticated username. Device identity remains the existing demo label; hardware/device registration is not implemented.

MVP defaults (not settled numerical FDD requirements): five consecutive failed credential checks lock a known account for 15 minutes; an administrator may unlock it sooner. Unknown usernames return the same public failure message. The most recent 200 access events are shown in the UI; records remain in PostgreSQL.

The existing Spring Security HTTP Basic mechanism is retained. Credentials are held only in browser JavaScript memory while signed in, not in local/session storage. Sign-out logs the action and clears those credentials; refreshing requires sign-in again. There are no JWTs or server session cookies to revoke. Hosted access must use HTTPS. The local HTTP listener remains loopback-only.

## Testing and remaining scope

The test-only warehouse workflow suite explicitly disables authentication to test business invariants independently. Dedicated security/role tests use real database-backed accounts and Basic Authorization requests. Normal local startup and the cloud profile require authentication by default.

Role-based operations and account management are implemented. Full FDD role specialization (receiving/shipping/QA), registered-device enforcement, SSO/MFA, idle-session expiry, password recovery by email and separation of duties for deferred count/adjustment modules remain outside this MVP. No public self-registration is exposed.
