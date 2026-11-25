import { describe, expect, it } from "vitest";
import { CREDIT_PACKAGES, IAP_PRODUCTS } from "../constants";

describe("credit packs", () => {
  it("cost less per credit as they get bigger", () => {
    const perCredit = [...CREDIT_PACKAGES]
      .sort((a, b) => a.credits - b.credits)
      .map((p) => p.price / p.credits);
    for (let i = 1; i < perCredit.length; i++) expect(perCredit[i]).toBeLessThan(perCredit[i - 1]);
  });

  it("grant the same credits in the App Store as on the web", () => {
    const byName = Object.fromEntries(Object.values(IAP_PRODUCTS).map((p) => [p.name, p.credits]));
    for (const pkg of CREDIT_PACKAGES) expect(byName[pkg.name]).toBe(pkg.credits);
  });
});
