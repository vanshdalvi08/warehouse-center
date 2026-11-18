// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessContext } from "./AccessContext";
import { App } from "./main";
import { UserManagement } from "./UserManagement";
import { api } from "./ui";
vi.mock("./ui", async (original) => ({ ...(await original()), api: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.mockImplementation(() => Promise.resolve([]));
});
const renderRole = (role) =>
  render(
    <AccessContext.Provider value={{ username: "test-user", role }}>
      <App />
    </AccessContext.Provider>,
  );
describe("role-aware workspace", () => {
  it("does not offer administrator workflows or user administration to operators", async () => {
    renderRole("WAREHOUSE_OPERATOR");
    await screen.findByText(/System connected/);
    expect(screen.queryByRole("button", { name: "Workflow" })).toBeNull();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Master data & integration" }),
    );
    expect(screen.queryByRole("button", { name: "Users & access" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Products" }));
    expect(screen.queryByRole("button", { name: "Add product" })).toBeNull();
  });
  it("does not offer inventory mutations to auditors", async () => {
    renderRole("AUDITOR");
    await screen.findByText(/System connected/);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Inventory" }));
    expect(
      screen.queryByRole("button", { name: "Confirm movement" }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Location-level inventory" }),
    ).toBeTruthy();
  });
  it("offers user administration only to administrators", async () => {
    renderRole("ADMIN");
    await screen.findByText(/System connected/);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Master data & integration" }),
    );
    await user.click(screen.getByRole("button", { name: "Users & access" }));
    expect(
      await screen.findByRole("heading", { name: "Create user" }),
    ).toBeTruthy();
  });
  it("submits a new user with the chosen role to the admin API", async () => {
    render(
      <AccessContext.Provider value={{ username: "admin", role: "ADMIN" }}>
        <UserManagement />
      </AccessContext.Provider>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Username"), "picker01");
    await user.type(screen.getByLabelText("Full name"), "Warehouse Picker");
    await user.type(
      screen.getByLabelText("Initial password"),
      "worker-test-password",
    );
    await user.selectOptions(
      screen.getByLabelText("Role"),
      "WAREHOUSE_OPERATOR",
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(api).toHaveBeenCalledWith("/users", "POST", {
      username: "picker01",
      displayName: "Warehouse Picker",
      password: "worker-test-password",
      role: "WAREHOUSE_OPERATOR",
    });
  });

  it("allows supervisors to manage orders without user or product administration", async () => {
    renderRole("SUPERVISOR");
    await screen.findByText(/System connected/);
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "Workflow" })).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Master data & integration" }),
    );
    expect(screen.getByRole("button", { name: "ERP simulator" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Users & access" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Products" }));
    expect(screen.queryByRole("button", { name: "Add product" })).toBeNull();
  });
  it("offers precisely Admin, Supervisor and Warehouse Operator when creating users", () => {
    render(
      <AccessContext.Provider value={{ username: "admin", role: "ADMIN" }}>
        <UserManagement />
      </AccessContext.Provider>,
    );
    const select = screen.getByLabelText("Role");
    expect(Array.from(select.options, (o) => o.value)).toEqual([
      "WAREHOUSE_OPERATOR",
      "SUPERVISOR",
      "ADMIN",
    ]);
  });

  it("requires a supervisor to allocate an open order before the operator can pick", async () => {
    api.mockImplementation((path) =>
      Promise.resolve(
        path === "/sales-orders"
          ? [
              {
                id: 7,
                reference: "SO-7",
                kind: "SALES",
                partner: "Customer",
                status: "OPEN",
                lines: [
                  {
                    id: 1,
                    product: { sku: "WM-101", name: "Mouse" },
                    quantity: 10,
                  },
                ],
              },
            ]
          : [],
      ),
    );
    renderRole("WAREHOUSE_OPERATOR");
    await screen.findByText(/System connected/);
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "Outbound",
      }),
    );
    await user.selectOptions(screen.getByLabelText("Select order"), "7");
    expect(
      screen.getByRole("heading", { name: "Awaiting supervisor allocation" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Allocate order" })).toBeNull();
  });
});
