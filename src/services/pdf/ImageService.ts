import { Product } from "@/lib/catalog-data";

const BATCH_SIZE = 40;

const SITE_URL = (
  process.env.SITE_URL ||
  "https://torqon.com.tr"
).replace(/\/$/, "");

type ImageResult = {
  buf: Buffer;
  mime: string;
};

/**
 * resim_kodlari alanındaki bütün görsel
 * dosyalarını sıralı şekilde ayırır.
 */
function getImageKeys(
  value?: string | null
): string[] {
  return Array.from(
    new Set(
      (value || "")
        .split(/[,;|\n]+/)
        .map((item) =>
          item.trim()
        )
        .filter(Boolean)
    )
  );
}

/**
 * Web sitesinin kullandığı R2 görsel
 * endpoint'inden görsel indirir.
 */
async function downloadImage(
  key: string
): Promise<ImageResult | null> {
  try {
    const url =
      `${SITE_URL}/api/gorsel/` +
      encodeURIComponent(key);

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        15000
      );

    try {
      const response =
        await fetch(url, {
          signal:
            controller.signal,

          headers: {
            "User-Agent":
              "Torqon-Catalog-PDF/1.0",

            Accept:
              "image/*",
          },
        });

      if (!response.ok) {
        return null;
      }

      const contentType =
        response.headers.get(
          "content-type"
        ) ||
        "image/jpeg";

      if (
        !contentType.startsWith(
          "image/"
        )
      ) {
        return null;
      }

      const arrayBuffer =
        await response.arrayBuffer();

      const buf =
        Buffer.from(
          arrayBuffer
        );

      if (
        buf.length === 0
      ) {
        return null;
      }

      return {
        buf,
        mime:
          contentType,
      };
    } finally {
      clearTimeout(
        timeout
      );
    }
  } catch {
    return null;
  }
}

/**
 * PDF için bütün ürün görsellerini hazırlar.
 *
 * Önemli:
 *
 * resim_kodlari:
 *
 * a.jpg,b.jpg,c.jpg
 *
 * şeklindeyse bütün adaylar kontrol edilir.
 *
 * a.jpg yoksa,
 * b.jpg varsa,
 *
 * b.jpg kullanılır.
 *
 * Yani ilk yazılan değil,
 * ilk GEÇERLİ görsel kullanılır.
 */
export async function prefetchProductImages(
  products: Product[]
): Promise<Map<string, string>> {
  const map =
    new Map<string, string>();

  /**
   * Her ürünün görsel adaylarını hazırla.
   */
  const productImages =
    products
      .map((product) => {
        const raw =
          product
            .resim_kodlari
            ?.trim() ||
          "";

        const keys =
          getImageKeys(
            product.resim_kodlari
          );

        return {
          raw,
          keys,
        };
      })
      .filter(
        (item) =>
          item.keys.length >
          0
      );

  if (
    productImages.length ===
    0
  ) {
    console.log(
      "[PDF] Ürün görseli bulunamadı."
    );

    return map;
  }

  /**
   * Tüm görsel adaylarını tekilleştir.
   *
   * Böylece aynı görsel yüzlerce üründe
   * kullanılıyorsa yalnızca bir kez indirilir.
   */
  const uniqueKeys =
    Array.from(
      new Set(
        productImages.flatMap(
          (item) =>
            item.keys
        )
      )
    );

  console.log(
    `[PDF] ${uniqueKeys.length} farklı görsel adayı kontrol ediliyor...`
  );

  /**
   * Başarıyla indirilen görseller.
   */
  const downloaded =
    new Map<
      string,
      string
    >();

  /**
   * Görselleri batch halinde indir.
   */
  for (
    let i = 0;
    i <
    uniqueKeys.length;
    i += BATCH_SIZE
  ) {
    const batch =
      uniqueKeys.slice(
        i,
        i +
          BATCH_SIZE
      );

    await Promise.all(
      batch.map(
        async (key) => {
          const result =
            await downloadImage(
              key
            );

          if (!result) {
            return;
          }

          const dataUrl =
            `data:${result.mime};base64,` +
            result.buf.toString(
              "base64"
            );

          downloaded.set(
            key,
            dataUrl
          );
        }
      )
    );

    console.log(
      `[PDF] Görsel kontrolü: ` +
        `${Math.min(
          i + BATCH_SIZE,
          uniqueKeys.length
        )}/${uniqueKeys.length}`
    );
  }

  let productsWithImage =
    0;

  let productsWithoutImage =
    0;

  /**
   * Her ürün için aday görselleri
   * sırayla kontrol et.
   *
   * İlk bulunan geçerli görsel kullanılır.
   */
  for (
    const item of
    productImages
  ) {
    const firstKey =
      item.keys[0];

    let selectedKey:
      string | undefined;

    for (
      const key of
      item.keys
    ) {
      if (
        downloaded.has(key)
      ) {
        selectedKey =
          key;

        break;
      }
    }

    if (!selectedKey) {
      productsWithoutImage++;
      continue;
    }

    const dataUrl =
      downloaded.get(
        selectedKey
      );

    if (!dataUrl) {
      productsWithoutImage++;
      continue;
    }

    productsWithImage++;

    /**
     * Gerçek seçilen dosya adı.
     */
    map.set(
      selectedKey,
      dataUrl
    );

    /**
     * ProductPages.tsx ilk görsel kodunu
     * aradığı için ilk anahtarı da seçilen
     * geçerli görsele yönlendiriyoruz.
     *
     * Örnek:
     *
     * a.jpg yok
     * b.jpg var
     *
     * map.get("a.jpg")
     *
     * yine b.jpg görselini döndürür.
     */
    if (firstKey) {
      map.set(
        firstKey,
        dataUrl
      );
    }

    /**
     * Eski kullanım biçimiyle de uyumlu kalması
     * için ham resim_kodlari değerini ekle.
     */
    if (item.raw) {
      map.set(
        item.raw,
        dataUrl
      );
    }
  }

  console.log(
    `[PDF] Görsel hazırlama tamamlandı: ` +
      `${productsWithImage} ürün görselli, ` +
      `${productsWithoutImage} ürün için geçerli görsel bulunamadı.`
  );

  return map;
}
