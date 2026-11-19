// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Field, Form } from "./ui";

const decoder = vi.hoisted(() => ({
  callback: null,
  decode: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromStream(stream, video, callback) {
      decoder.callback = callback;
      decoder.decode(stream, video);
      return Promise.resolve({ stop: decoder.stop });
    }
  },
}));
let stopTrack, getMedia;
beforeEach(() => {
  decoder.callback = null;
  vi.clearAllMocks();
  stopTrack = vi.fn();
  getMedia = vi
    .fn()
    .mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
  vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: getMedia },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function () {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function () {
      this.removeAttribute("open");
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete navigator.mediaDevices;
  delete HTMLDialogElement.prototype.showModal;
  delete HTMLDialogElement.prototype.close;
});
async function open(label = "Product barcode") {
  fireEvent.click(
    screen.getByRole("button", { name: `Scan ${label} with camera` }),
  );
  await waitFor(() => expect(decoder.callback).toBeTypeOf("function"));
}
function detect(text) {
  act(() =>
    decoder.callback({ getText: () => text }, undefined, {
      stop: decoder.stop,
    }),
  );
}

it("opens only on request, fills the form without submitting, and releases the camera", async () => {
  const submit = vi.fn();
  render(
    <Form onSubmit={submit}>
      <Field scan name="barcode" label="Product barcode" />
    </Form>,
  );
  expect(getMedia).not.toHaveBeenCalled();
  await open();
  expect(getMedia).toHaveBeenCalledWith(
    expect.objectContaining({ audio: false }),
  );
  detect("WM101");
  expect(screen.getByLabelText("Product barcode").value).toBe("WM101");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(submit).not.toHaveBeenCalled();
  expect(stopTrack).toHaveBeenCalled();
  expect(decoder.stop).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  expect(submit).toHaveBeenCalledWith({ barcode: "WM101" });
});

it("updates controlled fields through their normal change handler", async () => {
  function Controlled() {
    const [value, setValue] = useState("");
    return (
      <Field
        scan
        label="Product barcode"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  }
  render(<Controlled />);
  await open();
  detect("WM101");
  expect(screen.getByLabelText("Product barcode").value).toBe("WM101");
});

it("keeps a location selection unchanged when the scanned code is not a valid option", async () => {
  render(
    <Field scan label="Shelf" defaultValue="A-01">
      <option value="A-01">Shelf A</option>
      <option value="B-01">Shelf B</option>
    </Field>,
  );
  await open("Shelf");
  detect("BLOCKED-99");
  expect(screen.getByLabelText("Shelf").value).toBe("A-01");
  expect(screen.getByRole("alert").textContent).toContain(
    "not an available location",
  );
  await open("Shelf");
  detect("B-01");
  expect(screen.getByLabelText("Shelf").value).toBe("B-01");
});

it("shows denied-camera guidance and preserves manual entry", async () => {
  getMedia.mockRejectedValue(
    Object.assign(new Error("Denied"), { name: "NotAllowedError" }),
  );
  render(<Field scan label="Product barcode" />);
  fireEvent.click(screen.getByRole("button", { name: /Scan Product barcode/ }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Camera access was denied",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Close and type manually" }),
  );
  fireEvent.change(screen.getByLabelText("Product barcode"), {
    target: { value: "WM101" },
  });
  expect(screen.getByLabelText("Product barcode").value).toBe("WM101");
});

it("stops a late-arriving camera stream if closed while permission is pending", async () => {
  let resolve;
  getMedia.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(<Field scan label="Product barcode" />);
  fireEvent.click(screen.getByRole("button", { name: /Scan Product barcode/ }));
  await waitFor(() => expect(getMedia).toHaveBeenCalled());
  fireEvent.click(
    screen.getByRole("button", { name: "Close barcode scanner" }),
  );
  await act(async () => resolve({ getTracks: () => [{ stop: stopTrack }] }));
  expect(stopTrack).toHaveBeenCalled();
  expect(decoder.decode).not.toHaveBeenCalled();
});

it("stops an active stream on unmount", async () => {
  const view = render(<Field scan label="Product barcode" />);
  await open();
  view.unmount();
  expect(stopTrack).toHaveBeenCalled();
  expect(decoder.stop).toHaveBeenCalled();
});
