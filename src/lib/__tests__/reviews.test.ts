import { describe, expect, it } from "vitest";
import { REVIEWS, ratingAverage, ratingCount, recommendPercent } from "../reviews";

describe("reviews data", () => {
  it("rounds the published figures down", () => {
    expect(ratingCount).toBe(83);
    expect(ratingAverage).toBe(4.6); // 383 / 83 = 4.61
    expect(recommendPercent).toBe(95); // 79 / 83 = 95.2%
  });

  it("keeps reviews newest first", () => {
    const dates = REVIEWS.map((r) => r.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
