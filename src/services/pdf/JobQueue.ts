import {
  generateCatalogPDF,
} from "./PDFGeneratorService";

import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

type JobState = {
  status:
    | "pending"
    | "processing"
    | "done"
    | "error";

  progress: number;

  file_url?: string;

  error?: string;
};

export type CatalogFilters = {
  brands?: string[];
  categories?: string[];
};

/**
 * PDF üretim işinin güncel durumunu getirir.
 */
export async function getJobStatus(
  jobId: string
): Promise<JobState | null> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("pdf_jobs")
    .select(
      "status, progress, file_url, error"
    )
    .eq(
      "id",
      jobId
    )
    .single();

  if (
    error ||
    !data
  ) {
    return null;
  }

  return data as JobState;
}

/**
 * PDF üretim işinin durumunu günceller.
 */
export async function updateJobStatus(
  jobId: string,
  updates: Partial<JobState>
): Promise<void> {
  await supabaseAdmin
    .from("pdf_jobs")
    .update(updates)
    .eq(
      "id",
      jobId
    );
}

/**
 * Katalog içeriğine göre benzersiz hash oluşturur.
 *
 * Hash artık şunlara bağlıdır:
 *
 * - ürünlerin son güncellenme tarihi
 * - katalog filtreleri
 * - marka sırası
 * - kategori sırası
 * - katalog ayar versiyonu
 * - kategori aktif / pasif durumları
 *
 * Böylece sadece admin sıralaması veya kategori durumu
 * değişse bile yeni PDF dosya adı oluşur.
 */
export async function generateContentHash(
  filters: CatalogFilters
): Promise<string> {
  const [
    productResult,
    settingsResult,
    categoriesResult,
  ] = await Promise.all([
    /*
     * En son güncellenen ürün.
     */
    supabaseAdmin
      .from("products")
      .select("updated_at")
      .order(
        "updated_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle(),

    /*
     * PDF yapısını etkileyen katalog ayarları.
     */
    supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in(
        "key",
        [
          "catalog_settings_version",
          "catalog_brand_order",
          "catalog_category_order",
        ]
      ),

    /*
     * Aktif/pasif kategori değişiklikleri de
     * PDF içeriğini değiştirdiği için hash'e dahil edilir.
     */
    supabaseAdmin
      .from("categories")
      .select(
        "name, is_active"
      ),
  ]);

  if (
    productResult.error
  ) {
    console.warn(
      "[PDF] Hash için ürün güncelleme tarihi okunamadı:",
      productResult.error.message
    );
  }

  if (
    settingsResult.error
  ) {
    console.warn(
      "[PDF] Hash için katalog ayarları okunamadı:",
      settingsResult.error.message
    );
  }

  if (
    categoriesResult.error
  ) {
    console.warn(
      "[PDF] Hash için kategori durumları okunamadı:",
      categoriesResult.error.message
    );
  }

  const lastProductUpdate =
    productResult.data?.updated_at ||
    "no-product-update";

  /*
   * Supabase dönüş sırası garanti olmadığı için
   * hash'in gereksiz yere değişmemesi adına sıralıyoruz.
   */
  const settings =
    [
      ...(
        settingsResult.data ||
        []
      ),
    ].sort(
      (a, b) =>
        String(
          a.key
        ).localeCompare(
          String(
            b.key
          ),
          "tr"
        )
    );

  const categories =
    [
      ...(
        categoriesResult.data ||
        []
      ),
    ]
      .map(
        (category) => ({
          name:
            String(
              category.name ||
                ""
            )
              .trim()
              .toLocaleUpperCase(
                "tr-TR"
              ),

          is_active:
            category.is_active ===
            true,
        })
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "tr"
          )
      );

  /*
   * Filtre sırası değişse bile aynı filtreler
   * aynı hash'i üretsin.
   */
  const normalizedFilters = {
    brands:
      [
        ...(
          filters?.brands ||
          []
        ),
      ]
        .map(
          (item) =>
            item
              .trim()
              .toLocaleUpperCase(
                "tr-TR"
              )
        )
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.localeCompare(
              b,
              "tr"
            )
        ),

    categories:
      [
        ...(
          filters?.categories ||
          []
        ),
      ]
        .map(
          (item) =>
            item
              .trim()
              .toLocaleUpperCase(
                "tr-TR"
              )
        )
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.localeCompare(
              b,
              "tr"
            )
        ),
  };

  const payload =
    JSON.stringify({
      version:
        "catalog-production-v3",

      filters:
        normalizedFilters,

      lastProductUpdate,

      settings,

      categories,
    });

  return crypto
    .createHash("md5")
    .update(payload)
    .digest("hex");
}

/**
 * 24 saatten eski geçici katalog PDF'lerini temizler.
 */
function cleanOldPdfFiles(): void {
  const tmpDir =
    os.tmpdir();

  const maxAgeMs =
    24 *
    60 *
    60 *
    1000;

  try {
    fs.readdirSync(
      tmpDir
    )
      .filter(
        (file) =>
          file.startsWith(
            "catalog_"
          ) &&
          file.endsWith(
            ".pdf"
          )
      )
      .forEach(
        (file) => {
          const filePath =
            path.join(
              tmpDir,
              file
            );

          const stat =
            fs.statSync(
              filePath
            );

          if (
            Date.now() -
              stat.mtimeMs >
            maxAgeMs
          ) {
            fs.unlinkSync(
              filePath
            );
          }
        }
      );
  } catch {
    /*
     * Geçici dosya temizleme hatası
     * PDF üretimini engellemez.
     */
  }
}

/**
 * Yeni PDF oluşturma işi başlatır.
 */
export async function startPdfJob(
  filters: CatalogFilters = {}
): Promise<string> {
  cleanOldPdfFiles();

  const contentHash =
    await generateContentHash(
      filters
    );

  /*
   * Job kaydını oluştur.
   */
  const {
    data: job,
    error,
  } = await supabaseAdmin
    .from("pdf_jobs")
    .insert([
      {
        status: "pending",
        progress: 0,
      },
    ])
    .select()
    .single();

  if (
    error ||
    !job
  ) {
    throw new Error(
      "PDF işi veritabanında oluşturulamadı."
    );
  }

  const jobId =
    job.id;

  /*
   * PDF oluşturmayı arka planda başlat.
   */
  void (async () => {
    try {
      await updateJobStatus(
        jobId,
        {
          status:
            "processing",

          progress: 5,
        }
      );

      await generateCatalogPDF(
        jobId,
        contentHash,
        filters
      );
    } catch (error) {
      console.error(
        "[PDF] PDF işi başarısız:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Bilinmeyen hata";

      await updateJobStatus(
        jobId,
        {
          status: "error",
          progress: 0,
          error: message,
        }
      );
    }
  })();

  return jobId;
}
