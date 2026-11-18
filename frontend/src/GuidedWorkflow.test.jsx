// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidedWorkflow } from "./GuidedWorkflow";
import { AccessContext } from "./AccessContext";
import { api } from "./ui";
vi.mock("./ui", async (original) => ({ ...(await original()), api: vi.fn() }));
const product = {
  id: 1,
  name: "Wireless Mouse",
  sku: "WM-101",
  barcode: "WM101",
};
const locations = [
  {
    id: 1,
    code: "RECV-01",
    type: "RECEIVING",
    description: "Delivery dock",
    active: true,
  },
  {
    id: 2,
    code: "A-01",
    type: "STORAGE",
    description: "Storage shelf",
    active: true,
  },
  {
    id: 3,
    code: "PACK-01",
    type: "PACKING",
    description: "Packing table",
    active: true,
  },
];
const row = (location, quantity, reserved = 0) => ({
  id: location.id,
  product,
  location,
  quantity,
  reserved,
  available: quantity - reserved,
});
const initial = () => ({
  products: [product],
  locations,
  inventory: [row(locations[1], 40)],
  purchase: [],
  sales: [],
  transactions: [],
  messages: [],
});
const store = (guide) =>
  localStorage.setItem("warehouse-center-guided-v1", JSON.stringify(guide));
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
afterEach(cleanup);
describe("guided warehouse workflow", () => {
  it("explains the current balance without changing stock on opening", () => {
    const mutate = vi.fn();
    render(
      <GuidedWorkflow
        data={initial()}
        mutate={mutate}
        onError={vi.fn()}
        navigate={vi.fn()}
      />,
    );
    expect(screen.getByText("40 units")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start workflow/ })).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });
  it("keeps the user at receiving when the server rejects a scan", async () => {
    store({ step: 2, poId: 11, productId: 1, expectedQty: 50 });
    const data = initial();
    data.purchase = [
      {
        id: 11,
        status: "OPEN",
        lines: [{ product, quantity: 50, received: 0 }],
      },
    ];
    const mutate = vi.fn().mockResolvedValue(false),
      user = userEvent.setup();
    render(
      <GuidedWorkflow
        data={data}
        mutate={mutate}
        onError={vi.fn()}
        navigate={vi.fn()}
      />,
    );
    await user.type(
      screen.getByLabelText("Product barcode — scan or type here"),
      "WRONG",
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm goods received" }),
    );
    expect(mutate).toHaveBeenCalledWith(
      "/purchase-orders/11/receive",
      { barcode: "WRONG", locationCode: "RECV-01", quantity: 50 },
      expect.any(String),
    );
    expect(
      screen.getByRole("heading", { name: "2. Receive delivery" }),
    ).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem("warehouse-center-guided-v1")).step,
    ).toBe(2);
  });
  it("guides a user from preparation to shipment with correct API payloads and saved progress", async () => {
    const calls = vi.fn(),
      onError = vi.fn(),
      navigate = vi.fn();
    api.mockResolvedValue([
      {
        id: 31,
        quantity: 10,
        picked: false,
        line: { product },
        inventory: { location: locations[1] },
      },
    ]);
    function Harness() {
      const [data, setData] = useState(initial);
      async function mutate(path, body, message) {
        calls(path, body, message);
        let next = structuredClone(data),
          result = { message: "ok" };
        if (path === "/mock-erp/purchase-orders") {
          result = {
            id: 11,
            reference: body.reference,
            partner: body.partner,
            status: "OPEN",
            lines: [
              { id: 1, product, quantity: body.lines[0].quantity, received: 0 },
            ],
          };
          next.purchase = [result];
        }
        if (path.endsWith("/receive")) {
          result = {
            ...next.purchase[0],
            status: "RECEIVED",
            lines: [{ id: 1, product, quantity: 50, received: 50 }],
          };
          next.purchase = [result];
          next.inventory.push(row(locations[0], 50));
        }
        if (path === "/putaway")
          next.inventory = [row(locations[1], 90), row(locations[0], 0)];
        if (path === "/mock-erp/sales-orders") {
          result = {
            id: 22,
            reference: body.reference,
            partner: body.partner,
            status: "OPEN",
            lines: [{ id: 2, product, quantity: body.lines[0].quantity }],
          };
          next.sales = [result];
        }
        if (path.endsWith("/allocate")) {
          result = { ...next.sales[0], status: "ALLOCATED" };
          next.sales = [result];
          next.inventory = [row(locations[1], 90, 10)];
        }
        if (path === "/pick-tasks/31/confirm") {
          result = { ...next.sales[0], status: "PICKED" };
          next.sales = [result];
          next.inventory = [row(locations[1], 80), row(locations[2], 10, 10)];
        }
        if (path.endsWith("/pack")) {
          result = {
            ...next.sales[0],
            status: "PACKED",
            cartonBarcode: body.cartonBarcode,
          };
          next.sales = [result];
        }
        if (path.endsWith("/dispatch")) {
          result = { ...next.sales[0], status: "SHIPPED" };
          next.sales = [result];
          next.inventory = [row(locations[1], 80)];
        }
        setData(next);
        return result;
      }
      return (
        <GuidedWorkflow
          data={data}
          mutate={mutate}
          onError={onError}
          navigate={navigate}
        />
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Start workflow/ }));
    await user.click(
      screen.getByRole("button", { name: "Save expected delivery" }),
    );
    await user.type(
      screen.getByLabelText("Product barcode — scan or type here"),
      "WM101",
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm goods received" }),
    );
    await user.type(screen.getByLabelText("Product barcode"), "WM101");
    await user.click(
      screen.getByRole("button", { name: "Confirm goods stored" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Save customer order" }),
    );
    await user.click(screen.getByRole("button", { name: "Reserve 10 units" }));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Shelf barcode — scan or type here"),
      ).toBeTruthy(),
    );
    await user.type(screen.getByLabelText("Product barcode"), "WM101");
    await user.type(
      screen.getByLabelText("Shelf barcode — scan or type here"),
      "A-01",
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm 10 units collected" }),
    );
    await user.type(screen.getByLabelText("Product barcode"), "WM101");
    await user.type(screen.getByLabelText("Count the units in the box"), "10");
    const carton = screen.getByLabelText("Barcode for this shipping box").value;
    await user.click(
      screen.getByRole("button", { name: "Confirm box packed" }),
    );
    await user.type(screen.getByLabelText("Shipping box barcode"), carton);
    await user.click(screen.getByRole("button", { name: "Confirm box sent" }));
    expect(
      screen.getByRole("heading", {
        name: "Workflow completed",
      }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Units physically inside").textContent).toBe(
      "80",
    );
    expect(calls).toHaveBeenCalledWith(
      "/putaway",
      {
        barcode: "WM101",
        sourceCode: "RECV-01",
        destinationCode: "A-01",
        quantity: 50,
      },
      expect.any(String),
    );
    expect(calls).toHaveBeenCalledWith(
      "/pick-tasks/31/confirm",
      {
        barcode: "WM101",
        sourceCode: "A-01",
        packingCode: "PACK-01",
        quantity: 10,
      },
      expect.any(String),
    );
    expect(calls).toHaveBeenCalledWith(
      "/sales-orders/22/pack",
      { cartonBarcode: carton, scans: [{ barcode: "WM101", quantity: 10 }] },
      expect.any(String),
    );
    expect(calls).toHaveBeenCalledTimes(9);
    expect(onError).not.toHaveBeenCalled();
    expect(
      JSON.parse(localStorage.getItem("warehouse-center-guided-v1")).step,
    ).toBe(9);
  });
  it("restores the dispatch step without posting or creating another order", () => {
    store({ step: 8, poId: 11, soId: 22, productId: 1, orderedQty: 10 });
    const data = initial();
    data.sales = [{ id: 22, status: "PACKED", cartonBarcode: "BOX-SAVED" }];
    const mutate = vi.fn();
    render(
      <GuidedWorkflow
        data={data}
        mutate={mutate}
        onError={vi.fn()}
        navigate={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "8. Confirm dispatch" }),
    ).toBeTruthy();
    expect(screen.getByPlaceholderText("BOX-SAVED")).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("lets a supervisor start with existing masters without calling the admin seed endpoint", async () => {
    const mutate = vi.fn(),
      user = userEvent.setup();
    render(
      <AccessContext.Provider
        value={{ username: "supervisor", role: "SUPERVISOR" }}
      >
        <GuidedWorkflow
          data={initial()}
          mutate={mutate}
          onError={vi.fn()}
          navigate={vi.fn()}
        />
      </AccessContext.Provider>,
    );
    await user.click(screen.getByRole("button", { name: /Start workflow/ }));
    expect(
      screen.getByRole("heading", { name: "1. Expected delivery" }),
    ).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });
});
