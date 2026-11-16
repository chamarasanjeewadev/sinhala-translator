import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HANDOFF_KEY, readHandoffText, writeHandoffText } from "../handoff";

function stubStorage(overrides: Partial<Storage> = {}) {
  const map = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    ...overrides,
  });
}

describe("handoff", () => {
  beforeEach(() => stubStorage());
  afterEach(() => vi.unstubAllGlobals());

  it("returns the written text once", () => {
    writeHandoffText("අ");
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBe("අ");
    expect(readHandoffText()).toBe("අ");
    expect(readHandoffText()).toBeNull();
  });

  it("read returns null when getItem throws", () => {
    stubStorage({ getItem: () => { throw new Error("blocked"); } });
    expect(readHandoffText()).toBeNull();
  });

  it("write does not throw when setItem throws", () => {
    stubStorage({ setItem: () => { throw new Error("full"); } });
    expect(() => writeHandoffText("x")).not.toThrow();
  });
});
