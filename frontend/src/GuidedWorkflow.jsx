import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Package, MapPin, Truck } from "lucide-react";
import { api, Field, Form, Panel } from "./ui";

const STORAGE_KEY = "warehouse-center-guided-v1";
const steps = [
  "Prepare",
  "Expect delivery",
  "Receive",
  "Store",
  "Customer order",
  "Reserve",
  "Collect",
  "Pack",
  "Send",
  "Finished",
];
function readGuide() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      value &&
      Number.isInteger(value.step) &&
      value.step >= 0 &&
      value.step <= 9
    )
      return value;
  } catch {
    /* A blocked or empty browser store should not prevent using the guide. */
  }
  return { step: 0 };
}
function LocationOptions({ locations, type }) {
  return (
    <>
      <option value="">Choose a location</option>
      {locations
        .filter((l) => l.active && l.type === type)
        .map((l) => (
          <option key={l.id} value={l.code}>
            {l.description} ({l.code})
          </option>
        ))}
    </>
  );
}
function Hint({ children }) {
  return <div className="guide-hint">{children}</div>;
}

export function GuidedWorkflow({ data, mutate, onError, navigate }) {
  const [guide, setGuide] = useState(readGuide);
  const [tasks, setTasks] = useState([]),
    [tasksLoading, setTasksLoading] = useState(false),
    [taskError, setTaskError] = useState("");
  const { products, locations, inventory, purchase, sales } = data;
  const po = purchase.find((o) => o.id === guide.poId);
  const so = sales.find((o) => o.id === guide.soId);
  const product = products.find((p) => p.id === guide.productId);
  const onHand = inventory.reduce((n, i) => n + i.quantity, 0);
  const reserved = inventory.reduce((n, i) => n + i.reserved, 0);
  function save(patch) {
    setGuide((previous) => ({ ...previous, ...patch }));
  }
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guide));
    } catch {
      /* The workflow still works without resume storage. */
    }
  }, [guide]);
  async function refreshTasks() {
    setTasksLoading(true);
    setTaskError("");
    try {
      const rows = await api(`/sales-orders/${guide.soId}/tasks`);
      setTasks(rows);
    } catch (e) {
      setTaskError(e.message);
      onError(e.message);
    } finally {
      setTasksLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    if (guide.step !== 6 || !guide.soId) return;
    setTasksLoading(true);
    setTasks([]);
    setTaskError("");
    api(`/sales-orders/${guide.soId}/tasks`)
      .then((rows) => {
        if (active) setTasks(rows);
      })
      .catch((e) => {
        if (active) {
          setTaskError(e.message);
          onError(e.message);
        }
      })
      .finally(() => {
        if (active) setTasksLoading(false);
      });
    return () => {
      active = false;
    };
  }, [guide.step, guide.soId, so?.status]);
  const missingOrder =
    (guide.step >= 2 && guide.step <= 3 && !po) ||
    (guide.step >= 5 && guide.step <= 9 && !so);
  // Recover when an operation succeeded but the page closed before the next step was saved.
  const alreadyReceived = guide.step === 2 && po?.status === "RECEIVED";
  const alreadyMoved =
    guide.step === 3 &&
    inventory
      .filter(
        (i) =>
          i.product.id === guide.productId &&
          i.location.code === guide.receivingCode,
      )
      .reduce((n, i) => n + i.available, 0) < guide.receivedQty;
  const reference = (prefix) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return (
    <div className="guided-workflow">
      <div className="guide-intro">
        <div className="guide-eyebrow">RECEIPT TO DISPATCH</div>
        <h2>Warehouse workflow</h2>
        <p>
          Record the delivery, place goods in storage, and fulfil the customer
          order.
        </p>
      </div>
      <ol className="guide-progress" aria-label="Workflow progress">
        {steps.map((title, index) => (
          <li
            key={title}
            className={
              index === guide.step
                ? "current"
                : index < guide.step
                  ? "done"
                  : ""
            }
            aria-current={index === guide.step ? "step" : undefined}
          >
            <span>
              {index < guide.step ? (
                <Check size={13} />
              ) : index === 0 ? (
                <Package size={11} />
              ) : index === 9 ? (
                <Check size={13} />
              ) : (
                index
              )}
            </span>
            {title}
          </li>
        ))}
      </ol>
      <div className="guide-layout">
        <div className="guide-action" aria-live="polite">
          {missingOrder ? (
            <Panel
              title="This walkthrough's order is not available"
              description="The database may have changed. Your other warehouse records have not been deleted."
            >
              <button onClick={() => setGuide({ step: 0 })}>
                Start a new walkthrough
              </button>
            </Panel>
          ) : (
            <>
              {guide.step === 0 && (
                <Panel
                  title="Create a warehouse workflow"
                  description="We will use Wireless Mouse as the example product."
                >
                  <div className="guide-body">
                    <div className="guide-story">
                      <Package />
                      <div>
                        <strong>Inbound receipt</strong>
                        <p>
                          Receive expected goods and confirm their storage
                          location.
                        </p>
                      </div>
                    </div>
                    <div className="guide-story">
                      <Truck />
                      <div>
                        <strong>Outbound fulfilment</strong>
                        <p>
                          Reserve stock, verify the pick, and confirm dispatch.
                        </p>
                      </div>
                    </div>
                    <Hint>
                      You currently have <strong>{onHand} units</strong> in the
                      warehouse. This walkthrough adds real demo records; it
                      does not clear existing stock. You can change the
                      quantities as you go.
                    </Hint>
                    <button
                      onClick={async () => {
                        if (
                          await mutate(
                            "/demo/seed",
                            {},
                            "The sample product and locations are ready.",
                          )
                        )
                          save({
                            step: 1,
                            startedWith: onHand,
                            poReference: reference("PO"),
                            soReference: reference("SO"),
                            cartonReference: reference("BOX"),
                          });
                      }}
                    >
                      Start workflow <ArrowRight size={16} />
                    </button>
                  </div>
                </Panel>
              )}
              {guide.step === 1 && (
                <Panel
                  title="1. Expected delivery"
                  description="Tell the warehouse what the supplier is going to deliver. This is called a purchase order."
                >
                  <Form
                    label="Save expected delivery"
                    onSubmit={async (v) => {
                      const result = await mutate(
                        "/mock-erp/purchase-orders",
                        {
                          reference: v.reference,
                          partner: v.partner,
                          lines: [
                            {
                              productId: Number(v.productId),
                              quantity: Number(v.quantity),
                            },
                          ],
                        },
                        "Expected delivery saved. Next, check in the actual goods.",
                      );
                      if (result)
                        save({
                          step: 2,
                          poId: result.id,
                          productId: Number(v.productId),
                          expectedQty: Number(v.quantity),
                        });
                    }}
                  >
                    <Field
                      label="Product arriving"
                      name="productId"
                      defaultValue={
                        products.find((p) => p.barcode === "WM101")?.id || ""
                      }
                      required
                    >
                      <option value="">Choose a product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </Field>
                    <div className="two-col">
                      <Field
                        label="How many units are arriving?"
                        name="quantity"
                        type="number"
                        defaultValue="50"
                      />
                      <Field
                        label="Supplier's name"
                        name="partner"
                        defaultValue="Demo supplier"
                      />
                    </div>
                    <details className="guide-details">
                      <summary>Delivery reference (already filled in)</summary>
                      <Field
                        label="Unique purchase order reference"
                        name="reference"
                        defaultValue={guide.poReference}
                      />
                      <p>This is an order number, not a barcode to scan.</p>
                    </details>
                    <Hint>
                      Saving this order does not add stock. It only records what
                      you expect. The order comes from the local ERP simulator.
                    </Hint>
                  </Form>
                </Panel>
              )}
              {guide.step === 2 && (
                <Panel
                  title="2. Receive delivery"
                  description={`You are expecting ${guide.expectedQty} × ${product?.name}. Check the product and count the goods.`}
                >
                  {alreadyReceived ? (
                    <div className="guide-body">
                      <Hint>
                        This order has already been received. It will not be
                        received again.
                      </Hint>
                      <button
                        onClick={() => {
                          const stock = inventory.find(
                            (i) =>
                              i.product.id === guide.productId &&
                              i.location.type === "RECEIVING" &&
                              i.available > 0,
                          );
                          if (!stock) {
                            onError(
                              "No unreserved receiving stock found. Review Inventory before continuing.",
                            );
                            return;
                          }
                          save({
                            step: 3,
                            receivedQty: guide.expectedQty,
                            receivingCode: stock.location.code,
                          });
                        }}
                      >
                        Continue to storage <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <Form
                      key={po?.lines[0]?.received}
                      label="Confirm goods received"
                      onSubmit={async (v) => {
                        const result = await mutate(
                          `/purchase-orders/${guide.poId}/receive`,
                          {
                            barcode: v.barcode,
                            locationCode: v.locationCode,
                            quantity: Number(v.quantity),
                          },
                          "Delivery checked in. The goods are now at the receiving dock.",
                        );
                        if (result) {
                          const line = result.lines.find(
                            (l) => l.product.id === guide.productId,
                          );
                          save({
                            step: line.received === line.quantity ? 3 : 2,
                            receivingCode: v.locationCode,
                            receivedQty: line.received,
                          });
                        }
                      }}
                    >
                      <Hint>
                        Type or scan <strong>{product?.barcode}</strong> from
                        the product label. Try a wrong barcode to see the app
                        reject it without changing stock.
                      </Hint>
                      <Field
                        label="Product barcode — scan or type here"
                        name="barcode"
                        placeholder={product?.barcode}
                      />
                      <Field
                        label="Where did the delivery arrive?"
                        name="locationCode"
                        defaultValue={guide.receivingCode || "RECV-01"}
                        required
                      >
                        <LocationOptions
                          locations={
                            (po?.lines[0]?.received || 0) > 0
                              ? locations.filter(
                                  (l) => l.code === guide.receivingCode,
                                )
                              : locations
                          }
                          type="RECEIVING"
                        />
                      </Field>
                      <Field
                        label={`Units received now (${guide.expectedQty - (po?.lines[0]?.received || 0)} still expected)`}
                        name="quantity"
                        type="number"
                        max={guide.expectedQty - (po?.lines[0]?.received || 0)}
                        defaultValue={
                          guide.expectedQty - (po?.lines[0]?.received || 0)
                        }
                      />
                      <Hint>
                        After confirmation, these units count as stock inside
                        your warehouse. They are still at the dock, not on a
                        shelf.
                      </Hint>
                    </Form>
                  )}
                </Panel>
              )}
              {guide.step === 3 && (
                <Panel
                  title="3. Put away goods"
                  description="The goods are at the receiving dock. Move them to a storage shelf so they can be used for customer orders."
                >
                  <Form
                    label="Confirm goods stored"
                    onSubmit={async (v) => {
                      if (
                        await mutate(
                          "/putaway",
                          {
                            barcode: v.barcode,
                            sourceCode: guide.receivingCode,
                            destinationCode: v.destinationCode,
                            quantity: guide.receivedQty,
                          },
                          "Goods stored. The quantity is unchanged; only the location changed.",
                        )
                      )
                        save({ step: 4, storageCode: v.destinationCode });
                    }}
                  >
                    <Hint>
                      Move{" "}
                      <strong>
                        {guide.receivedQty} × {product?.name}
                      </strong>{" "}
                      from <strong>{guide.receivingCode}</strong> to the shelf
                      below. Total warehouse stock will stay the same.
                    </Hint>
                    <Field
                      label="Product barcode"
                      name="barcode"
                      placeholder={product?.barcode}
                    />
                    <Field
                      label="Destination shelf"
                      name="destinationCode"
                      defaultValue="A-01"
                      required
                    >
                      <LocationOptions locations={locations} type="STORAGE" />
                    </Field>
                  </Form>
                  {alreadyMoved && (
                    <div className="guide-body">
                      <p>
                        There is not enough unreserved stock at the recorded
                        receiving dock. If you already moved it using another
                        screen, check its location in Inventory.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => navigate("Inventory")}
                      >
                        Review inventory <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </Panel>
              )}
              {guide.step === 4 && (
                <Panel
                  title="4. Customer order"
                  description="Record what the customer wants. This is called a sales order."
                >
                  <Form
                    label="Save customer order"
                    onSubmit={async (v) => {
                      const result = await mutate(
                        "/mock-erp/sales-orders",
                        {
                          reference: v.reference,
                          partner: v.partner,
                          lines: [
                            {
                              productId: guide.productId,
                              quantity: Number(v.quantity),
                            },
                          ],
                        },
                        "Customer order saved. Next, set these units aside.",
                      );
                      if (result)
                        save({
                          step: 5,
                          soId: result.id,
                          orderedQty: Number(v.quantity),
                        });
                    }}
                  >
                    <Hint>
                      Product: <strong>{product?.name}</strong>. You stored{" "}
                      {guide.receivedQty} units in {guide.storageCode}.
                    </Hint>
                    <Field
                      label="Customer's name"
                      name="partner"
                      defaultValue="Demo customer"
                    />
                    <Field
                      label="How many units does the customer want?"
                      name="quantity"
                      type="number"
                      defaultValue={Math.min(10, guide.receivedQty)}
                    />
                    <details className="guide-details">
                      <summary>
                        Customer order reference (already filled in)
                      </summary>
                      <Field
                        label="Unique sales order reference"
                        name="reference"
                        defaultValue={guide.soReference}
                      />
                    </details>
                    <Hint>
                      Creating an order does not send goods or change stock yet.
                    </Hint>
                  </Form>
                </Panel>
              )}
              {guide.step === 5 && (
                <Panel
                  title="5. Reserve inventory"
                  description={`Reserve ${guide.orderedQty} units for ${so?.partner}. Other orders will not be able to use these units.`}
                >
                  <div className="guide-body">
                    <Hint>
                      <strong>Reserve = keep aside.</strong> The goods are still
                      inside your warehouse. Total stock stays the same; the
                      amount available for other orders decreases.
                    </Hint>
                    <button
                      onClick={async () => {
                        if (so.status !== "OPEN") {
                          save({
                            step:
                              so.status === "PICKED"
                                ? 7
                                : so.status === "PACKED"
                                  ? 8
                                  : so.status === "SHIPPED"
                                    ? 9
                                    : 6,
                          });
                          return;
                        }
                        if (
                          await mutate(
                            `/sales-orders/${guide.soId}/allocate`,
                            {},
                            "Units reserved for this customer. Now collect them from the shelf.",
                          )
                        )
                          save({ step: 6 });
                      }}
                    >
                      Reserve {guide.orderedQty} units <ArrowRight size={16} />
                    </button>
                  </div>
                </Panel>
              )}
              {guide.step === 6 && (
                <Panel
                  title="6. Confirm picking"
                  description="This is called picking. Check the item and shelf, then move the goods to the packing table."
                >
                  <div className="guide-body">
                    {tasksLoading && (
                      <p role="status">Finding the reserved goods…</p>
                    )}
                    {taskError && (
                      <button onClick={refreshTasks}>
                        Retry loading collection tasks
                      </button>
                    )}
                    {!tasksLoading && !taskError && tasks.length === 0 && (
                      <>
                        <p>
                          No collection tasks were found. Refresh to check the
                          order.
                        </p>
                        <button onClick={refreshTasks}>Refresh tasks</button>
                      </>
                    )}
                    {tasks.map((t) => (
                      <div className="guide-pick" key={t.id}>
                        {t.picked ? (
                          <p>
                            <Check size={15} /> Collected {t.quantity} ×{" "}
                            {t.line.product.name}
                          </p>
                        ) : (
                          <>
                            <Hint>
                              Collect{" "}
                              <strong>
                                {t.quantity} × {t.line.product.name}
                              </strong>{" "}
                              from shelf{" "}
                              <strong>{t.inventory.location.code}</strong>.
                              Product barcode:{" "}
                              <strong>{t.line.product.barcode}</strong>.
                            </Hint>
                            <Form
                              label={`Confirm ${t.quantity} units collected`}
                              onSubmit={async (v) => {
                                const result = await mutate(
                                  `/pick-tasks/${t.id}/confirm`,
                                  {
                                    barcode: v.barcode,
                                    sourceCode: v.sourceCode,
                                    packingCode: v.packingCode,
                                    quantity: t.quantity,
                                  },
                                  "Goods moved to packing. They are still inside the warehouse.",
                                );
                                if (result) {
                                  if (result.status === "PICKED")
                                    save({ step: 7 });
                                  else await refreshTasks();
                                }
                              }}
                            >
                              <Field
                                label="Product barcode"
                                name="barcode"
                                placeholder={t.line.product.barcode}
                              />
                              <Field
                                label="Shelf barcode — scan or type here"
                                name="sourceCode"
                                placeholder={t.inventory.location.code}
                              />
                              <Field
                                label="Where will you pack the goods?"
                                name="packingCode"
                                defaultValue="PACK-01"
                                required
                              >
                                <LocationOptions
                                  locations={locations}
                                  type="PACKING"
                                />
                              </Field>
                            </Form>
                          </>
                        )}
                      </div>
                    ))}
                    {so?.status === "PICKED" && (
                      <button onClick={() => save({ step: 7 })}>
                        Continue to packing <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </Panel>
              )}
              {guide.step === 7 && (
                <Panel
                  title="7. Verify and pack"
                  description="Verify that the box contains the customer's products and quantities. Then give the box its own barcode."
                >
                  {["PACKED", "SHIPPED"].includes(so?.status) ? (
                    <button
                      onClick={() =>
                        save({ step: so.status === "SHIPPED" ? 9 : 8 })
                      }
                    >
                      Continue <ArrowRight size={16} />
                    </button>
                  ) : (
                    <Form
                      label="Confirm box packed"
                      onSubmit={async (v) => {
                        if (
                          await mutate(
                            `/sales-orders/${guide.soId}/pack`,
                            {
                              cartonBarcode: v.cartonBarcode,
                              scans: so.lines.map((l) => ({
                                barcode: v["barcode" + l.id],
                                quantity: Number(v["quantity" + l.id]),
                              })),
                            },
                            "Box checked and sealed. It is ready to leave the warehouse.",
                          )
                        )
                          save({ step: 8 });
                      }}
                    >
                      {so?.lines.map((l) => (
                        <div key={l.id}>
                          <Hint>
                            Inside the box:{" "}
                            <strong>
                              {l.quantity} × {l.product.name}
                            </strong>
                            .
                          </Hint>
                          <div className="two-col">
                            <Field
                              label="Product barcode"
                              name={"barcode" + l.id}
                              placeholder={l.product.barcode}
                            />
                            <Field
                              label="Count the units in the box"
                              name={"quantity" + l.id}
                              type="number"
                            />
                          </div>
                        </div>
                      ))}
                      <Field
                        label="Barcode for this shipping box"
                        name="cartonBarcode"
                        defaultValue={guide.cartonReference}
                      />
                      <Hint>
                        The box barcode identifies this whole package. You will
                        use it in the next step to confirm shipment.
                      </Hint>
                    </Form>
                  )}
                </Panel>
              )}
              {guide.step === 8 && (
                <Panel
                  title="8. Confirm dispatch"
                  description="Only confirm this when the box is leaving your warehouse."
                >
                  {so?.status === "SHIPPED" ? (
                    <button onClick={() => save({ step: 9 })}>
                      View completed walkthrough
                    </button>
                  ) : (
                    <Form
                      label="Confirm box sent"
                      onSubmit={async (v) => {
                        if (
                          await mutate(
                            `/sales-orders/${guide.soId}/dispatch`,
                            v,
                            "Shipment complete. The goods have left your warehouse.",
                          )
                        )
                          save({ step: 9 });
                      }}
                    >
                      <Hint>
                        Type or scan the box barcode:{" "}
                        <strong>{so?.cartonBarcode}</strong>.
                      </Hint>
                      <Field
                        label="Shipping box barcode"
                        name="cartonBarcode"
                        placeholder={so?.cartonBarcode}
                      />
                      <Hint>
                        <strong>
                          This is when stock decreases by {guide.orderedQty}.
                        </strong>{" "}
                        Before this step, the goods were still inside your
                        warehouse.
                      </Hint>
                    </Form>
                  )}
                </Panel>
              )}
              {guide.step === 9 && (
                <Panel
                  title="Workflow completed"
                  description="The supplier's delivery is stored, and the customer's order is shipped."
                >
                  <div className="guide-body">
                    <div className="guide-result">
                      <strong>
                        +{guide.receivedQty} received − {guide.orderedQty} sent
                      </strong>
                      <p>
                        This walkthrough added{" "}
                        {guide.receivedQty - guide.orderedQty} units to your
                        stock. Other warehouse activity is included in the
                        current totals on the right.
                      </p>
                    </div>
                    <p>
                      Customer order: <strong>{so?.reference}</strong>
                      <br />
                      Box: <strong>{so?.cartonBarcode}</strong>
                    </p>
                    <Hint>
                      A shipment confirmation has been saved in the ERP
                      simulator. ERP responses are simulated in this local
                      workspace.
                    </Hint>
                    <div className="row-actions">
                      <button onClick={() => navigate("Audit trail")}>
                        See what happened <ArrowRight size={15} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setGuide({ step: 0 })}
                      >
                        New workflow
                      </button>
                    </div>
                  </div>
                </Panel>
              )}
            </>
          )}
        </div>
        <aside className="guide-summary">
          <div className="guide-summary-title">
            <Package size={19} />
            <h2>Inventory balance</h2>
          </div>
          <div className="guide-balance">
            <strong aria-label="Units physically inside">{onHand}</strong>
            <span>units physically inside</span>
          </div>
          <div className="guide-mini">
            <div>
              <strong>{reserved}</strong>
              <span>Reserved</span>
            </div>
            <div>
              <strong>{onHand - reserved}</strong>
              <span>Available</span>
            </div>
          </div>
          <p>
            These are live totals for the whole warehouse, including earlier
            demos.
          </p>
          <details className="guide-dictionary">
            <summary>Location reference</summary>
            <p>
              <MapPin size={14} />
              <span>
                <strong>Receiving dock</strong>
                <br />
                Where deliveries arrive.
              </span>
            </p>
            <p>
              <MapPin size={14} />
              <span>
                <strong>Storage shelf</strong>
                <br />
                Where goods wait for customers.
              </span>
            </p>
            <p>
              <MapPin size={14} />
              <span>
                <strong>Packing table</strong>
                <br />
                Where customer boxes are prepared.
              </span>
            </p>
          </details>
          <button className="text-button" onClick={() => navigate("Inventory")}>
            View goods by location <ArrowRight size={14} />
          </button>
        </aside>
      </div>
    </div>
  );
}
