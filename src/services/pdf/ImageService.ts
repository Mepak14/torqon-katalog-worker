import sharp from "sharp";

import { Product } from "@/lib/catalog-data";

const BATCH_SIZE = 50;

const IMAGE_MAX_SIZE = 600;
const JPEG_QUALITY = 25;

const SITE_URL = (
  process.env.SITE_URL ||
  "https://torqon.com.tr"
).replace(/\/$/, "");

type ImageResult = {
  buf: Buffer;
};

type ProductImageItem = {
  raw: string;
  keys: string[];
  selectedKey?: string;
};

/**
 * resim_kodlari alanındaki görsel
 * dosyalarını sıralı şekilde ayırır.
 */
function getImageKeys(
  value?: string | null
): string[] {
  return Array.from(
    new Set(
      (value || "")
        .split(/[,;|\n]+/)
        .map(
          (
            item
          ) =>
            item.trim()
        )
        .filter(
          Boolean
        )
    )
  );
}

/**
 * İndirilen ürün görselini PDF için optimize eder.
 *
 * - EXIF orientation uygulanır.
 * - Maksimum 600x600 px.
 * - Küçük görseller büyütülmez.
 * - Transparan alanlar beyaz yapılır.
 * - JPEG kalite %25.
 * - MozJPEG sıkıştırma kullanılır.
 * - Metadata çıktı dosyasına taşınmaz.
 */
async function optimizeImage(
  input: Buffer
): Promise<Buffer | null> {
  try {
    return await sharp(
      input,
      {
        failOn:
          "none",
      }
    )
      .rotate()

      .resize({
        width:
          IMAGE_MAX_SIZE,

        height:
          IMAGE_MAX_SIZE,

        fit:
          "inside",

        withoutEnlargement:
          true,
      })

      .flatten({
        background: {
          r: 255,
          g: 255,
          b: 255,
        },
      })

      .jpeg({
        quality:
          JPEG_QUALITY,

        mozjpeg:
          true,

        progressive:
          true,

        chromaSubsampling:
          "4:2:0",
      })

      .toBuffer();
  } catch {
    return null;
  }
}

/**
 * Web sitesinin kullandığı R2 görsel
 * endpoint'inden tek görsel indirir.
 */
