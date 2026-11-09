import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { isArticleImageFilename, isSupportedImage, localArticleImageFile } from "./articleImages";

describe("isSupportedImage", () => {
  it("reconnaît JPEG, PNG et WebP d'après leurs octets", async () => {
    const base = sharp({ create: { width: 4, height: 4, channels: 3, background: "#557B53" } });
    for (const buf of [await base.clone().jpeg().toBuffer(), await base.clone().png().toBuffer(), await base.clone().webp().toBuffer()]) {
      expect(isSupportedImage(new Uint8Array(buf))).toBe(true);
    }
  });

  it("refuse un autre contenu, même nommé .jpg", () => {
    expect(isSupportedImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBe(false);
    expect(isSupportedImage(new TextEncoder().encode("%PDF-1.7"))).toBe(false);
  });
});

describe("noms et adresses d'images", () => {
  const name = "0f8fad5b-d9cb-469f-a165-70867728950e.jpg";

  it("n'accepte que les noms générés par l'app", () => {
    expect(isArticleImageFilename(name)).toBe(true);
    expect(isArticleImageFilename("../../.env")).toBe(false);
    expect(isArticleImageFilename(name.replace(".jpg", ".png"))).toBe(false);
  });

  it("ne relie au disque que les adresses locales", () => {
    expect(localArticleImageFile(`/media/articles/${name}`)).toBe(name);
    expect(localArticleImageFile("https://exemple.com/photo.jpg")).toBeNull();
    expect(localArticleImageFile("/media/articles/../x.jpg")).toBeNull();
    expect(localArticleImageFile(null)).toBeNull();
  });
});
