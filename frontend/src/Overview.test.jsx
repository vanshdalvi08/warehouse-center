// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Overview } from "./Overview";
afterEach(cleanup);
const data = {
  inventory: [{ quantity: 50, reserved: 10 }],
  purchase: [
    {
      id: 1,
      reference: "PO-101",
      kind: "PURCHASE",
      partner: "Supplier",
      status: "RECEIVING",
      lines: [{ quantity: 50 }],
    },
  ],
  sales: [
    {
      id: 2,
      reference: "SO-101",
      kind: "SALES",
      partner: "Customer",
      status: "ALLOCATED",
      lines: [{ quantity: 10 }],
    },
  ],
  transactions: [],
  messages: [{ status: "FAILED" }],
};
describe("operations overview", () => {
  it("filters the queue and opens the exact selected sales order", async () => {
    const user = userEvent.setup(),
      openOrder = vi.fn();
    render(
      <Overview
        data={data}
        stockTable={() => null}
        openOrder={openOrder}
        navigate={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Open PO-101" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Outbound" }));
    expect(screen.queryByRole("button", { name: "Open PO-101" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open SO-101" }));
    expect(openOrder).toHaveBeenCalledWith(data.sales[0]);
    await user.click(screen.getByRole("button", { name: "Inbound" }));
    expect(screen.queryByRole("button", { name: "Open SO-101" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open PO-101" })).toBeTruthy();
  });
  it("surfaces failed ERP messages and links to their review screen", async () => {
    const user = userEvent.setup(),
      navigate = vi.fn();
    render(
      <Overview
        data={data}
        stockTable={() => null}
        openOrder={vi.fn()}
        navigate={navigate}
      />,
    );
    expect(screen.getByText("1 ERP message requires attention")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Review messages" }));
    expect(navigate).toHaveBeenCalledWith("ERP simulator");
    await user.click(screen.getByRole("button", { name: "New workflow" }));
    expect(navigate).toHaveBeenCalledWith("Start here");
  });
});
