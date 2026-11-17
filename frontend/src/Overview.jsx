import React, { useState } from "react";
import { useAccess } from "./AccessContext";
import { ArrowRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge, Panel, Table } from "./ui";

export function Overview({ data, stockTable, openOrder, navigate }) {
  const { role } = useAccess();
  const [filter, setFilter] = useState("All orders");
  const { inventory, purchase, sales, transactions, messages } = data;
  const total = inventory.reduce((n, i) => n + i.quantity, 0),
    reserved = inventory.reduce((n, i) => n + i.reserved, 0);
  const orders = [...purchase, ...sales].sort((a, b) => b.id - a.id);
  const visible = orders.filter(
    (o) =>
      filter === "All orders" ||
      (filter === "Inbound" ? o.kind === "PURCHASE" : o.kind === "SALES"),
  );
  const open = orders.filter(
    (o) => !["RECEIVED", "SHIPPED"].includes(o.status),
  ).length;
  const failed = messages.filter((m) => m.status === "FAILED").length;
  return (
    <>
      <div className="stats">
        {[
          ["On hand", total, "Physical units in warehouse"],
          ["Available", total - reserved, "Units not reserved"],
          ["Reserved", reserved, "Committed to customer orders"],
          ["Open orders", open, "Inbound and outbound"],
        ].map(([label, value, description]) => (
          <div className="stat" key={label}>
            <div>{label}</div>
            <strong>{value.toLocaleString()}</strong>
            <small>{description}</small>
          </div>
        ))}
      </div>
      {failed > 0 && role === "ADMIN" && (
        <div className="exception-strip">
          <span>
            {failed} ERP{" "}
            {failed === 1 ? "message requires" : "messages require"} attention
          </span>
          <button
            className="text-button"
            onClick={() => navigate("ERP simulator")}
          >
            Review messages <ArrowRight size={14} />
          </button>
        </div>
      )}
      <Panel
        title="Order queue"
        description={`${orders.length} orders recorded`}
        action={
          role === "ADMIN" && (
            <button
              className="text-button"
              onClick={() => navigate("Start here")}
            >
              New workflow <ArrowRight size={14} />
            </button>
          )
        }
      >
        <div className="table-toolbar">
          <div className="segmented" aria-label="Filter order queue">
            {["All orders", "Inbound", "Outbound"].map((option) => (
              <button
                key={option}
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <span className="muted">{visible.length} results</span>
        </div>
        <Table
          headers={[
            "Order reference",
            "Direction",
            "Partner",
            "Units",
            "Status",
            "",
          ]}
          rows={visible.slice(0, 8).map((o) => [
            <strong className="mono">{o.reference}</strong>,
            <span className="direction">
              {o.kind === "PURCHASE" ? (
                <ArrowDownLeft size={14} />
              ) : (
                <ArrowUpRight size={14} />
              )}{" "}
              {o.kind === "PURCHASE" ? "Inbound" : "Outbound"}
            </span>,
            o.partner,
            o.lines.reduce((n, l) => n + l.quantity, 0),
            <Badge>{o.status}</Badge>,
            <button
              className="text-button"
              aria-label={`Open ${o.reference}`}
              onClick={() => openOrder(o)}
            >
              Open <ArrowRight size={13} />
            </button>,
          ])}
          empty="No orders recorded. Start a workflow to receive your first delivery."
        />
        {visible.length > 8 && (
          <div className="table-foot">
            Showing the 8 most recent orders. Open Inbound or Outbound for the
            full register.
          </div>
        )}
      </Panel>
      <Panel
        title="Inventory position"
        description="Current balances by product and location"
        action={
          <button className="text-button" onClick={() => navigate("Inventory")}>
            Inventory register <ArrowRight size={14} />
          </button>
        }
      >
        {stockTable()}
      </Panel>
      <Panel
        title="Recent movements"
        description="Latest recorded warehouse events"
      >
        <Table
          headers={[
            "Event",
            "Reference",
            "SKU",
            "From / to",
            "Units",
            "Recorded",
          ]}
          rows={[...transactions]
            .sort((a, b) => b.id - a.id)
            .slice(0, 5)
            .map((t) => [
              <Badge>{t.type}</Badge>,
              <span className="mono">{t.reference || "—"}</span>,
              <span className="mono">{t.sku}</span>,
              `${t.sourceLocation || "—"} / ${t.destinationLocation || "—"}`,
              t.quantity,
              new Date(t.createdAt).toLocaleString([], {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
            ])}
        />
      </Panel>
    </>
  );
}
