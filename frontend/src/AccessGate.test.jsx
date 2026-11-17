// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessGate } from "./AccessGate";
import { api, setAuthorization } from "./ui";
vi.mock("./ui", async (original) => ({
  ...(await original()),
  api: vi.fn(),
  setAuthorization: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
describe("hosted workspace access", () => {
  it("opens the local workspace when hosted protection is disabled", async () => {
    api.mockResolvedValue({ enabled: false });
    render(
      <AccessGate>
        <div>Operations workspace</div>
      </AccessGate>,
    );
    expect(await screen.findByText("Operations workspace")).toBeTruthy();
    expect(setAuthorization).not.toHaveBeenCalled();
  });
  it("requires sign-in, then clears credentials on sign-out without storing them", async () => {
    api.mockImplementation((path) =>
      Promise.resolve(
        path === "/auth/status" ? { enabled: true } : { username: "operator" },
      ),
    );
    const user = userEvent.setup();
    render(
      <AccessGate>
        <div>Operations workspace</div>
      </AccessGate>,
    );
    await screen.findByRole("heading", { name: "Workspace sign-in" });
    expect(screen.queryByText("Operations workspace")).toBeNull();
    await user.type(screen.getByLabelText("Username"), "operator");
    await user.type(screen.getByLabelText("Password"), "sample-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations workspace")).toBeTruthy();
    expect(setAuthorization).toHaveBeenCalledWith(
      "Basic " + btoa("operator:sample-password"),
    );
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(setAuthorization).toHaveBeenLastCalledWith("");
    expect(screen.queryByText("Operations workspace")).toBeNull();
  });
  it("does not open the workspace when credentials are rejected", async () => {
    api.mockImplementation((path) =>
      path === "/auth/status"
        ? Promise.resolve({ enabled: true })
        : Promise.reject(new Error("Unauthorized")),
    );
    const user = userEvent.setup();
    render(
      <AccessGate>
        <div>Operations workspace</div>
      </AccessGate>,
    );
    await screen.findByRole("heading", { name: "Workspace sign-in" });
    await user.type(screen.getByLabelText("Username"), "operator");
    await user.type(screen.getByLabelText("Password"), "incorrect");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("Operations workspace")).toBeNull();
    expect(setAuthorization).toHaveBeenLastCalledWith("");
  });
  it("keeps the workspace closed when access status cannot be checked", async () => {
    api.mockRejectedValue(new Error("Server unavailable"));
    render(
      <AccessGate>
        <div>Operations workspace</div>
      </AccessGate>,
    );
    expect(
      await screen.findByRole("button", { name: "Retry connection" }),
    ).toBeTruthy();
    expect(screen.queryByText("Operations workspace")).toBeNull();
  });
});
