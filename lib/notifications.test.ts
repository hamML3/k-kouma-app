import { describe, expect, it } from "vitest";
import { internalLink } from "./notifications";

describe("internalLink", () => {
  it("garde un chemin interne", () => {
    expect(internalLink("/appointments/12/chat")).toBe("/appointments/12/chat");
  });

  it("écarte tout ce qui sortirait du site", () => {
    expect(internalLink("https://exemple.com")).toBeNull();
    expect(internalLink("//exemple.com")).toBeNull();
    expect(internalLink("/\\exemple.com")).toBeNull();
    expect(internalLink("javascript:alert(1)")).toBeNull();
  });

  it("accepte l'absence de lien", () => {
    expect(internalLink(undefined)).toBeNull();
    expect(internalLink("")).toBeNull();
  });
});
