// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { availableForOrder, CustomerOrders } from "./CustomerOrders";
import { CustomerPortal } from "./CustomerPortal";
import { api } from "./ui";
vi.mock("./ui", async (original) => ({ ...(await original()), api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const product = { id: 1, name: "Wireless Mouse", sku: "WM-101" };
const row = (quantity, reserved, type = "STORAGE", active = true) => ({
  product,
  quantity,
  reserved,
  location: { type, active },
});

it("only counts unreserved units in active storage as orderable", () => {
  expect(
    availableForOrder(
      [
        row(20, 8),
        row(9, 0, "RECEIVING"),
        row(4, 0, "PACKING"),
        row(6, 0, "STORAGE", false),
      ],
      1,
    ),
  ).toBe(12);
});

it("blocks allocation when any order line is short and opens fulfilment separately", () => {
  const order = {
    id: 7,
    reference: "WEB-7",
    partner: "Customer",
    source: "CUSTOMER",
    status: "OPEN",
    lines: [{ product, quantity: 15 }],
  };
  const openOrder = vi.fn();
  render(
    <CustomerOrders
      data={{ products: [product], inventory: [row(20, 8)], sales: [order] }}
      canSupervise
      mutate={vi.fn()}
      openOrder={openOrder}
    />,
  );
  expect(screen.getByRole("button", { name: "Allocate order" }).disabled).toBe(
    true,
  );
  expect(screen.getByText("WM-101: short 3")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Open fulfilment/ }));
  expect(openOrder).toHaveBeenCalledWith(order);
});

it("shows outside customer availability and submits without staff credentials or allocation", async () => {
  api.mockImplementation((path) =>
    Promise.resolve(
      path === "/customer/catalog"
        ? [{ ...product, available: 12 }]
        : { reference: "WEB-123", status: "OPEN" },
    ),
  );
  render(<CustomerPortal />);
  await screen.findByRole("option", { name: /Wireless Mouse/ });
  fireEvent.change(screen.getByLabelText("Your name / company"), {
    target: { value: "Jury customer" },
  });
  fireEvent.change(screen.getByLabelText("Product 1"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("Quantity 1"), {
    target: { value: "13" },
  });
  expect(
    screen.getByRole("button", { name: "Submit order request" }).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Quantity 1"), {
    target: { value: "10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Submit order request" }));
  await screen.findByText("WEB-123");
  expect(api).toHaveBeenCalledWith(
    "/customer/orders",
    "POST",
    expect.objectContaining({
      customerName: "Jury customer",
      lines: [{ productId: 1, quantity: 10 }],
    }),
  );
  expect(
    api.mock.calls.filter(([path]) => path.includes("allocate")),
  ).toHaveLength(0);
});
