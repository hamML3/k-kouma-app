import { describe, it, expect } from "vitest";
import { isPublicPath } from "./publicRoutes";

describe("isPublicPath", () => {
  it.each(["/", "/login", "/register/therapist", "/blog/depression", "/legal/cgu", "/quiz", "/api/payments/paydunya/webhook"])(
    "leaves %s public",
    (path) => expect(isPublicPath(path)).toBe(true)
  );

  it.each(["/dashboard", "/admin", "/admin/finances", "/appointments", "/profile", "/api/appointments", "/api/admin/therapist-documents/x.pdf"])(
    "protects %s",
    (path) => expect(isPublicPath(path)).toBe(false)
  );

  it("matches on path segments, not string prefixes", () => {
    expect(isPublicPath("/blogue")).toBe(false);
    expect(isPublicPath("/login-admin")).toBe(false);
  });
});
