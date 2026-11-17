# Online deployment

The hosted demo uses three services: Vercel for React, Render for the Java API, and Neon for PostgreSQL. Account access and environment values are required before an end-to-end deployment can be verified. The laptop database is not exposed or uploaded by this setup.

## 1. Backend database — Neon

Create a PostgreSQL project in your Neon account. Use an empty database for the hosted demo. Copy the connection details into the backend hosting settings, not into source files or Vercel frontend variables:

| Render variable | Value |
|---|---|
| `DB_URL` | `jdbc:postgresql://YOUR-NEON-HOST/neondb?sslmode=require` |
| `DB_USER` | Your Neon database role |
| `DB_PASSWORD` | Your Neon database password |

Use the actual database name if it differs from `neondb`. Do not use a password-embedded PostgreSQL URI as the JDBC URL; keep username and password separate.

## 2. Java backend — Render

Connect the private GitHub repository to Render. Create a Blueprint from the repository's `render.yaml`, or create a Docker web service with:

- Dockerfile: `backend/Dockerfile`
- Docker build context: `backend`
- Health check: `/api/health`
- `SPRING_PROFILES_ACTIVE=cloud`
- `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=55 -XX:+ExitOnOutOfMemoryError`
- The database settings above.
- `APP_USERNAME=operator` (or your chosen username).
- `APP_PASSWORD`: a unique password of at least 12 characters, set only in Render's secret environment settings.
- `CORS_ALLOWED_ORIGINS`: the exact frontend origin, such as `https://your-project.vercel.app`. A comma-separated list can be used for explicitly approved origins; do not use `*`.

The Blueprint requests Render's free plan; it does not authorize a paid upgrade. Check availability and limitations in your account. A sleeping/cold service can take time to start, so open and test the app before the jury and retain the working local demo.

The `cloud` profile binds to `0.0.0.0` and uses the hosting platform's `PORT`. It requires authentication for all application API routes except health and access-status checks. Missing access credentials prevent startup. Always use the HTTPS backend URL supplied by Render.

The hosted app currently uses **one configured operator account**, backed by Spring Security and a BCrypt password hash in memory. Credentials are kept only in frontend JavaScript memory while signed in, sent over HTTPS with the HTTP Authorization header, and cleared by sign-out or page reload. This is shared-demo access control, not per-user RBAC, account registration, or password recovery. Browser storage holds workflow progress only, not passwords.

## 3. React frontend — Vercel

Import the GitHub repository into your Vercel account:

- Root directory: `frontend`
- Framework: Vite
- Install: `npm ci`
- Build: `npm run build`
- Output: `dist`
- Environment variable: `VITE_API_BASE=https://YOUR-RENDER-SERVICE.onrender.com/api`

The committed `frontend/vercel.json` supplies build settings and response headers. Redeploy after setting/changing `VITE_API_BASE`, because Vite embeds this public URL at build time. Never put the database password, operator password, or account tokens in a `VITE_` variable.

Once Vercel assigns the final URL, update `CORS_ALLOWED_ORIGINS` in Render to that exact origin. For a preview deployment, explicitly allow its exact origin before testing it; other origins are denied.

## 4. Verify before sharing

1. Open the Vercel site; the hosted sign-in screen should appear.
2. Confirm that unauthenticated `GET /api/inventory` and `POST /api/demo/seed` return 401 on the backend.
3. Sign in with the operator account configured in Render.
4. Run the receipt → storage → order → reserve → pick → pack → dispatch workflow.
5. Verify the final balance, audit history, and ERP confirmation queue.
6. Restart the Render service and verify persistence in Neon.
7. Confirm sign-out closes the workspace. Refreshing requires sign-in again.

These are live cloud verification steps. Local builds and tests do not prove a cloud deployment is working.

## Local development stays available

`Dev.ps1 backend` uses the dedicated laptop PostgreSQL cluster and does not enable hosted authentication. The frontend asks `/api/auth/status` before opening the workspace. Restart the backend after pulling this change so that the new access-status endpoint exists.

To test protected mode locally, set `APP_SECURITY_ENABLED=true`, `APP_SECURITY_USERNAME`, and `APP_SECURITY_PASSWORD` before running the backend. Use a disposable local test password and keep it out of Git. The cloud profile reads `APP_USERNAME` / `APP_PASSWORD` instead.

## Checks and limitations

GitHub Actions runs the backend tests against a disposable PostgreSQL container, then frontend interaction tests and a production build. Local integration tests use the separate `warehouse_center_test` database. Docker itself must be running to validate a local container build.

The hosted schema still uses Hibernate `ddl-auto=update` for this jury MVP. Production migrations, per-user permissions, abuse throttling, operational monitoring, and a backup policy are separate work. Do not treat this as a production warehouse deployment.
