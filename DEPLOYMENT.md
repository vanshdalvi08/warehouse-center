# Online deployment

The selected setup is **Vercel for React**, **Render for the Java backend**, and **Supabase for PostgreSQL**. Account connections and actual environment values are required before deployment can be verified. The laptop database is not exposed or uploaded by this setup.

## 1. Backend database - Supabase

Create or select a Supabase project intended for this warehouse demo. No MongoDB conversion or Supabase JavaScript SDK is needed: Spring Boot connects to PostgreSQL using JDBC. The frontend continues to call the protected Java API.

Before the first backend deployment, apply `supabase/migrations/20261117000100_private_warehouse.sql` as the database owner. It creates the private `warehouse` schema and removes access for public/Data API roles. It does not create business records or delete existing data. Do not add `warehouse` to Supabase's exposed Data API schemas. Hibernate creates the application tables inside this schema when the cloud app starts.

In Supabase, open **Connect** and select **Session pooler**. Copy the exact host and username shown there. This mode supports IPv4 and prepared statements for the persistent Java backend. Use the session pooler port **5432**, rather than transaction pooler port 6543. Do not guess the pooler host from the project region.

Set these variables only in Render's backend environment settings:

| Render variable | Value |
|---|---|
| `DB_URL` | `jdbc:postgresql://YOUR-SESSION-POOLER-HOST:5432/postgres?sslmode=require` |
| `DB_USER` | The session pooler username, usually `postgres.YOUR-PROJECT-REF` |
| `DB_PASSWORD` | Your Supabase database password |
| `DB_SCHEMA` | `warehouse` |

Copy the actual database name/role if they differ. Do not embed the password in the JDBC URL. Supabase publishable/anon keys and service-role keys are not JDBC credentials and are not needed by this frontend. Never put database credentials in Vercel `VITE_` variables.

The cloud profile defaults to schema `warehouse`; local development still uses its existing schema. A Supabase project is not created or connected merely by committing these settings. No paid plan, add-on, or automatic upgrade is authorised.

References: https://supabase.com/docs/guides/database/connecting-to-postgres and https://supabase.com/docs/guides/api/using-custom-schemas

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
6. Restart the Render service and verify persistence in Supabase.
7. Confirm sign-out closes the workspace. Refreshing requires sign-in again.

These are live cloud verification steps. Local builds and tests do not prove a cloud deployment is working.

## Local development stays available

`Dev.ps1 backend` uses the dedicated laptop PostgreSQL cluster and does not enable hosted authentication. The frontend asks `/api/auth/status` before opening the workspace. Restart the backend after pulling this change so that the new access-status endpoint exists.

To test protected mode locally, set `APP_SECURITY_ENABLED=true`, `APP_SECURITY_USERNAME`, and `APP_SECURITY_PASSWORD` before running the backend. Use a disposable local test password and keep it out of Git. The cloud profile reads `APP_USERNAME` / `APP_PASSWORD` instead.

## Checks and limitations

GitHub Actions runs the backend tests against a disposable PostgreSQL container, then frontend interaction tests and a production build. Local integration tests use the separate `warehouse_center_test` database. Docker itself must be running to validate a local container build.

The hosted schema still uses Hibernate `ddl-auto=update` for this jury MVP. Production migrations, per-user permissions, abuse throttling, operational monitoring, and a backup policy are separate work. Do not treat this as a production warehouse deployment.
