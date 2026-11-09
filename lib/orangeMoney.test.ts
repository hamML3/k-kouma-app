import { describe, expect, it } from "vitest";
import { normalizeMerchantCode } from "./orangeMoney";

describe("normalizeMerchantCode", () => {
  it("garde les chiffres et retire les espaces", () => {
    expect(normalizeMerchantCode(" 12 34 56 ")).toBe("123456");
  });

  it("refuse un code vide, trop court ou non numérique", () => {
    expect(normalizeMerchantCode("")).toBeNull();
    expect(normalizeMerchantCode(undefined)).toBeNull();
    expect(normalizeMerchantCode("123")).toBeNull();
    expect(normalizeMerchantCode("12A456")).toBeNull();
  });
});
