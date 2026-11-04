import { describe, it, expect } from "vitest";
import { detectDocumentType, documentHref, isDocumentFilename } from "./therapistDocuments";

const UUID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

describe("detectDocumentType", () => {
  it("recognises PDF, PNG and JPEG from their leading bytes", () => {
    expect(detectDocumentType(new TextEncoder().encode("%PDF-1.7"))?.ext).toBe("pdf");
    expect(detectDocumentType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe("png");
    expect(detectDocumentType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
  });

  it("rejects HTML, whatever the client claimed", () => {
    expect(detectDocumentType(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
  });

  it("rejects empty or truncated content", () => {
    expect(detectDocumentType(new Uint8Array())).toBeNull();
    expect(detectDocumentType(Uint8Array.from([0xff, 0xd8]))).toBeNull();
  });
});

describe("isDocumentFilename", () => {
  it("accepts generated names only", () => {
    expect(isDocumentFilename(`${UUID}.pdf`)).toBe(true);
    expect(isDocumentFilename(`${UUID}.JPEG`)).toBe(true);
  });

  it("rejects traversal and other extensions", () => {
    expect(isDocumentFilename("../../.env")).toBe(false);
    expect(isDocumentFilename(`../${UUID}.pdf`)).toBe(false);
    expect(isDocumentFilename(`${UUID}.html`)).toBe(false);
  });
});

describe("documentHref", () => {
  it("maps old and new stored URLs to the protected route", () => {
    const expected = `/api/admin/therapist-documents/${UUID}.pdf`;
    expect(documentHref(`/uploads/diplomas/${UUID}.pdf`)).toBe(expected);
    expect(documentHref(expected)).toBe(expected);
  });
});
