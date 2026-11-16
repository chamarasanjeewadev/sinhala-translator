import { describe, it, expect } from "vitest";
import { fitWithin } from "../image-prep";

describe("fitWithin", () => {
  it("downscales landscape to the long edge", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
  });
  it("never upscales", () => {
    expect(fitWithin(1000, 800, 2000)).toEqual({ width: 1000, height: 800 });
  });
  it("downscales portrait", () => {
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });
  it("clamps each side to at least 1", () => {
    const r = fitWithin(1, 5000, 2000);
    expect(r.height).toBe(2000);
    expect(r.width).toBeGreaterThanOrEqual(1);
  });
});
