import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Badge, Field, Panel, Table } from "./ui";
import "./CustomerOrders.css";

export function availableForOrder(inventory, productId) {
  return inventory
    .filter(
      (row) =>
        row.product.id === Number(productId) &&
        row.location.active &&
        row.location.type === "STORAGE",
    )
    .reduce((total, row) => total + row.quantity - row.reserved, 0);
}

export function CustomerOrders({
  data,
  openOrder,
  mutate,
  canSupervise,
  reload,
}) {
  const { products, inventory, sales } = data;
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [filter, setFilter] = useState("Open");
  const product = products.find((p) => p.id === Number(productId));
  const available = availableForOrder(inventory, productId);
  const validQuantity =
    Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0;
  const rows = [...sales]
    .sort((a, b) => b.id - a.id)
    .filter(
      (o) =>
        filter === "All" ||
        (filter === "Shipped"
          ? o.status === "SHIPPED"
          : o.status !== "SHIPPED"),
    );
  return (
    <>
      <div className="customer-order-link">
        <span>Customers can place requests on a separate page.</span>
        <a href="/order" target="_blank" rel="noreferrer">
          Open customer ordering page ↗
        </a>
        <button className="text-button" onClick={reload}>
          Refresh orders
        </button>
      </div>
      <Panel
        title="Check item availability"
        description="Only unreserved stock in active storage bins can be assigned to a new customer order."
      >
        <div className="order-availability-inputs">
          <Field
            label="Check product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">Choose a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </option>
            ))}
          </Field>
          <Field
            label="Requested units"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        {product && (
          <div className="order-availability-result" role="status">
            <strong>{available} units available to reserve</strong>
            <span>
              {!validQuantity
                ? "Enter a whole quantity of at least 1."
                : available >= Number(quantity)
                  ? `Enough stock for ${quantity} units of ${product.name}.`
                  : `Short by ${Number(quantity) - available} units. Receive and store additional stock before allocation.`}
            </span>
            <small>
              Checking availability does not reserve stock. Allocation checks it
              again before committing.
            </small>
          </div>
        )}
      </Panel>
      <Panel
        title="Customer orders"
        description="Review customer demand, check shortages, then continue to warehouse fulfilment."
        action={
          <Field
            label="Show orders"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["Open", "Shipped", "All"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </Field>
        }
      >
        <Table
          headers={[
            "Order / customer",
            "Items",
            "Source",
            "Status",
            "Stock check",
            "Action",
          ]}
          empty="No customer orders in this view."
          rows={rows.map((order) => {
            const shortages = order.lines.filter(
              (l) => availableForOrder(inventory, l.product.id) < l.quantity,
            );
            const ready = shortages.length === 0;
            return [
              <>
                <strong>{order.reference}</strong>
                <small>{order.partner}</small>
              </>,
              <div>
                {order.lines.map((l) => (
                  <div key={l.id || l.product.id}>
                    {l.quantity} × {l.product.name}
                  </div>
                ))}
              </div>,
              order.source === "CUSTOMER" ? "Customer page" : "ERP / demo",
              <Badge>{order.status}</Badge>,
              order.status === "OPEN" ? (
                <div>
                  {ready
                    ? "Ready to allocate"
                    : shortages.map((l) => (
                        <div key={l.id || l.product.id}>
                          {l.product.sku}: short{" "}
                          {l.quantity -
                            availableForOrder(inventory, l.product.id)}
                        </div>
                      ))}
                </div>
              ) : order.status === "SHIPPED" ? (
                "Completed"
              ) : (
                "Stock assigned to this order"
              ),
              <div className="row-actions">
                {order.status === "OPEN" && canSupervise && (
                  <button
                    disabled={!ready}
                    onClick={() =>
                      mutate(
                        `/sales-orders/${order.id}/allocate`,
                        {},
                        "Customer order allocated; picking tasks are ready.",
                      )
                    }
                  >
                    Allocate order
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={() => openOrder(order)}
                >
                  {order.status === "SHIPPED"
                    ? "View shipment"
                    : "Open fulfilment"}
                  <ArrowRight size={14} />
                </button>
              </div>,
            ];
          })}
        />
      </Panel>
    </>
  );
}
