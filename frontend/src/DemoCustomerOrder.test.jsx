// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoCustomerOrder } from "./DemoCustomerOrder";
afterEach(cleanup);

it("creates a ten-unit demo request without reserving stock and links to Orders", async () => {
  const mutate = vi.fn().mockResolvedValue({ reference: "SO-DEMO-1" });
  const navigate = vi.fn();
  render(
    <DemoCustomerOrder
      products={[
        { id: 5, barcode: "WM101", name: "Wireless Mouse", sku: "WM-101" },
      ]}
      mutate={mutate}
      navigate={navigate}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Create demo customer order" }),
  );
  await screen.findByText(/Created SO-DEMO-1/);
  expect(mutate).toHaveBeenCalledExactlyOnceWith(
    "/mock-erp/sales-orders",
    {
      reference: expect.stringMatching(/^SO-DEMO-/),
      partner: "Demo Customer",
      lines: [{ productId: 5, quantity: 10 }],
    },
    expect.any(String),
  );
  fireEvent.click(screen.getByRole("button", { name: "Review demo order" }));
  expect(navigate).toHaveBeenCalledWith("Orders");
});
