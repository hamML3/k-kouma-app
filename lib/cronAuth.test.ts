import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cronAuth";

describe("isAuthorizedCron", () => {
  it("accepte le bon secret", () => {
    expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true);
  });

  it("refuse un mauvais secret ou un en-tête absent", () => {
    expect(isAuthorizedCron("Bearer autre", "s3cret")).toBe(false);
    expect(isAuthorizedCron("s3cret", "s3cret")).toBe(false);
    expect(isAuthorizedCron(null, "s3cret")).toBe(false);
  });

  it("reste fermée si aucun secret n'est configuré", () => {
    expect(isAuthorizedCron("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron(null, undefined)).toBe(false);
  });
});
