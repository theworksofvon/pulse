import { describe, expect, it } from "bun:test";
import { calculateCost, hasPricing } from "../src/lib/pricing";

describe("calculateCost", () => {
  describe("known models - direct lookup", () => {
    it("calculates cost for gpt-4o", () => {
      // gpt-4o: $2.50/1M input, $10.00/1M output
      // 1000 input + 500 output = (1000 * 250 / 1M) + (500 * 1000 / 1M)
      // = 0.00025 + 0.0005 = 0.00075 cents... wait, that's wrong
      // Actually: (1000 * 250) / 1_000_000 + (500 * 1000) / 1_000_000
      // = 250_000 / 1_000_000 + 500_000 / 1_000_000
      // = 0.25 + 0.5 = 0.75 cents
      const cost = calculateCost("gpt-4o", 1000, 500);
      expect(cost).toBe(0.75);
    });

    it("calculates cost for gpt-4o-mini", () => {
      // gpt-4o-mini: $0.15/1M input, $0.60/1M output
      // 10000 input + 5000 output = (10000 * 15 / 1M) + (5000 * 60 / 1M)
      // = 150_000 / 1_000_000 + 300_000 / 1_000_000
      // = 0.15 + 0.3 = 0.45 cents
      const cost = calculateCost("gpt-4o-mini", 10000, 5000);
      expect(cost).toBeCloseTo(0.45, 10);
    });

    it("calculates cost for gpt-4-turbo", () => {
      // gpt-4-turbo: $10.00/1M input, $30.00/1M output
      // 1000 input + 1000 output = (1000 * 1000 / 1M) + (1000 * 3000 / 1M)
      // = 1 + 3 = 4 cents
      const cost = calculateCost("gpt-4-turbo", 1000, 1000);
      expect(cost).toBe(4);
    });

    it("calculates cost for gpt-3.5-turbo", () => {
      // gpt-3.5-turbo: $0.50/1M input, $1.50/1M output
      // 1_000_000 input + 1_000_000 output = 50 + 150 = 200 cents
      const cost = calculateCost("gpt-3.5-turbo", 1_000_000, 1_000_000);
      expect(cost).toBe(200);
    });

    it("calculates cost for claude-3-5-sonnet-20241022", () => {
      // claude-3-5-sonnet: $3.00/1M input, $15.00/1M output
      // 2000 input + 1000 output = (2000 * 300 / 1M) + (1000 * 1500 / 1M)
      // = 0.6 + 1.5 = 2.1 cents
      const cost = calculateCost("claude-3-5-sonnet-20241022", 2000, 1000);
      expect(cost).toBe(2.1);
    });

    it("calculates cost for claude-3-5-haiku-20241022", () => {
      // claude-3-5-haiku: $0.80/1M input, $4.00/1M output
      // 5000 input + 2500 output = (5000 * 80 / 1M) + (2500 * 400 / 1M)
      // = 0.4 + 1 = 1.4 cents
      const cost = calculateCost("claude-3-5-haiku-20241022", 5000, 2500);
      expect(cost).toBe(1.4);
    });

    it("calculates cost for claude-3-opus-20240229", () => {
      // claude-3-opus: $15.00/1M input, $75.00/1M output
      // 1000 input + 500 output = (1000 * 1500 / 1M) + (500 * 7500 / 1M)
      // = 1.5 + 3.75 = 5.25 cents
      const cost = calculateCost("claude-3-opus-20240229", 1000, 500);
      expect(cost).toBe(5.25);
    });
  });

  describe("known models - alias lookup", () => {
    it("calculates cost using gpt-4o date alias", () => {
      const cost = calculateCost("gpt-4o-2024-11-20", 1000, 500);
      expect(cost).toBe(0.75); // Same as gpt-4o
    });

    it("calculates cost using gpt-4o-mini date alias", () => {
      const cost = calculateCost("gpt-4o-mini-2024-07-18", 10000, 5000);
      expect(cost).toBeCloseTo(0.45, 10); // Same as gpt-4o-mini
    });

    it("calculates cost using claude short name alias", () => {
      const cost = calculateCost("claude-3-5-sonnet", 2000, 1000);
      expect(cost).toBe(2.1); // Same as claude-3-5-sonnet-20241022
    });

    it("calculates cost using claude dot notation alias", () => {
      const cost = calculateCost("claude-3.5-sonnet", 2000, 1000);
      expect(cost).toBe(2.1); // Same as claude-3-5-sonnet-20241022
    });

    it("calculates cost using claude-3-opus short alias", () => {
      const cost = calculateCost("claude-3-opus", 1000, 500);
      expect(cost).toBe(5.25); // Same as claude-3-opus-20240229
    });
  });

  describe("unknown models", () => {
    it("returns null for unknown model", () => {
      const cost = calculateCost("unknown-model-xyz", 1000, 500);
      expect(cost).toBeNull();
    });

    it("returns null for empty model string", () => {
      const cost = calculateCost("", 1000, 500);
      expect(cost).toBeNull();
    });

    it("returns null for model with typo", () => {
      const cost = calculateCost("gpt-4o-mni", 1000, 500);
      expect(cost).toBeNull();
    });

    it("returns null for non-existent provider", () => {
      const cost = calculateCost("azure-gpt-4", 1000, 500);
      expect(cost).toBeNull();
    });
  });

  describe("edge cases - zero tokens", () => {
    it("returns 0 for zero input and output tokens", () => {
      const cost = calculateCost("gpt-4o", 0, 0);
      expect(cost).toBe(0);
    });

    it("returns correct cost for zero input tokens only", () => {
      // gpt-4o: 0 input + 1000 output = 0 + (1000 * 1000 / 1M) = 1 cent
      const cost = calculateCost("gpt-4o", 0, 1000);
      expect(cost).toBe(1);
    });

    it("returns correct cost for zero output tokens only", () => {
      // gpt-4o: 1000 input + 0 output = (1000 * 250 / 1M) + 0 = 0.25 cents
      const cost = calculateCost("gpt-4o", 1000, 0);
      expect(cost).toBe(0.25);
    });
  });

  describe("edge cases - large numbers", () => {
    it("calculates cost for 1 million input tokens", () => {
      // gpt-4o: 1M input = 1_000_000 * 250 / 1_000_000 = 250 cents = $2.50
      const cost = calculateCost("gpt-4o", 1_000_000, 0);
      expect(cost).toBe(250);
    });

    it("calculates cost for 1 million output tokens", () => {
      // gpt-4o: 1M output = 1_000_000 * 1000 / 1_000_000 = 1000 cents = $10.00
      const cost = calculateCost("gpt-4o", 0, 1_000_000);
      expect(cost).toBe(1000);
    });

    it("calculates cost for very large token counts", () => {
      // gpt-4o: 10M input + 5M output
      // = (10_000_000 * 250 / 1M) + (5_000_000 * 1000 / 1M)
      // = 2500 + 5000 = 7500 cents = $75.00
      const cost = calculateCost("gpt-4o", 10_000_000, 5_000_000);
      expect(cost).toBe(7500);
    });

    it("handles precision for small token counts", () => {
      // gpt-4o-mini: 1 input + 1 output
      // = (1 * 15 / 1M) + (1 * 60 / 1M)
      // = 0.000015 + 0.00006 = 0.000075 cents
      const cost = calculateCost("gpt-4o-mini", 1, 1);
      expect(cost).toBeCloseTo(0.000075, 10);
    });
  });
});

describe("hasPricing", () => {
  it("returns true for known model", () => {
    expect(hasPricing("gpt-4o")).toBe(true);
    expect(hasPricing("claude-3-5-sonnet-20241022")).toBe(true);
  });

  it("returns true for aliased model", () => {
    expect(hasPricing("gpt-4o-2024-11-20")).toBe(true);
    expect(hasPricing("claude-3-5-sonnet")).toBe(true);
  });

  it("returns false for unknown model", () => {
    expect(hasPricing("unknown-model")).toBe(false);
    expect(hasPricing("")).toBe(false);
  });
});
