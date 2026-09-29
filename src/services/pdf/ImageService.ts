import sharp from "sharp";

import { Product } from "@/lib/catalog-data";

const BATCH_SIZE = 20;

const IMAGE_MAX_SIZE = 600;
const JPEG_QUALITY = 25;

const SITE_URL = (
  process.env.SITE_URL ||
  "https://torqon.com.tr"
).replace(/\/$/, "");

type ImageResult = {
  buf: Buffer;
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
 * İndirilen ürün görselini PDF için optimize eder.
 *
 * - EXIF orientation önce uygulanır.
 * - Maksimum 600x600 px yapılır.
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
      /*
       * EXIF orientation bilgisini uygula.
       * Böylece metadata kaldırıldığında
       * fotoğraf dönük çıkmaz.
       */
      .rotate()

      /*
       * Katalogda görseller küçük kullanıldığı için
       * 600x600 fazlasıyla yeterlidir.
       *
       * fit: inside
       * oranı bozmadan sınırlar içinde tutar.
       */
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

      /*
       * PNG gibi transparan görseller JPEG'e
       * çevrilirken siyahlaşmasın.
       */
      .flatten({
        background: {
          r: 255,
          g: 255,
          b: 255,
        },
      })

      /*
       * PDF için optimize JPEG.
       */
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

      /*
       * Sharp varsayılan olarak EXIF/IPTC/XMP
       * metadata'yı yeni çıktıya taşımaz.
       */
      .toBuffer();
  } catch {
    return null;
  }
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
      encodeURIComponent(
        key
      );

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

      /*
       * PDF'e orijinal dosya değil,
       * optimize edilmiş JPEG girecek.
       */
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
 * PDF için bütün ürün görsellerini hazırlar.
 *
 * Ürün birden fazla resim koduna sahipse
 * mevcut sistemde bütün adaylar kontrol edilir.
 *
 * İlk bulunan geçerli görsel ürün için kullanılır.
 *
 * Bu aşamada yalnızca görseller optimize edildi.
 * Aday indirme sistemini sonraki testten sonra
 * ayrıca hızlandırabiliriz.
 */
export async function prefetchProductImages(
  products: Product[]
): Promise<Map<string, string>> {
  const map =
    new Map<
      string,
      string
    >();

  const productImages =
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
          item.keys
            .length > 0
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
   * Aynı görsel kodu birden fazla üründe
   * kullanılıyorsa yalnızca bir kez indir.
   */
  const uniqueKeys =
    Array.from(
      new Set(
        productImages.flatMap(
          (
            item
          ) =>
            item.keys
        )
      )
    );

  console.log(
    `[PDF] ${uniqueKeys.length} farklı görsel adayı kontrol ediliyor...`
  );

  console.log(
    `[PDF] Görsel optimizasyonu: maksimum ${IMAGE_MAX_SIZE}x${IMAGE_MAX_SIZE}px, JPEG kalite %${JPEG_QUALITY}`
  );

  const downloaded =
    new Map<
      string,
      string
    >();

  let optimizedImageCount =
    0;

  let optimizedTotalBytes =
    0;

  /**
   * Görselleri batch halinde indir ve optimize et.
   *
   * 20 seçildi çünkü Sharp aynı anda çok fazla
   * büyük görsel işlerse runner RAM kullanımı
   * gereksiz yükselir.
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
        async (
          key
        ) => {
          const result =
            await downloadImage(
              key
            );

          if (
            !result
          ) {
            return;
          }

          /*
           * Artık bütün PDF ürün görselleri
           * JPEG olarak gönderiliyor.
           */
          const dataUrl =
            "data:image/jpeg;base64," +
            result.buf.toString(
              "base64"
            );

          downloaded.set(
            key,
            dataUrl
          );

          optimizedImageCount++;

          optimizedTotalBytes +=
            result.buf.length;
        }
      )
    );

    console.log(
      `[PDF] Görsel optimizasyonu: ` +
        `${Math.min(
          i +
            BATCH_SIZE,
          uniqueKeys.length
        )}/${uniqueKeys.length}`
    );
  }

  let productsWithImage =
    0;

  let productsWithoutImage =
    0;

  /**
   * Her ürün için ilk geçerli görseli seç.
   */
  for (
    const item of
    productImages
  ) {
    const firstKey =
      item.keys[0];

    let selectedKey:
      | string
      | undefined;

    for (
      const key of
      item.keys
    ) {
      if (
        downloaded.has(
          key
        )
      ) {
        selectedKey =
          key;

        break;
      }
    }

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
     * Gerçek seçilen dosya anahtarı.
     */
    map.set(
      selectedKey,
      dataUrl
    );

    /*
     * ProductPages ilk görsel kodunu aradığı için
     * ilk anahtar da seçilen geçerli görsele yönlenir.
     */
    if (
      firstKey
    ) {
      map.set(
        firstKey,
        dataUrl
      );
    }

    /*
     * Eski kullanım biçimiyle uyumluluk.
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
    optimizedTotalBytes /
    1024 /
    1024;

  const averageKb =
    optimizedImageCount >
    0
      ? optimizedTotalBytes /
        optimizedImageCount /
        1024
      : 0;

  console.log(
    `[PDF] Görsel hazırlama tamamlandı: ` +
      `${productsWithImage} ürün görselli, ` +
      `${productsWithoutImage} ürün için geçerli görsel bulunamadı.`
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
