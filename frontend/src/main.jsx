import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Boxes,
  LayoutDashboard,
  Package,
  MapPin,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Printer,
  X,
  PlugZap,
  Search,
} from "lucide-react";
import JsBarcode from "jsbarcode";
import { api, Badge, Table, Field, Form, Panel } from "./ui";
import { OrderEditor, Inbound, Outbound } from "./workflows";
import { GuidedWorkflow } from "./GuidedWorkflow";
import { Overview } from "./Overview";
import { AccessGate } from "./AccessGate";
import "./index.css";
const labels = { "Start here": "Workflow", "ERP simulator": "ERP simulator" };
const pageTitle = (tab) => labels[tab] || tab;
const nav = [
  ["Start here", ArrowRight],
  ["Overview", LayoutDashboard],
  ["Products", Package],
  ["Locations", MapPin],
  ["Inbound", ArrowDownToLine],
  ["Inventory", Boxes],
  ["Outbound", ArrowUpFromLine],
  ["Audit trail", History],
  ["ERP simulator", PlugZap],
];
function App() {
  const [tab, setTab] = useState("Start here"),
    [data, setData] = useState({
      products: [],
      locations: [],
      inventory: [],
      transactions: [],
      purchase: [],
      sales: [],
      messages: [],
    }),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [label, setLabel] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [focusOrder, setFocusOrder] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  function openOrder(order) {
    setFocusOrder(String(order.id));
    setTab(order.kind === "PURCHASE" ? "Inbound" : "Outbound");
  }
  const pending = useRef(new Map()),
    mutating = useRef(false);
  async function reload() {
    setLoading(true);
    try {
      const values = await Promise.all(
        [
          "products",
          "locations",
          "inventory",
          "transactions",
          "purchase-orders",
          "sales-orders",
          "erp-messages",
        ].map((p) => api("/" + p)),
      );
      setData(
        Object.fromEntries(
          [
            "products",
            "locations",
            "inventory",
            "transactions",
            "purchase",
            "sales",
            "messages",
          ].map((k, i) => [k, values[i]]),
        ),
      );
      setOnline(true);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, []);
  async function mutate(path, body = {}, message = "Operation completed") {
    if (mutating.current) return false;
    mutating.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const signature = JSON.stringify([path, body]);
    if (path.endsWith("/receive") || path === "/putaway") {
      if (!pending.current.has(signature))
        pending.current.set(signature, crypto.randomUUID());
      body = { ...body, operationKey: pending.current.get(signature) };
    }
    try {
      const result = await api(path, "POST", body);
      pending.current.delete(signature);
      setNotice(message);
      await reload();
      return result;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
      mutating.current = false;
    }
  }
  const {
    products,
    locations,
    inventory,
    transactions,
    purchase,
    sales,
    messages,
  } = data;
  const pendingMessages = messages.filter(
    (m) => m.status !== "ACKNOWLEDGED",
  ).length;
  function stockTable() {
    return (
      <>
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={15} />
            <input
              aria-label="Search inventory"
              placeholder="Search product, SKU or location"
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
            />
          </label>
          <span className="muted">Live inventory</span>
        </div>
        <Table
          headers={[
            "Product / SKU",
            "Location",
            "Zone",
            "On hand",
            "Reserved",
            "Available",
          ]}
          rows={inventory
            .filter(
              (i) =>
                i.quantity > 0 &&
                `${i.product.name} ${i.product.sku} ${i.location.code}`
                  .toLowerCase()
                  .includes(inventorySearch.toLowerCase()),
            )
            .map((i) => [
              <>
                <strong>{i.product.name}</strong>
                <small>{i.product.sku}</small>
              </>,
              <code>{i.location.code}</code>,
              <Badge>{i.location.type}</Badge>,
              i.quantity,
              i.reserved,
              <strong>{i.available}</strong>,
            ])}
          empty={
            inventorySearch
              ? "No inventory matches your search."
              : "No stock recorded. Receive an expected delivery to add inventory."
          }
        />
      </>
    );
  }
  return (
    <div className="app">
      <aside className="app-sidebar">
        <div className="brand">
          <Boxes size={28} />
          <div>
            Warehouse Center<span>Warehouse management</span>
          </div>
        </div>
        <div className="nav-caption">Operations</div>
        <nav>
          {nav
            .filter(
              ([n]) =>
                n === tab ||
                showDetails ||
                [
                  "Start here",
                  "Overview",
                  "Inbound",
                  "Inventory",
                  "Outbound",
                  "Audit trail",
                ].includes(n),
            )
            .map(([n, Icon]) => (
              <button
                className={tab === n ? "selected" : ""}
                onClick={() => {
                  setTab(n);
                  setFocusOrder("");
                  setNotice("");
                  setError("");
                }}
                key={n}
              >
                <Icon size={18} />
                {pageTitle(n)}
                {n === "ERP simulator" && pendingMessages > 0 && (
                  <b>{pendingMessages}</b>
                )}
              </button>
            ))}
        </nav>
        <button
          className="detail-toggle"
          aria-expanded={showDetails}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Less navigation" : "Master data & integration"}
        </button>
        <div className="sidebar-foot">
          <span className="demo-dot" /> Demo workspace
          <p>
            Main warehouse
            <br />
            Local environment
          </p>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Main warehouse <span>/</span> <strong>{pageTitle(tab)}</strong>
          </div>
          <div className="header-right">
            <span className={"connection " + (online ? "connected" : "")}>
              ● {online ? "System connected" : "System offline"}
            </span>
            <button
              className="icon-button"
              aria-label="Refresh data"
              onClick={reload}
              disabled={loading || busy}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
            <span className="workspace-label">Local workspace</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">Operations / Main warehouse</div>
              <h1>{tab === "Overview" ? "Overview" : pageTitle(tab)}</h1>
              <p>
                {
                  {
                    "Start here":
                      "Manage a receipt and customer shipment in one connected workflow.",
                    Overview:
                      "A clear view of your stock, orders, and warehouse activity.",
                    Products: "Register products and print Code 128 labels.",
                    Locations:
                      "Manage receiving docks, storage bins, and packing lanes.",
                    Inbound:
                      "Validate every receipt against an expected purchase order.",
                    Inventory:
                      "Track physical stock and move available units between locations.",
                    Outbound:
                      "Reserve, pick, verify, and dispatch customer orders.",
                    "Audit trail":
                      "An append-only record of warehouse execution.",
                    "ERP simulator":
                      "Import demo orders and simulate outbound confirmations.",
                  }[tab]
                }
              </p>
            </div>
            <span className="updated-label">
              {updatedAt
                ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Connecting..."}
            </span>
          </div>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}
          <fieldset disabled={busy || loading || !online} className="workspace">
            {tab === "Start here" && (
              <GuidedWorkflow
                data={data}
                mutate={mutate}
                onError={setError}
                navigate={setTab}
              />
            )}
            {tab === "Overview" && (
              <Overview
                data={data}
                stockTable={stockTable}
                openOrder={openOrder}
                navigate={setTab}
              />
            )}
            {tab === "Products" && (
              <>
                <Panel title="Register a product">
                  <Form
                    className="four-col"
                    onSubmit={(v) =>
                      mutate("/products", v, "Product registered")
                    }
                    label="Add product"
                  >
                    <Field label="SKU" name="sku" placeholder="WM-101" />
                    <Field
                      label="Product name"
                      name="name"
                      placeholder="Wireless Mouse"
                    />
                    <Field
                      label="Item barcode"
                      name="barcode"
                      placeholder="WM101"
                    />
                  </Form>
                </Panel>
                <Panel title="Product master">
                  <Table
                    headers={["SKU", "Product", "Barcode", "Label"]}
                    rows={products.map((p) => [
                      <strong>{p.sku}</strong>,
                      p.name,
                      <code>{p.barcode}</code>,
                      <button
                        className="text-button"
                        onClick={() =>
                          setLabel({ value: p.barcode, title: p.name })
                        }
                      >
                        <Printer size={15} /> Print label
                      </button>,
                    ])}
                  />
                </Panel>
              </>
            )}
            {tab === "Locations" && (
              <>
                <Panel title="Register a location">
                  <Form
                    className="three-col"
                    onSubmit={(v) =>
                      mutate(
                        "/locations",
                        { ...v, capacity: Number(v.capacity), active: true },
                        "Location created",
                      )
                    }
                    label="Add location"
                  >
                    <Field
                      label="Location code / barcode"
                      name="code"
                      placeholder="A-02"
                    />
                    <Field
                      label="Description"
                      name="description"
                      placeholder="Aisle A, bin 02"
                    />
                    <Field label="Location type" name="type">
                      {["STORAGE", "RECEIVING", "PACKING"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </Field>
                    <Field
                      label="Capacity (units)"
                      name="capacity"
                      type="number"
                      defaultValue="10000"
                    />
                  </Form>
                </Panel>
                <Panel title="Warehouse map">
                  <Table
                    headers={[
                      "Location",
                      "Description",
                      "Type",
                      "Capacity",
                      "Status",
                      "Actions",
                    ]}
                    rows={locations.map((l) => [
                      <code>{l.code}</code>,
                      l.description,
                      <Badge>{l.type}</Badge>,
                      l.capacity,
                      <Badge>{l.active ? "Active" : "Blocked"}</Badge>,
                      <div className="row-actions">
                        <button
                          className="text-button"
                          onClick={() =>
                            setLabel({ value: l.code, title: l.description })
                          }
                        >
                          <Printer size={15} /> Label
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            mutate(
                              `/locations/${l.id}/state`,
                              { active: !l.active },
                              "Location status updated",
                            )
                          }
                        >
                          {l.active ? "Block" : "Unblock"}
                        </button>
                      </div>,
                    ])}
                  />
                </Panel>
              </>
            )}
            {tab === "Inbound" && (
              <Inbound
                orders={purchase}
                mutate={mutate}
                selectedId={focusOrder}
              />
            )}
            {tab === "Inventory" && (
              <>
                <Panel
                  title="Location-level inventory"
                  description="On hand includes receiving and packing stock. Reserved units cannot be moved manually."
                >
                  {stockTable()}
                </Panel>
                <Panel
                  title="Put away / transfer"
                  description="Scan the product, source, and an active storage destination."
                >
                  <Form
                    className="three-col"
                    onSubmit={(v) =>
                      mutate(
                        "/putaway",
                        { ...v, quantity: Number(v.quantity) },
                        "Stock moved; warehouse total is unchanged",
                      )
                    }
                    label="Confirm movement"
                  >
                    <Field
                      label="Product barcode"
                      name="barcode"
                      placeholder="Scan item"
                    />
                    <Field
                      label="Source location scan"
                      name="sourceCode"
                      placeholder="RECV-01"
                    />
                    <Field
                      label="Destination location scan"
                      name="destinationCode"
                      placeholder="A-01"
                    />
                    <Field
                      label="Quantity"
                      name="quantity"
                      type="number"
                      defaultValue="50"
                    />
                  </Form>
                </Panel>
              </>
            )}
            {tab === "Outbound" && (
              <Outbound
                orders={sales}
                mutate={mutate}
                onError={setError}
                selectedId={focusOrder}
              />
            )}
            {tab === "Audit trail" && (
              <Panel
                title="Stock transaction ledger"
                description="Demo actor: local-demo-operator · Local timezone"
              >
                <Table
                  headers={[
                    "Event",
                    "Reference",
                    "SKU",
                    "From → To",
                    "Units",
                    "Timestamp",
                    "Correlation",
                  ]}
                  rows={[...transactions]
                    .reverse()
                    .map((t) => [
                      <Badge>{t.type}</Badge>,
                      t.reference || "—",
                      t.sku,
                      `${t.sourceLocation || "—"} → ${t.destinationLocation || "—"}`,
                      t.quantity,
                      new Date(t.createdAt).toLocaleString(),
                      <small>{t.correlationKey || "—"}</small>,
                    ])}
                />
              </Panel>
            )}
            {tab === "ERP simulator" && (
              <>
                <div className="sim-note">
                  <PlugZap size={19} />
                  <div>
                    <strong>Demo ERP Simulator</strong>
                    <p>
                      Local orders and simulated ERP responses. No live ERP is
                      connected.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      mutate(
                        "/demo/seed",
                        {},
                        "Demo master data ready: WM101, RECV-01, A-01, PACK-01",
                      )
                    }
                  >
                    Prepare demo data
                  </button>
                </div>
                <div className="two-col">
                  <OrderEditor
                    kind="purchase"
                    products={products}
                    mutate={mutate}
                  />
                  <OrderEditor
                    kind="sales"
                    products={products}
                    mutate={mutate}
                  />
                </div>
                <Panel
                  title="Outbound confirmation queue"
                  description="Simulate a failure, then retry. Warehouse work remains committed."
                >
                  <Table
                    headers={[
                      "Event / Reference",
                      "Transaction key",
                      "Status",
                      "Attempts",
                      "Simulator response",
                    ]}
                    rows={[...messages].reverse().map((m) => [
                      <>
                        <strong>{m.type}</strong>
                        <small>{m.reference}</small>
                        {m.error && (
                          <small className="text-red">{m.error}</small>
                        )}
                      </>,
                      <code className="tiny">{m.transactionKey}</code>,
                      <Badge>{m.status}</Badge>,
                      m.attempts,
                      m.status === "ACKNOWLEDGED" ? (
                        <span className="muted">Confirmed by simulator</span>
                      ) : (
                        <div className="row-actions">
                          <button
                            className="text-button"
                            onClick={() =>
                              mutate(
                                `/erp-messages/${m.id}/acknowledge`,
                                { fail: false },
                                "Simulated ERP acknowledged the message",
                              )
                            }
                          >
                            {m.status === "FAILED"
                              ? "Retry / acknowledge"
                              : "Acknowledge"}
                          </button>
                          <button
                            className="text-button"
                            onClick={() =>
                              mutate(
                                `/erp-messages/${m.id}/acknowledge`,
                                { fail: true },
                                "Simulated failure recorded; stock is unchanged",
                              )
                            }
                          >
                            Simulate failure
                          </button>
                        </div>
                      ),
                    ])}
                  />
                </Panel>
              </>
            )}
          </fieldset>
          <footer>
            Warehouse Center{" "}
            <span>Jury MVP · Local operations · No authentication enabled</span>
          </footer>
        </div>
      </main>
      {label && <BarcodeLabel label={label} close={() => setLabel(null)} />}
    </div>
  );
}
function BarcodeLabel({ label, close }) {
  const svg = useRef();
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      JsBarcode(svg.current, label.value, {
        format: "CODE128",
        width: 2,
        height: 75,
        displayValue: true,
      });
    } catch (e) {
      setError(e.message);
    }
  }, [label]);
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-top">
          <h2>Barcode label</h2>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close label"
          >
            <X size={18} />
          </button>
        </div>
        <div className="print-label">
          <strong>{label.title}</strong>
          {error ? <p role="alert">{error}</p> : <svg ref={svg} />}
        </div>
        <button disabled={!!error} onClick={() => window.print()}>
          <Printer size={16} /> Print label
        </button>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <AccessGate>
    <App />
  </AccessGate>,
);
