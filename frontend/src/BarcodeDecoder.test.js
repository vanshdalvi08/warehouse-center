import { expect, it } from "vitest";
import JsBarcode from "jsbarcode";
import {
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource,
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

it.each(["WM101", "A-01", "CARTON-JURY-001"])(
  "decodes an actual Code 128 label containing %s",
  (text) => {
    const target = {};
    JsBarcode(target, text, { format: "CODE128", displayValue: false });
    const bars = target.encodings.map((e) => e.data).join("");
    const width = bars.length * 3 + 60,
      height = 120;
    const pixels = new Uint8ClampedArray(width * height).fill(255);
    for (let y = 10; y < height - 10; y++) {
      for (let x = 0; x < bars.length * 3; x++) {
        if (bars[Math.floor(x / 3)] === "1") pixels[y * width + 30 + x] = 0;
      }
    }
    const image = new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(pixels, width, height)),
    );
    const reader = new MultiFormatReader();
    const result = reader.decode(
      image,
      new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]]]),
    );
    expect(result.getText()).toBe(text);
  },
);
