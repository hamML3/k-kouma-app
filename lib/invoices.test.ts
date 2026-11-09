import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({ sendInvoiceEmail: vi.fn() }));

const { invoiceView } = await import("./invoices");

const payment = {
  id: 42,
  invoiceNumber: 12,
  paidAt: new Date("2026-11-25T10:00:00Z"),
  createdAt: new Date("2026-11-25T09:00:00Z"),
  provider: "orange_money_manual",
  providerRef: "PP261125.123.C34567",
  therapyType: "individuelle",
  sessionsCount: 3,
  amount: 28000,
  currency: "XOF",
  patient: { email: "seydou@example.com", patientProfile: { nickname: "Seydou" } },
};

describe("invoiceView", () => {
  it("met en forme la facture comme à l'écran", () => {
    const v = invoiceView(payment, "  TVA non applicable  ");
    expect(v.number).toBe("FA-2026-000012");
    expect(v.provider).toBe("Orange Money");
    expect(v.designation).toBe("Thérapie individuelle, pack de 3 séances");
    expect(v.amount.replace(/\s/g, " ")).toBe("28 000 XOF");
    expect(v.clientName).toBe("Seydou");
    expect(v.taxNote).toBe("TVA non applicable");
  });

  it("retombe sur l'e-mail sans pseudo, et sans mention fiscale vide", () => {
    const v = invoiceView({ ...payment, patient: { email: "a@b.c", patientProfile: null } }, "  ");
    expect(v.clientName).toBe("a@b.c");
    expect(v.taxNote).toBeNull();
  });

  it("indique le coaching et la séance seule", () => {
    expect(invoiceView({ ...payment, therapyType: "coaching", sessionsCount: 1 }, null).designation).toBe("Coaching de vie, 1 séance");
  });
});
