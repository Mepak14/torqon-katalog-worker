import sharp from "sharp";

import { Product } from "@/lib/catalog-data";

/*
 * Aynı anda indirilecek görsel sayısı.
 *
 * 100 yerine 60 kullanıyoruz.
 * Böylece site görsel endpoint'ine
 * daha kontrollü yük biner.
 */
const BATCH_SIZE = 60;

/*
 * Görsel optimizasyon ayarları.
 */
const IMAGE_MAX_SIZE = 450;
const JPEG_QUALITY = 25;

/*
 * Her bir HTTP isteğinin maksimum
 * bekleme süresi.
 */
const IMAGE_TIMEOUT_MS = 20000;

/*
 * Bir görsel başarısız olursa
 * toplam kaç kez denenecek.
 */
const MAX_RETRIES = 3;

/*
 * Retry aralarında beklenecek
 * temel süre.
 *
 * 1. retry: 400ms
 * 2. retry: 800ms
 */
const RETRY_DELAY_MS = 400;

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
 * Kısa bekleme.
 */
function wait(
  milliseconds: number
): Promise<void> {
  return new Promise(
    (
      resolve
    ) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

/**
 * İndirilen ürün görselini PDF için optimize eder.
 *
 * Hız / boyut odaklı ayarlar:
 *
 * - EXIF orientation uygulanır.
 * - Maksimum 450x450 px.
 * - Küçük görseller büyütülmez.
 * - Transparan alanlar beyaz yapılır.
 * - JPEG kalite %25.
 * - MozJPEG kullanılmaz.
 * - Progressive JPEG kullanılmaz.
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

        progressive:
          false,

        chromaSubsampling:
          "4:2:0",
      })

      .toBuffer();
  } catch (
    error
  ) {
    console.warn(
      "[PDF] Görsel optimize edilemedi:",
      error
    );

    return null;
  }
}

/**
 * Web sitesinin kullandığı R2 görsel
 * endpoint'inden tek görseli bir kez
 * indirmeyi dener.
 */
async function downloadImageOnce(
  key: string
): Promise<ImageResult | null> {
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
      IMAGE_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal,

          cache:
            "no-store",

          headers: {
            "User-Agent":
              "Torqon-Catalog-PDF/1.0",

            Accept:
              "image/*",

            "Cache-Control":
              "no-cache",
          },
        }
      );

    if (
      !response.ok
    ) {
      console.warn(
        `[PDF] Görsel HTTP hatası: ${key} → ${response.status}`
      );

      return null;
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) ||
      "";

    if (
      !contentType.startsWith(
        "image/"
      )
    ) {
      console.warn(
        `[PDF] Görsel olmayan içerik döndü: ${key} → ${contentType}`
      );

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
      console.warn(
        `[PDF] Boş görsel döndü: ${key}`
      );

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
      console.warn(
        `[PDF] Görsel optimize sonucu boş: ${key}`
      );

      return null;
    }

    return {
      buf:
        optimizedBuffer,
    };
  } catch (
    error
  ) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      console.warn(
        `[PDF] Görsel timeout: ${key} (${IMAGE_TIMEOUT_MS / 1000} sn)`
      );
    } else {
      console.warn(
        `[PDF] Görsel indirme hatası: ${key}`,
        error
      );
    }

    return null;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

/**
 * Tek bir görseli retry desteğiyle indirir.
 *
 * Toplam:
 *
 * Deneme 1
 * Deneme 2
 * Deneme 3
 *
 * Ancak üçü de başarısız olursa
 * null döner.
 */
async function downloadImage(
  key: string
): Promise<ImageResult | null> {
  for (
    let attempt = 1;
    attempt <=
    MAX_RETRIES;
    attempt++
  ) {
    const result =
      await downloadImageOnce(
        key
      );

    if (
      result
    ) {
      if (
        attempt >
        1
      ) {
        console.log(
          `[PDF] Görsel retry ile bulundu: ${key} (${attempt}. deneme)`
        );
      }

      return result;
    }

    if (
      attempt <
      MAX_RETRIES
    ) {
      const delay =
        RETRY_DELAY_MS *
        attempt;

      console.warn(
        `[PDF] Görsel tekrar denenecek: ${key} (${attempt}/${MAX_RETRIES})`
      );

      await wait(
        delay
      );
    }
  }

  console.error(
    `[PDF] Görsel ${MAX_RETRIES} denemede alınamadı: ${key}`
  );

  return null;
}

