// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
    renderRole("OPERATOR");
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
    await user.selectOptions(screen.getByLabelText("Role"), "OPERATOR");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(api).toHaveBeenCalledWith("/users", "POST", {
      username: "picker01",
      displayName: "Warehouse Picker",
      password: "worker-test-password",
      role: "OPERATOR",
    });
  });
});
