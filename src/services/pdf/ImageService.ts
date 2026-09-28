import { Product } from "@/lib/catalog-data";

const BATCH_SIZE = 40;
const SITE_URL = (process.env.SITE_URL || "https://torqon.com.tr").replace(
  /\/$/,
  ""
);

type ImageResult = {
  buf: Buffer;
  mime: string;
};

/**
 * resim_kodlari içinden kullanılacak ilk geçerli görsel adını alır.
 *
 * Örnek:
 * "MM05.10404.jpg,MM05.10404_2.jpg"
 * ->
 * "MM05.10404.jpg"
 */
function getFirstImageKey(
  value?: string | null
): string | null {
  const first = value
    ?.split(/[,;|\n]+/)
    .map((item) => item.trim())
    .find(Boolean);

  return first || null;
}

/**
 * Web sitesinin kullandığı aynı görsel API'sinden ürünü indirir.
 *
 * Bu endpoint Cloudflare R2'deki gerçek ürün görselini döndürür:
 * https://torqon.com.tr/api/gorsel/DOSYA_ADI
 */
async function downloadImage(
  key: string
): Promise<ImageResult | null> {
  try {
    const url =
      `${SITE_URL}/api/gorsel/${encodeURIComponent(key)}`;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Torqon-Catalog-PDF/1.0",
          Accept: "image/*",
        },
      });

      if (!response.ok) {
        return null;
      }

      const contentType =
        response.headers.get("content-type") ||
        "image/jpeg";

      if (!contentType.startsWith("image/")) {
        return null;
      }

      const arrayBuffer =
        await response.arrayBuffer();

      const buf = Buffer.from(arrayBuffer);

      if (buf.length === 0) {
        return null;
      }

      return {
        buf,
        mime: contentType,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

/**
 * Ürün görsellerini PDF hazırlanırken toplu şekilde indirir.
 *
 * Görseller doğrudan Supabase Storage'dan değil,
 * torqon.com.tr/api/gorsel üzerinden alınır.
 *
 * Böylece PDF ile web sitesi aynı görsel kaynağını kullanır.
 */
export async function prefetchProductImages(
  products: Product[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  /*
   * ProductPages.tsx şu anda imgMap'i resim_kodlari'nın
   * tamamıyla sorguladığı için hem ham değeri hem de
   * ilk görsel kodunu saklıyoruz.
   *
   * Böylece:
   *
   * resim_kodlari =
   * "MM05.10404.jpg,MM05.10404_2.jpg"
   *
   * hem:
   * map.get("MM05.10404.jpg")
   *
   * hem:
   * map.get("MM05.10404.jpg,MM05.10404_2.jpg")
   *
   * çalışır.
   */
  const productImages = products
    .map((product) => {
      const raw =
        product.resim_kodlari?.trim() || "";

      const firstKey =
        getFirstImageKey(
          product.resim_kodlari
        );

      return {
        raw,
        firstKey,
      };
    })
    .filter(
      (
        item
      ): item is {
        raw: string;
        firstKey: string;
      } => !!item.firstKey
    );

  const uniqueKeys = [
    ...new Set(
      productImages.map(
        (item) => item.firstKey
      )
    ),
  ];

  if (uniqueKeys.length === 0) {
    console.log(
      "[PDF] Ürün görseli bulunamadı."
    );

    return map;
  }

  console.log(
    `[PDF] ${uniqueKeys.length} farklı ürün görseli hazırlanıyor...`
  );

  /*
   * Önce gerçek dosya adına göre indirilen görselleri
   * burada saklıyoruz.
   */
  const downloaded =
    new Map<string, string>();

  for (
    let i = 0;
    i < uniqueKeys.length;
    i += BATCH_SIZE
  ) {
    const batch =
      uniqueKeys.slice(
        i,
        i + BATCH_SIZE
      );

    await Promise.all(
      batch.map(async (key) => {
        const result =
          await downloadImage(key);

        if (!result) {
          return;
        }

        const dataUrl =
          `data:${result.mime};base64,` +
          result.buf.toString("base64");

        downloaded.set(
          key,
          dataUrl
        );
      })
    );

    console.log(
      `[PDF] Görsel ilerleme: ` +
        `${Math.min(
          i + BATCH_SIZE,
          uniqueKeys.length
        )}/${uniqueKeys.length}`
    );
  }

  /*
   * ProductPages mevcut yapısıyla uyumlu olması için
   * iki farklı anahtarla kaydet.
   */
  for (const item of productImages) {
    const dataUrl =
      downloaded.get(item.firstKey);

    if (!dataUrl) {
      continue;
    }

    // İlk görsel kodu
    map.set(
      item.firstKey,
      dataUrl
    );

    // DB'deki resim_kodlari'nın tamamı
    if (item.raw) {
      map.set(
        item.raw,
        dataUrl
      );
    }
  }

  const missing =
    uniqueKeys.length -
    downloaded.size;

  console.log(
    `[PDF] Görsel hazırlama tamamlandı: ` +
      `${downloaded.size}/${uniqueKeys.length} başarılı` +
      (missing > 0
        ? `, ${missing} görsel bulunamadı.`
        : ".")
  );

  return map;
}
