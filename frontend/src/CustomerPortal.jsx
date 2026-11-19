import React, { useEffect, useRef, useState } from "react";
import { Boxes, ArrowLeft, Plus, X } from "lucide-react";
import { api, Field, Panel } from "./ui";
import "./CustomerPortal.css";

export function CustomerPortal() {
  const [catalog, setCatalog] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [customer, setCustomer] = useState(""),
    [confirmation, setConfirmation] = useState(null),
    [lines, setLines] = useState([{ productId: "", quantity: 1 }]);
  const requestId = useRef(null);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setCatalog(await api("/customer/catalog"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  function update(index, patch) {
    requestId.current = null;
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  const enough = lines.every((l) => {
    const item = catalog.find((p) => p.id === Number(l.productId));
    return (
      item &&
      Number.isSafeInteger(Number(l.quantity)) &&
      Number(l.quantity) > 0 &&
      Number(l.quantity) <= 10000 &&
      item.available >= Number(l.quantity)
    );
  });
  const duplicate =
    new Set(lines.map((l) => l.productId)).size !== lines.length;
  async function submit(e) {
    e.preventDefault();
    if (busy || !enough || duplicate) return;
    requestId.current ||= crypto.randomUUID();
    setBusy(true);
    setError("");
    try {
      const result = await api("/customer/orders", "POST", {
        requestId: requestId.current,
        customerName: customer.trim(),
        lines: lines.map((l) => ({
          productId: Number(l.productId),
          quantity: Number(l.quantity),
        })),
      });
      setConfirmation(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="customer-portal">
      <header className="customer-header">
        <div>
          <Boxes size={24} />
          <strong>Warehouse Center</strong>
          <span>Customer orders</span>
        </div>
        <a href="/">
          Staff sign-in <ArrowLeft size={14} />
        </a>
      </header>
      <main className="customer-content">
        <div className="customer-intro">
          <span>CUSTOMER DESK</span>
          <h1>Place an order.</h1>
          <p>
            Check available products and send your request to the warehouse
            team.
          </p>
        </div>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {confirmation ? (
          <Panel
            title="Order request received"
            description="The warehouse team will review and allocate stock before fulfilment."
          >
            <div className="customer-confirmation" role="status">
              <span>Your order reference</span>
              <strong>{confirmation.reference}</strong>
              <p>
                Keep this reference. Your request is recorded; it is not a
                dispatch confirmation.
              </p>
            </div>
            <button
              onClick={() => {
                setConfirmation(null);
                setLines([{ productId: "", quantity: 1 }]);
                requestId.current = null;
                refresh();
              }}
            >
              Place another order
            </button>
          </Panel>
        ) : (
          <>
            <Panel
              title="Your order"
              description="Availability covers unreserved stock ready in storage. Requests do not reserve stock until confirmed by staff."
              action={
                <button
                  className="text-button"
                  disabled={busy || loading}
                  onClick={refresh}
                >
                  {loading ? "Checking stock…" : "Refresh availability"}
                </button>
              }
            >
              <form onSubmit={submit}>
                <fieldset disabled={busy || loading}>
                  <Field
                    label="Your name / company"
                    name="customerName"
                    maxLength={200}
                    value={customer}
                    onChange={(e) => {
                      setCustomer(e.target.value);
                      requestId.current = null;
                    }}
                  />
                  {lines.map((line, index) => {
                    const item = catalog.find(
                      (p) => p.id === Number(line.productId),
                    );
                    return (
                      <div className="customer-order-line" key={index}>
                        <div className="customer-order-inputs">
                          <Field
                            label={`Product ${index + 1}`}
                            value={line.productId}
                            onChange={(e) =>
                              update(index, { productId: e.target.value })
                            }
                          >
                            <option value="">Choose a product</option>
                            {catalog.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} · {p.sku}
                              </option>
                            ))}
                          </Field>
                          <Field
                            label={`Quantity ${index + 1}`}
                            type="number"
                            max={10000}
                            value={line.quantity}
                            onChange={(e) =>
                              update(index, { quantity: e.target.value })
                            }
                          />
                          {lines.length > 1 && (
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Remove product ${index + 1}`}
                              onClick={() => {
                                setLines(lines.filter((_, i) => i !== index));
                                requestId.current = null;
                              }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        {item && (
                          <p className="customer-stock" role="status">
                            {item.available} units available
                            {Number(line.quantity) > item.available
                              ? ` · Short by ${Number(line.quantity) - item.available} units`
                              : ""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {duplicate && (
                    <p role="alert">
                      Choose each product once and combine its quantity on one
                      line.
                    </p>
                  )}
                  <div className="customer-submit">
                    <button
                      className="text-button"
                      type="button"
                      disabled={lines.length >= 20}
                      onClick={() => {
                        setLines([...lines, { productId: "", quantity: 1 }]);
                        requestId.current = null;
                      }}
                    >
                      <Plus size={15} />
                      Add product
                    </button>
                    <button
                      type="submit"
                      disabled={!enough || duplicate || !customer.trim()}
                    >
                      {busy ? "Submitting…" : "Submit order request"}
                    </button>
                  </div>
                </fieldset>
              </form>
            </Panel>
            {!loading && catalog.length === 0 && (
              <p>
                No products are listed yet. Please check with the warehouse
                team.
              </p>
            )}
            <p className="customer-note">
              This MVP records order requests. Payment and delivery booking are
              handled outside this application.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
