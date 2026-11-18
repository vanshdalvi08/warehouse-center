# Warehouse Center — Jury MVP

A local, PostgreSQL-backed warehouse demo built with React 19, Vite, Tailwind CSS, Java 21, Spring Boot 3.5.7, and JsBarcode. Implements the connected MVP from `WAREHOUSE_CENTER_CODEX_CONTEXT.md`; it is a subset of the larger FDD.

**Working flow:** simulated ERP purchase order → barcode-validated receiving → put-away → sales order → allocation → scan-verified pick → packing/staging → dispatch → stock ledger and simulated ERP confirmation.

## Start with the guided screen

The app opens on **Workflow**. Click **Start workflow** and complete the single action shown on screen. The guide takes you through:

1. Record the delivery you expect.
2. Receive the actual goods.
3. Put them on a storage shelf.
4. Record a customer's order.
5. Reserve the customer's units.
6. Collect them from the shelf.
7. Check and pack the box.
8. Confirm that the box has left the warehouse.

You do not need to switch between ERP simulator, Inbound, and Outbound. The guide explains each scan, generates editable order references, and shows live warehouse totals. Progress is saved in this browser so refreshing resumes the current walkthrough. A rejected operation stays on the current step. This guide uses real persistent operations; opening it does not change stock.

Inbound, Outbound, Inventory and Audit trail are in the main navigation. Product, location and ERP screens remain under **Master data & integration**. The manual walkthrough below uses these detailed screens.

To run frontend interaction tests: `cd frontend` then `npm test`.

## Deploy online

Cloud deployment configuration and protected sign-in are described in [DEPLOYMENT.md](DEPLOYMENT.md). Vercel hosts the frontend; Render runs Spring Boot; Supabase stores PostgreSQL data. Cloud deployment still requires connected accounts and backend environment settings.

## Authentication

Sign-in, role-based access and administrator user management are implemented. Read [AUTHENTICATION.md](AUTHENTICATION.md) for the Admin / Supervisor / Warehouse Operator permissions and local login instructions.

## Run on this Windows laptop

Open PowerShell in this directory (`warehouse-center`, which contains `Dev.ps1`). Java 21, Node 20+, and PostgreSQL must be installed. Maven is provided by the committed Maven wrapper; its first run and `npm ci` need internet access.

Terminal 1:

```powershell
.\Dev.ps1 backend
```

Terminal 2:

```powershell
.\Dev.ps1 frontend
```

Open **http://127.0.0.1:5173**. Backend health: http://127.0.0.1:8080/api/health.

The backend command automatically starts a **separate real PostgreSQL cluster** in `.runtime/pgdata` on `127.0.0.1:55432`. It creates `warehouse_center` and a separate `warehouse_center_test` database. It does not change your PostgreSQL Windows service on port 5432. Data remains on disk after closing or restarting the app.

This dedicated demo cluster uses local trust authentication and binds only to loopback. The application binds to loopback and requires sign-in. Initial local login details are in `.runtime/local-access.json` after the first `Dev.ps1 backend` start. See [AUTHENTICATION.md](AUTHENTICATION.md) for roles and user administration.

If PostgreSQL is installed elsewhere:

```powershell
$env:PG_BIN = 'C:\path\to\PostgreSQL\bin'
.\Dev.ps1 backend
```

