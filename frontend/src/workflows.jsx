import React, { useEffect, useState } from "react";
import { Plus, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { api, Badge, Table, Field, Form, Panel } from "./ui";
export function OrderEditor({ kind, products, mutate }) {
  const [lines, setLines] = useState([
    { productId: "", quantity: kind === "purchase" ? 50 : 10 },
  ]);
  const po = kind === "purchase";
  return (
    <Panel
      title={`Import ${po ? "purchase" : "sales"} order`}
      description="Simulated ERP → Warehouse Center"
    >
      <Form
        onSubmit={(v) =>
          mutate(
            `/mock-erp/${kind}-orders`,
            {
              reference: v.reference,
              partner: v.partner,
              lines: lines.map((l) => ({
                productId: Number(l.productId),
                quantity: Number(l.quantity),
              })),
            },
            `${po ? "Purchase" : "Sales"} order imported`,
          )
        }
        label="Import order"
      >
        <div className="two-col">
          <Field
            name="reference"
            label="Unique ERP reference"
            placeholder={po ? "PO-1001" : "SO-1001"}
          />
          <Field
            name="partner"
            label={po ? "Supplier" : "Customer"}
            placeholder={po ? "Demo supplier" : "Demo customer"}
          />
        </div>
        {lines.map((l, i) => (
          <div className="order-line" key={i}>
            <Field
              label="Product"
              value={l.productId}
              required
              onChange={(e) =>
                setLines(
                  lines.map((x, j) =>
                    j === i ? { ...x, productId: e.target.value } : x,
                  ),
                )
              }
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.name}
                </option>
              ))}
            </Field>
            <Field
              label="Units"
              type="number"
              value={l.quantity}
              onChange={(e) =>
                setLines(
                  lines.map((x, j) =>
                    j === i ? { ...x, quantity: e.target.value } : x,
                  ),
                )
              }
            />
            {lines.length > 1 && (
              <button
                type="button"
                className="icon-button"
                aria-label="Remove line"
                onClick={() => setLines(lines.filter((_, j) => i !== j))}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          className="text-button"
          type="button"
          onClick={() => setLines([...lines, { productId: "", quantity: 1 }])}
        >
          <Plus size={15} /> Add order line
        </button>
      </Form>
    </Panel>
  );
}
function OrderSelect({ orders, id, setId }) {
  return (
    <Field
      label="Select order"
      value={id}
      onChange={(e) => setId(e.target.value)}
    >
      <option value="">Choose an order</option>
      {orders.map((o) => (
        <option key={o.id} value={o.id}>
          {o.reference} · {o.status}
        </option>
      ))}
    </Field>
  );
}
function OrderDetails({ order }) {
  return (
    <div className="order-details">
      <div>
        <strong>{order.reference}</strong>
        <span>{order.partner}</span>
        <Badge>{order.status}</Badge>
      </div>
      <Table
        headers={["Product", "Expected / ordered", "Received"]}
        rows={order.lines.map((l) => [
          `${l.product.sku} · ${l.product.name}`,
          l.quantity,
          order.kind === "PURCHASE" ? l.received : "—",
        ])}
      />
    </div>
  );
}
export function Inbound({ orders, mutate, selectedId = "", readOnly = false }) {
  const [id, setId] = useState(selectedId);
  useEffect(() => {
    setId(selectedId);
  }, [selectedId]);
  const order = orders.find((o) => String(o.id) === id);
  return (
    <>
      <Panel
        title="Purchase orders"
        description="Import expected orders from the ERP simulator first."
      >
        <OrderSelect {...{ orders, id, setId }} />
        {order && <OrderDetails order={order} />}
      </Panel>
      {!readOnly && order && order.status !== "RECEIVED" && (
        <Panel
          title="Receive against purchase order"
          description="Scan or type the barcode. Over-receipts and mismatched products are rejected."
        >
          <Form
            className="three-col"
            onSubmit={(v) =>
              mutate(
                `/purchase-orders/${id}/receive`,
                { ...v, quantity: Number(v.quantity) },
                "Receipt committed with stock ledger and ERP confirmation",
              )
            }
            label="Confirm receipt"
          >
            <Field
              scan
              label="Product barcode scan"
              name="barcode"
              placeholder="WM101"
            />
            <Field
              scan
              label="Receiving location scan"
              name="locationCode"
              defaultValue="RECV-01"
            />
            <Field
              label="Quantity"
              name="quantity"
              type="number"
              defaultValue="50"
            />
          </Form>
        </Panel>
      )}
      {order?.status === "RECEIVED" && (
        <div className="alert success">
          <CheckCircle2 size={18} /> Purchase order fully received. Continue to
          Inventory to put away the stock.
        </div>
      )}
      <Panel title="Inbound order register">
        <Table
          headers={[
            "Reference",
            "Supplier",
            "Status",
            "Expected units",
            "Received units",
          ]}
          rows={orders.map((o) => [
            o.reference,
            o.partner,
            <Badge>{o.status}</Badge>,
            o.lines.reduce((n, l) => n + l.quantity, 0),
            o.lines.reduce((n, l) => n + l.received, 0),
          ])}
        />
      </Panel>
    </>
  );
}
export function Outbound({
  orders,
  mutate,
  onError,
  selectedId = "",
  readOnly = false,
  canAllocate = true,
}) {
  const [id, setId] = useState(selectedId),
    [tasks, setTasks] = useState([]),
    [fetching, setFetching] = useState(false);
  const order = orders.find((o) => String(o.id) === id);
  useEffect(() => {
    setId(selectedId);
  }, [selectedId]);
  useEffect(() => {
    let active = true;
    setTasks([]);
    if (id) {
      setFetching(true);
      api(`/sales-orders/${id}/tasks`)
        .then((x) => {
          if (active) setTasks(x);
        })
        .catch((e) => {
          if (active) onError(e.message);
        })
        .finally(() => {
          if (active) setFetching(false);
        });
    }
    return () => {
      active = false;
    };
  }, [id, order?.status]);
  async function pick(task, v) {
    if (
      await mutate(
        `/pick-tasks/${task.id}/confirm`,
        { ...v, quantity: Number(v.quantity) },
        "Pick validated; stock moved to packing without reducing physical on hand",
      )
    ) {
      try {
        setTasks(await api(`/sales-orders/${id}/tasks`));
      } catch (e) {
        onError(e.message);
      }
    }
  }
  return (
    <>
      <Panel
        title="Sales orders"
        description="Reserve available stock, then complete scan-verified fulfilment."
      >
        <OrderSelect {...{ orders, id, setId }} />
        {order && <OrderDetails order={order} />}
      </Panel>
      {order && !readOnly && (
        <>
          <div className="steps">
            {["OPEN", "ALLOCATED", "PICKED", "PACKED", "SHIPPED"].map(
              (s, i) => (
                <div key={s} className={order.status === s ? "current" : ""}>
                  <b>{i + 1}</b>
                  {s}
                </div>
              ),
            )}
          </div>
          {order.status === "OPEN" && canAllocate && (
            <Panel
              title="Allocate available stock"
              description="The entire order is reserved atomically. If any product is short, nothing is reserved."
            >
              <button
                onClick={() =>
                  mutate(
                    `/sales-orders/${id}/allocate`,
                    {},
                    "Stock reserved and pick tasks created",
                  )
                }
              >
                Allocate order <ArrowRight size={15} />
              </button>
            </Panel>
          )}
          {order.status === "OPEN" && !canAllocate && (
            <Panel
              title="Awaiting supervisor allocation"
              description="A Supervisor must reserve stock before you can pick this order."
            />
          )}
          {fetching && <p>Loading pick tasks…</p>}
          {["ALLOCATED", "PICKING"].includes(order.status) &&
            tasks.map((t) => (
              <Panel
                key={t.id}
                title={`Pick ${t.quantity} × ${t.line.product.sku}`}
                description={`Location: ${t.inventory.location.code} · ${t.picked ? "Completed" : "Scan source and item to verify"}`}
              >
                {t.picked ? (
                  <Badge>Picked</Badge>
                ) : (
                  <Form
                    className="three-col"
                    onSubmit={(v) => pick(t, v)}
                    label="Confirm pick"
                  >
                    <Field
                      scan
                      name="barcode"
                      label="Product barcode scan"
                      placeholder="Scan item"
                    />
                    <Field
                      scan
                      name="sourceCode"
                      label="Source location scan"
                      placeholder="Scan source bin"
                    />
                    <Field
                      scan
                      name="packingCode"
                      label="Packing / staging location"
                      defaultValue="PACK-01"
                    />
                    <Field
                      name="quantity"
                      label="Exact task quantity"
                      type="number"
                      defaultValue={t.quantity}
                    />
                  </Form>
                )}
              </Panel>
            ))}
          {order.status === "PICKED" && (
            <Panel
              title="Verify and pack"
              description="Scan each product and its total order quantity, then assign a unique carton."
            >
              <Form
                key={order.id}
                onSubmit={(v) =>
                  mutate(
                    `/sales-orders/${id}/pack`,
                    {
                      cartonBarcode: v.cartonBarcode,
                      scans: order.lines.map((l) => ({
                        barcode: v["barcode" + l.id],
                        quantity: Number(v["qty" + l.id]),
                      })),
                    },
                    "Order verified, packed, and staged at the packing lane",
                  )
                }
                label="Verify and seal carton"
              >
                {order.lines.map((l) => (
                  <div key={l.id} className="two-col">
                    <Field
                      scan
                      label={`${l.product.sku} · product barcode scan`}
                      name={"barcode" + l.id}
                    />
                    <Field
                      label={`Quantity (expected ${l.quantity})`}
                      type="number"
                      name={"qty" + l.id}
                    />
                  </div>
                ))}
                <Field
                  scan
                  label="Unique shipping carton barcode"
                  name="cartonBarcode"
                  placeholder="CARTON-1001"
                />
              </Form>
            </Panel>
          )}
          {["PACKED", "SHIPPED"].includes(order.status) && (
            <Panel
              title={
                order.status === "SHIPPED"
                  ? "Shipment completed"
                  : "Dispatch staged carton"
              }
              description={`Carton: ${order.cartonBarcode} · Dispatch reduces warehouse on hand.`}
            >
              {order.status === "SHIPPED" ? (
                <div className="alert success">
                  <CheckCircle2 size={18} /> Order shipped. Confirmation queued
                  in the ERP simulator.
                </div>
              ) : (
                <Form
                  onSubmit={(v) =>
                    mutate(
                      `/sales-orders/${id}/dispatch`,
                      v,
                      "Shipment confirmed. Stock reduced exactly once; ERP confirmation queued.",
                    )
                  }
                  label="Confirm dispatch"
                >
                  <Field
                    scan
                    label="Shipping carton barcode scan"
                    name="cartonBarcode"
                    placeholder="Scan carton"
                  />
                </Form>
              )}
            </Panel>
          )}
        </>
      )}
      <Panel title="Outbound order register">
        <Table
          headers={["Reference", "Customer", "Status", "Units", "Carton"]}
          rows={orders.map((o) => [
            o.reference,
            o.partner,
            <Badge>{o.status}</Badge>,
            o.lines.reduce((n, l) => n + l.quantity, 0),
            o.cartonBarcode || "—",
          ])}
        />
      </Panel>
    </>
  );
}
