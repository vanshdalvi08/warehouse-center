import React, { useRef, useState } from "react";
import { Panel } from "./ui";

export function DemoCustomerOrder({ products, mutate, navigate }) {
  const product = products.find((p) => p.barcode === "WM101");
  const [created, setCreated] = useState(null);
  const pending = useRef(false);
  async function create() {
    if (!product || pending.current) return;
    pending.current = true;
    try {
      const order = await mutate(
        "/mock-erp/sales-orders",
        {
          reference: `SO-DEMO-${crypto.randomUUID()}`,
          partner: "Demo Customer",
          lines: [{ productId: product.id, quantity: 10 }],
        },
        "Demo customer order created. Review it under Orders before allocation.",
      );
      if (order) setCreated(order);
    } finally {
      pending.current = false;
    }
  }
  return (
    <Panel
      title="Demo customer request"
      description="Simulate an outside customer ordering 10 wireless mice. This creates an open order without changing or reserving stock."
    >
      {product ? (
        <p className="muted">
          Demo Customer · 10 × {product.name} ({product.sku})
        </p>
      ) : (
        <p className="muted">
          An Admin must prepare demo data to register Wireless Mouse first.
        </p>
      )}
      <div className="row-actions">
        <button disabled={!product} onClick={create}>
          Create demo customer order
        </button>
        {created && (
          <button className="text-button" onClick={() => navigate("Orders")}>
            Review demo order
          </button>
        )}
      </div>
      {created && (
        <p role="status">
          Created {created.reference}. Allocate it when stock is available.
        </p>
      )}
    </Panel>
  );
}
