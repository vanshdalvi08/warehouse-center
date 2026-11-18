// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { AccessStory } from "./AccessStory";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false })),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const selected = (name) =>
  screen
    .getByRole("button", { name: `Show ${name}` })
    .getAttribute("aria-pressed");

it("cycles automatically, pauses, and resumes after an explicit play", () => {
  render(<AccessStory />);
  act(() => vi.advanceTimersByTime(6500));
  expect(selected("Inventory in place")).toBe("true");
  fireEvent.click(
    screen.getByRole("button", { name: "Pause illustration slideshow" }),
  );
  act(() => vi.advanceTimersByTime(13000));
  expect(selected("Inventory in place")).toBe("true");
  const play = screen.getByRole("button", {
    name: "Play illustration slideshow",
  });
  fireEvent.focus(play);
  fireEvent.click(play);
  act(() => vi.advanceTimersByTime(6500));
  expect(selected("Ready for dispatch")).toBe("true");
});

it("supports manual navigation while respecting reduced motion", () => {
  window.matchMedia.mockReturnValue({ matches: true });
  render(<AccessStory />);
  act(() => vi.advanceTimersByTime(13000));
  expect(selected("Goods receiving")).toBe("true");
  expect(
    screen.getByRole("button", { name: /disabled for reduced motion/ })
      .disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Previous illustration" }),
  );
  expect(selected("Ready for dispatch")).toBe("true");
  fireEvent.click(
    screen.getByRole("button", { name: "Show Inventory in place" }),
  );
  expect(selected("Inventory in place")).toBe("true");
});

it("suspends automatic changes when the page becomes hidden", () => {
  render(<AccessStory />);
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  act(() => vi.advanceTimersByTime(13000));
  expect(selected("Goods receiving")).toBe("true");
});
