import { Font } from "@react-pdf/renderer";
import path from "path";
import fs from "fs";

/**
 * React PDF'nin kelimeleri otomatik tireleyip
 * ortadan bölmesini engeller.
 *
 * Örneğin:
 * MERCEDES-BENZ
 * STABİLİZER
 * gibi ifadeler gereksiz şekilde parçalanmaz.
 */
Font.registerHyphenationCallback((word) => [word]);

/**
 * Node.js tarafında kullanılan PDF fontlarını kaydeder.
 *
 * Öncelik:
 * 1. public/fonts içindeki yerel Roboto fontları
 * 2. Yerel font yoksa CDN fallback
 */
export function registerServerFonts() {
  const fontDir = path.join(
    process.cwd(),
    "public",
    "fonts"
  );

  const regularFont = path.join(
    fontDir,
    "Roboto-Regular.ttf"
  );

  const mediumFont = path.join(
    fontDir,
    "Roboto-Medium.ttf"
  );

  const boldFont = path.join(
    fontDir,
    "Roboto-Bold.ttf"
  );

  const blackFont = path.join(
    fontDir,
    "Roboto-Black.ttf"
  );

  /*
   * Bütün yerel font dosyaları mevcutsa
   * doğrudan diskten kullan.
   */
  const hasLocalFonts =
    fs.existsSync(regularFont) &&
    fs.existsSync(mediumFont) &&
    fs.existsSync(boldFont) &&
    fs.existsSync(blackFont);

  if (hasLocalFonts) {
    Font.register({
      family: "Roboto",
      fonts: [
        {
          src: regularFont,
          fontWeight: 400,
        },
        {
          src: mediumFont,
          fontWeight: 500,
        },
        {
          src: boldFont,
          fontWeight: 700,
        },
        {
          src: blackFont,
          fontWeight: 900,
        },
      ],
    });

    return;
  }

  /*
   * Yerel fontlardan biri bile eksikse
   * CDN fallback kullan.
   */
  console.warn(
    "[PDF] Yerel Roboto fontları eksik. CDN fallback kullanılıyor."
  );

  Font.register({
    family: "Roboto",
    fonts: [
      {
        src:
          "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
        fontWeight: 400,
      },
      {
        src:
          "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
        fontWeight: 500,
      },
      {
        src:
          "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
        fontWeight: 700,
      },
      {
        src:
          "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-black-webfont.ttf",
        fontWeight: 900,
      },
    ],
  });
}