/**
 * Verilen görselleri 60'ar paket
 * halinde indirip optimize eder.
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
           * Daha önce başarılı veya
           * kesin başarısız olarak
           * işaretlenen dosyayı
           * tekrar işleme.
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

          /*
           * downloadImage içerisinde
           * zaten 3 retry var.
           */
          const result =
            await downloadImage(
              key
            );

          if (
            !result
          ) {
            /*
             * Ancak üç denemenin tamamı
             * başarısız olduktan sonra
             * failed listesine girer.
             */
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
 * Mantık:
 *
 * 1. Her ürünün ilk görseli denenir.
 * 2. Görsel alınamazsa aynı görsel
 *    3 kez retry edilir.
 * 3. Yine bulunamazsa ürünün ikinci
 *    görseline geçilir.
 * 4. Gerekirse sonraki görseller denenir.
 *
 * Böylece geçici HTTP / timeout
 * problemlerinde ürün görselsiz kalmaz.
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
    `[PDF] Görsel ayarları: maksimum ${IMAGE_MAX_SIZE}x${IMAGE_MAX_SIZE}px, ` +
      `JPEG kalite %${JPEG_QUALITY}, ` +
      `paralel işlem ${BATCH_SIZE}, ` +
      `timeout ${IMAGE_TIMEOUT_MS / 1000} sn, ` +
      `retry ${MAX_RETRIES}`
  );

  const downloaded =
    new Map<
      string,
      string
    >();

  /*
   * Ancak bütün retry denemeleri
   * başarısız olmuş görseller
   * buraya eklenir.
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
   * Görsel adaylarını sırayla dene.
   *
   * Tur 1:
   * tüm ürünlerin ilk görseli.
   *
   * Tur 2:
   * yalnızca ilk görseli bulunamayanların
   * ikinci görseli.
   *
   * Tur 3:
   * gerekirse üçüncü görsel.
   */
  for (
    let candidateIndex =
      0;

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
     * benzersiz görseller.
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
     * Daha önce kesin sonucu belli
     * olan dosyaları tekrar işleme.
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
      `[PDF] Görsel turu ${candidateIndex + 1}: ` +
        `${keysToDownload.length} yeni dosya kontrol ediliyor...`
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
     * Başarılı bulunan görselleri
     * ürünlere bağla.
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
      `[PDF] Görsel turu ${candidateIndex + 1} tamamlandı. ` +
        `Görselsiz kalan ürün: ${remaining}`
    );

    /*
     * Bütün ürünlere görsel bulunduysa
     * sonraki adaylara bakma.
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
   * PDF'de hiçbir geçerli görsel
   * bulunamayan ürünleri takip etmek
   * için liste.
   */
  const missingProducts:
    string[] =
      [];

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

      missingProducts.push(
        item.raw ||
          item.keys.join(
            " | "
          )
      );

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

      missingProducts.push(
        item.raw ||
          selectedKey
      );

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
     * aradığı için ilk anahtarı da seçilen
     * geçerli görsele yönlendir.
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
    `[PDF] Gerçekten indirilen/optimize edilen görsel: ` +
      `${stats.optimizedImageCount}`
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

  /*
   * PDF'de görseli bulunamayan
   * ürün/görsel kodlarını açıkça logla.
   */
  if (
    missingProducts.length >
    0
  ) {
    console.warn(
      `[PDF] Görseli bulunamayan ürün sayısı: ${missingProducts.length}`
    );

    console.warn(
      "[PDF] Görseli bulunamayan kayıtlar:"
    );

    missingProducts.forEach(
      (
        item,
        index
      ) => {
        console.warn(
          `[PDF] ${index + 1}. ${item}`
        );
      }
    );
  }

  /*
   * HTTP / timeout / optimize nedeniyle
   * bütün retry'leri başarısız olmuş
   * gerçek görsel anahtarlarını da yaz.
   */
  if (
    failed.size >
    0
  ) {
    console.warn(
      `[PDF] Tamamen başarısız görsel anahtarı: ${failed.size}`
    );

    Array.from(
      failed
    ).forEach(
      (
        key,
        index
      ) => {
        console.warn(
          `[PDF] FAILED ${index + 1}: ${key}`
        );
      }
    );
  }

  return map;
}