If PowerShell blocks scripts, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\Dev.ps1 backend` (and similarly for frontend). This applies to the launched process only. Stop each application with Ctrl+C in its terminal. After stopping the backend, stop the dedicated database with `.\Dev.ps1 stop-db`. Do not delete `.runtime` to stop the database.

### Inspect in pgAdmin 4

Register a server with host `127.0.0.1`, port `55432`, username `warehouse_demo`, maintenance database `warehouse_center`, and no password. Tables appear under Schemas → public → Tables. pgAdmin is an optional administration UI; PostgreSQL stores the actual data.

### Use your existing PostgreSQL instead

Create a database named `warehouse_center` in pgAdmin, then run the backend directly, rather than through the demo helper:

```powershell
cd backend
$env:DB_URL = 'jdbc:postgresql://localhost:5432/warehouse_center'
$env:DB_USER = 'postgres'
$env:DB_PASSWORD = '<your local password>'
$env:DEBUG = 'false'
.\mvnw.cmd -B -ntp spring-boot:run
```

On macOS/Linux use `./mvnw spring-boot:run` with the equivalent exported environment variables. `.env.example` is a reference; Spring Boot does not automatically load it. Never commit credentials.

## Five-minute jury walkthrough

1. Sign in as administrator. **ERP simulator → Prepare demo data.** This creates product `WM-101` / Wireless Mouse / barcode `WM101`, receiving dock `RECV-01`, storage bin `A-01`, and packing lane `PACK-01`. It creates no stock. Repeating this action preserves existing data.
2. Import a purchase order: reference `PO-1001`, a supplier name, product WM-101, quantity **50**. References must be unique; use a new reference for a repeat demo.
3. **Inbound:** select the PO. First try barcode `BAD123`: it is rejected without changing inventory. Then enter `WM101`, location `RECV-01`, quantity **50**. The order becomes RECEIVED.
4. **Inventory:** move `WM101`, source `RECV-01`, destination `A-01`, quantity **50**. On hand remains 50. On Locations, you can block A-01 and demonstrate that put-away to it is rejected; unblock it before continuing.
5. **ERP simulator:** import sales order `SO-1001`, customer name, WM-101, quantity **10**.
6. **Outbound:** select the SO and allocate. On hand is still 50; reserved is 10 and unreserved is 40. Scan `WM101`, source `A-01`, packing `PACK-01`, exact task quantity **10**. A wrong item or source is rejected.
7. Verify packing with barcode `WM101`, quantity **10**, and unique carton `CARTON-1001`. Packing and staging share PACK-01 in this MVP. Scan that carton to dispatch.
8. **Overview / Inventory:** on hand is now **40**, reserved **0**. **Audit trail** explains each event. **ERP simulator** contains the dispatch confirmation. Simulate failure and then retry/acknowledge it; stock stays unchanged.
9. **Products / Locations:** select Print label to preview a Code 128 label and open the browser print dialog. Barcode text can be typed or supplied by a keyboard-wedge scanner.

If previous demo stock exists, compare the increase/decrease against your starting balance. No reset action silently deletes data. The automated smoke demo deliberately adds a fresh 50-in / 10-out cycle each run.

## Verify

From this directory:

```powershell
.\Dev.ps1 test   # Starts the dedicated DB, runs real PostgreSQL integration tests
.\Dev.ps1 build  # Packages Spring Boot JAR and builds frontend production assets
node scripts/smoke.mjs  # Requires backend + Vite; writes real demo transactions
```

After the smoke demo, stop/restart the backend and run:

```powershell
node scripts/smoke.mjs --verify-persistence
```

The smoke test uses the Vite `/api` proxy by default. Set `API_BASE` to test the backend directly. It saves a checkpoint in `.runtime/smoke-state.json`. Run the persistence check before performing additional stock operations.

Integration tests use a separate database ending **exactly** in `/warehouse_center_test`, recreate its schema, and clear test records between tests. They refuse other database names. To use a separately provisioned test database, set `TEST_DB_URL`, `TEST_DB_USER`, and `TEST_DB_PASSWORD` and run `backend/mvnw.cmd test` from the backend folder.

Coverage includes complete fulfilment; partial receiving; receipt/movement replay; wrong SKU, source, quantity, and carton; over-receipt; blocked bins; capacity; wrong location type; insufficient multi-line rollback; competing concurrent allocations; multi-bin picking; multi-product packing; duplicate identifiers; duplicate dispatch; ERP failure and retry.

The actual results and remaining verification limits are in [VERIFICATION.md](VERIFICATION.md).

## Inventory and transaction rules

- Inventory has one row per product/location. `available = quantity - reserved`; on hand includes receiving and packing stock. Only active STORAGE stock is eligible for allocation.
- Receiving accepts only PO products, within remaining expected quantity, into an active RECEIVING location. Partial receipts are supported; over-receipts are rejected.
- Put-away/transfer moves only unreserved stock to active STORAGE, within its unit capacity. PACKING stock is controlled by its order.
- Allocation is all-or-nothing across all order lines, with deterministic inventory row order. Reservations cannot be shared between sales orders.
- Each pick task requires its exact quantity and matching product/source scans. It moves physical and reserved stock to PACKING. It does **not** reduce warehouse total on hand.
- Packing requires all picks, every order product and quantity exactly once, and a unique carton barcode. Packing/staging is one combined local step; there is no loading dock stage.
- Dispatch verifies the assigned carton, reduces on hand and reservations, and marks the order SHIPPED. Repeating dispatch with the same carton returns the existing result without another deduction or outbox message.
- Receiving/movements require an `operationKey`. Identical retries return success without reapplying stock; reusing a key with another payload returns 409. Failed operations roll back their key, stock, order updates, ledger, and outbox writes.
- Business writes run in Spring transactions. A PostgreSQL transaction advisory lock serializes warehouse mutations, including creation of previously absent inventory rows. `@Version`, database uniqueness, and inventory quantity/reservation checks provide additional integrity. The coarse lock is an MVP throughput tradeoff.
- Ledger events and their ERP messages commit together. New ERP messages link to the exact ledger transaction and carry a unique transaction key. Simulated ERP acknowledgement never repeats the warehouse operation.
- Audit rows have timestamps, SKU, quantity, source/destination, reference, and correlation. Actor is the authenticated username; device identity remains a demo label. There are no application endpoints to edit/delete the ledger.

## API

All routes are prefixed `/api`; JSON requests and responses. Validation returns 400, unknown resources 404, and business conflicts/duplicates 409, with a readable `message`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Backend status |
| GET / POST | `/products`, `/locations` | List/register masters |
| POST | `/locations/{id}/state` | `{ "active": false }` blocks a location |
| GET | `/inventory`, `/transactions` | Persistent stock and ledger |
| POST | `/demo/seed` | Idempotent demo master data |
| GET | `/purchase-orders`, `/sales-orders` | Order headers and lines |
| POST | `/mock-erp/purchase-orders`, `/mock-erp/sales-orders` | Import `{reference, partner, lines:[{productId, quantity}]}` |
| POST | `/purchase-orders/{id}/receive` | `{barcode, locationCode, quantity, operationKey}` |
| POST | `/putaway` | `{barcode, sourceCode, destinationCode, quantity, operationKey}` |
| POST | `/sales-orders/{id}/allocate` | Reserve whole order |
| GET | `/sales-orders/{id}/tasks` | Allocated source inventory and pick tasks |
| POST | `/pick-tasks/{id}/confirm` | `{barcode, sourceCode, packingCode, quantity}` |
| POST | `/sales-orders/{id}/pack` | `{cartonBarcode, scans:[{barcode, quantity}]}` |
| POST | `/sales-orders/{id}/dispatch` | `{cartonBarcode}` |
| GET | `/erp-messages` | Simulated ERP outbox with ledger references |
| POST | `/erp-messages/{id}/acknowledge` | `{ "fail": true }` simulates failure; false acknowledges/retries |

The starter `/receive` endpoint now rejects unplanned receipts; use PO-backed receiving. Duplicate ERP order references are rejected, preventing duplicate order imports.

## Structure and persistence

- `frontend/src/main.jsx`: navigation, overview, masters, stock, ledger, simulator.
- `frontend/src/workflows.jsx`: multi-line order imports and operator workflows.
- `frontend/src/ui.jsx`: shared forms, tables, badges, and API client.
- `backend/src/main/java/com/warehousecenter`: controllers → transactional workflow service → JPA repositories/entities.
- `backend/src/test`: PostgreSQL integration suite.
- `scripts/smoke.mjs`: live HTTP demo and restart checkpoint verification.

Vite proxies `/api` to `127.0.0.1:8080`. `VITE_API_BASE` can override it. The frontend production `dist` and backend JAR are separate artifacts; the normal local demo uses Vite. Do not open `dist/index.html` directly as a file.

Hibernate `ddl-auto=update` is retained for the local MVP. Existing products, locations, inventory, and ledger remain; new inventory reservation fields default to zero, and existing locations default to STORAGE with a 10,000-unit capacity. New order, allocation, operation receipt, and outbox tables are additive. There is no production migration system; back up any important existing database before a schema update. Historical starter stock remains usable storage stock but has no retrospective PO provenance.

## Explicit boundaries

Implemented: persistent masters and stock, order-backed receipt, storage movements, capacity/blocking, multi-line imports, allocation, multi-bin tasks, scan checks, packing/staging, dispatch, audit, label preview, and ERP failure/retry simulation.

Simulated: enterprise ERP and device identity. Individual operator accounts are stored in PostgreSQL. No SAP/Oracle integration or background external delivery is claimed.

Deferred: full FDD role specialization and device registration, QA holds/releases, license plates, lots/serials/expiry/FEFO, partial allocations/backorders/partial shipments, cancellation and reservation release, returns, cycle counts, offline/camera scanning, advanced reporting, separate loading dock workflows, production migrations and deployment hardening. Physical scanner/printer hardware has not been tested. The FDD accuracy targets are not claimed as achieved.
