import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins headers and rows with commas and CRLF", () => {
    const csv = toCsv(["ID", "Email"], [[1, "a@x.com"], [2, "b@x.com"]]);
    expect(csv).toBe("ID,Email\r\n1,a@x.com\r\n2,b@x.com");
  });

  it("quotes fields containing a comma", () => {
    const csv = toCsv(["Nom"], [["Diallo, Hamady"]]);
    expect(csv).toBe('Nom\r\n"Diallo, Hamady"');
  });

  it("quotes and doubles internal quotes", () => {
    const csv = toCsv(["Note"], [['Il a dit "bonjour"']]);
    expect(csv).toBe('Note\r\n"Il a dit ""bonjour"""');
  });

  it("quotes fields containing a newline", () => {
    const csv = toCsv(["Bio"], [["ligne 1\nligne 2"]]);
    expect(csv).toBe('Bio\r\n"ligne 1\nligne 2"');
  });

  it("renders null and undefined as empty fields", () => {
    const csv = toCsv(["A", "B"], [[null, undefined]]);
    expect(csv).toBe("A,B\r\n,");
  });
});