async function downloadImage(
  key: string
): Promise<ImageResult | null> {
  try {
    const url =
      `${SITE_URL}/api/gorsel/` +
      encodeURIComponent(
        key
      );

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        10000
      );

    try {
      const response =
        await fetch(
          url,
          {
            signal:
              controller.signal,

            headers: {
              "User-Agent":
                "Torqon-Catalog-PDF/1.0",

              Accept:
                "image/*",
            },
          }
        );

      if (
        !response.ok
      ) {
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

      const originalBuffer =
        Buffer.from(
          arrayBuffer
        );

      if (
        originalBuffer.length ===
        0
      ) {
        return null;
      }

      const optimizedBuffer =
        await optimizeImage(
          originalBuffer
        );

      if (
        !optimizedBuffer ||
        optimizedBuffer.length ===
          0
      ) {
        return null;
      }

      return {
        buf:
          optimizedBuffer,
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
 * Verilen görselleri 50'şerli
 * paketler halinde indirip optimize eder.
 */
async function downloadKeys(
  keys: string[],
  downloaded: Map<
    string,
    string
  >,
  failed: Set<string>,
  stats: {
    optimizedImageCount: number;
    optimizedTotalBytes: number;
  },
  roundNumber: number
): Promise<void> {
  for (
    let i = 0;
    i < keys.length;
    i += BATCH_SIZE
  ) {
    const batch =
      keys.slice(
        i,
        i +
          BATCH_SIZE
      );

    await Promise.all(
      batch.map(
        async (
          key
        ) => {
          /*
           * Daha önce başarılı veya başarısız
           * olarak kontrol edilen dosyayı
           * tekrar indirme.
           */
          if (
            downloaded.has(
              key
            ) ||
            failed.has(
              key
            )
          ) {
            return;
          }

          const result =
            await downloadImage(
              key
            );

          if (
            !result
          ) {
            failed.add(
              key
            );

            return;
          }

          const dataUrl =
            "data:image/jpeg;base64," +
            result.buf.toString(
              "base64"
            );

          downloaded.set(
            key,
            dataUrl
          );

          stats.optimizedImageCount++;

          stats.optimizedTotalBytes +=
            result.buf.length;
        }
      )
    );

    console.log(
      `[PDF] Görsel turu ${roundNumber}: ` +
        `${Math.min(
          i +
            BATCH_SIZE,
          keys.length
        )}/${keys.length}`
    );
  }
}

/**
 * PDF için ürün görsellerini hazırlar.
 *
 * Hız optimizasyonu:
 *
 * Eskiden bütün görsel adayları baştan
 * indiriliyor ve optimize ediliyordu.
 *
 * Artık:
 *
 * 1. Önce her ürünün ilk görseli denenir.
 * 2. İlk görseli bulunamayan ürünlerde
 *    ikinci görsel denenir.
 * 3. Gerekirse üçüncü ve sonraki
 *    görsellere geçilir.
 *
 * Böylece PDF'de kullanılmayacak
 * görseller gereksiz yere indirilmez.
 */
export async function prefetchProductImages(
  products: Product[]
): Promise<Map<string, string>> {
  const map =
    new Map<
      string,
      string
    >();

  const productImages:
    ProductImageItem[] =
      products
        .map(
          (
            product
          ) => {
            const raw =
              product
                .resim_kodlari
                ?.trim() ||
              "";

            const keys =
              getImageKeys(
                product
                  .resim_kodlari
              );

            return {
              raw,
              keys,
            };
          }
        )
        .filter(
          (
            item
          ) =>
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

  console.log(
    `[PDF] ${productImages.length} ürün için görsel hazırlanıyor...`
  );

  console.log(
    `[PDF] Görsel ayarları: maksimum ${IMAGE_MAX_SIZE}x${IMAGE_MAX_SIZE}px, JPEG kalite %${JPEG_QUALITY}, paralel işlem ${BATCH_SIZE}`
  );

  const downloaded =
    new Map<
      string,
      string
    >();

  /*
   * Bir kez bulunamadığı tespit edilen
   * görseller tekrar denenmez.
   */
  const failed =
    new Set<string>();

  const stats = {
    optimizedImageCount:
      0,

    optimizedTotalBytes:
      0,
  };

  /*
   * Herhangi bir üründe en fazla kaç
   * görsel adayı olduğunu bul.
   */
  const maxCandidates =
    productImages.reduce(
      (
        max,
        item
      ) =>
        Math.max(
          max,
          item.keys.length
        ),
      0
    );

  /*
   * Görsel adaylarını sıra sıra dene.
   *
   * candidateIndex 0:
   * tüm ürünlerin ilk görseli.
   *
   * candidateIndex 1:
   * yalnızca görsel bulunamayanların
   * ikinci görseli.
   */
  for (
    let candidateIndex = 0;
    candidateIndex <
    maxCandidates;
    candidateIndex++
  ) {
    const unresolved =
      productImages.filter(
        (
          item
        ) =>
          !item.selectedKey &&
          Boolean(
            item.keys[
              candidateIndex
            ]
          )
      );

    if (
      unresolved.length ===
      0
    ) {
      continue;
    }

    /*
     * Bu turda kontrol edilecek
     * benzersiz dosyaları çıkar.
     */
    const candidateKeys =
      Array.from(
        new Set(
          unresolved
            .map(
              (
                item
              ) =>
                item.keys[
                  candidateIndex
                ]
            )
            .filter(
              (
                key
              ): key is string =>
                Boolean(
                  key
                )
            )
        )
      );

    /*
     * Önceden başarılı/başarısız kontrol
     * edilmiş dosyaları tekrar işleme.
     */
    const keysToDownload =
      candidateKeys.filter(
        (
          key
        ) =>
          !downloaded.has(
            key
          ) &&
          !failed.has(
            key
          )
      );

    console.log(
      `[PDF] Görsel turu ${candidateIndex + 1}: ${keysToDownload.length} yeni dosya kontrol ediliyor...`
    );

    if (
      keysToDownload.length >
      0
    ) {
      await downloadKeys(
        keysToDownload,
        downloaded,
        failed,
        stats,
        candidateIndex +
          1
      );
    }

    /*
     * Bu turda başarılı bulunan
     * görselleri ürünlere bağla.
     */
    for (
      const item of
      unresolved
    ) {
      const key =
        item.keys[
          candidateIndex
        ];

      if (
        key &&
        downloaded.has(
          key
        )
      ) {
        item.selectedKey =
          key;
      }
    }

    const remaining =
      productImages.filter(
        (
          item
        ) =>
          !item.selectedKey
      ).length;

    console.log(
      `[PDF] Görsel turu ${candidateIndex + 1} tamamlandı. Görselsiz kalan ürün: ${remaining}`
    );

    /*
     * Bütün ürünlere görsel bulunduysa
     * sonraki adaylara bakmaya gerek yok.
     */
    if (
      remaining ===
      0
    ) {
      break;
    }
  }

  let productsWithImage =
    0;

  let productsWithoutImage =
    0;

  /*
   * Seçilen görselleri PDF map'ine aktar.
   */
  for (
    const item of
    productImages
  ) {
    const selectedKey =
      item.selectedKey;

    if (
      !selectedKey
    ) {
      productsWithoutImage++;

      continue;
    }

    const dataUrl =
      downloaded.get(
        selectedKey
      );

    if (
      !dataUrl
    ) {
      productsWithoutImage++;

      continue;
    }

    productsWithImage++;

    /*
     * Gerçek kullanılan görsel.
     */
    map.set(
      selectedKey,
      dataUrl
    );

    /*
     * ProductPages ilk görsel anahtarını
     * aradığı için ilk anahtarı da
     * bulunan geçerli görsele yönlendir.
     */
    const firstKey =
      item.keys[0];

    if (
      firstKey
    ) {
      map.set(
        firstKey,
        dataUrl
      );
    }

    /*
     * Eski kullanım biçimleriyle
     * uyumluluğu koru.
     */
    if (
      item.raw
    ) {
      map.set(
        item.raw,
        dataUrl
      );
    }
  }

  const optimizedMb =
    stats.optimizedTotalBytes /
    1024 /
    1024;

  const averageKb =
    stats.optimizedImageCount >
    0
      ? stats.optimizedTotalBytes /
        stats.optimizedImageCount /
        1024
      : 0;

  console.log(
    `[PDF] Görsel hazırlama tamamlandı: ` +
      `${productsWithImage} ürün görselli, ` +
      `${productsWithoutImage} ürün için geçerli görsel bulunamadı.`
  );

  console.log(
    `[PDF] Gerçekten indirilen/optimize edilen görsel: ${stats.optimizedImageCount}`
  );

  console.log(
    `[PDF] Optimize görsel verisi: ` +
      `${optimizedMb.toFixed(
        1
      )} MB, ` +
      `ortalama ${averageKb.toFixed(
        1
      )} KB/görsel`
  );

  return map;
}