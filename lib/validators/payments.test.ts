import { describe, expect, it } from "vitest";
import { declareManualPaymentSchema, isRejectionReason } from "./payments";

const parse = (over: Record<string, unknown>) =>
  declareManualPaymentSchema.safeParse({ pack: "single", reference: "CI241109.1532.B12345", payerPhone: "70000000", ...over });

describe("declareManualPaymentSchema", () => {
  it("accepte un numéro écrit avec des espaces, comme suggéré dans le formulaire", () => {
    const r = parse({ payerPhone: "+223 70 00 00 00" });
    expect(r.success && r.data.payerPhone).toBe("+22370000000");
  });

  it("normalise la référence pour bloquer les doublons d'écriture", () => {
    const r = parse({ reference: " ci241109.1532.b12345 " });
    expect(r.success && r.data.reference).toBe("CI241109.1532.B12345");
  });

  it("accepte la référence recopiée telle qu'écrite dans le SMS, préfixe « ID: » compris", () => {
    const r = parse({ reference: "ID:PP261125.123.C34567" });
    expect(r.success && r.data.reference).toBe("PP261125.123.C34567");
    const r2 = parse({ reference: "id: pp261125.123.c34567" });
    expect(r2.success && r2.data.reference).toBe("PP261125.123.C34567");
  });

  it("refuse une référence trop courte ou avec des caractères inattendus", () => {
    expect(parse({ reference: "AB" }).success).toBe(false);
    expect(parse({ reference: "<script>" }).success).toBe(false);
  });

  it("refuse un numéro invalide et une formule inconnue", () => {
    expect(parse({ payerPhone: "12" }).success).toBe(false);
    expect(parse({ pack: "pack10" }).success).toBe(false);
  });
});

describe("isRejectionReason", () => {
  it("ne reconnaît que les motifs prévus", () => {
    expect(isRejectionReason("not_found")).toBe(true);
    expect(isRejectionReason("toString")).toBe(false);
    expect(isRejectionReason(undefined)).toBe(false);
  });
});
