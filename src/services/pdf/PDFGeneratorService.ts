import { renderToStream } from "@react-pdf/renderer";

import {
  getCoverAndIndexChunk,
  getProductChunk,
  calculateBrandStartPages,
} from "./templates/ChunkTemplates";

import {
  groupProductsByBrand,
  extractCategoryFromTanim,
  DEFAULT_CATEGORY_ORDER,
} from "@/lib/catalog-data";

import type { Product } from "@/lib/types";

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

import { registerServerFonts } from "./FontService";
import { mergePdfChunks } from "./PDFMergeFallback";
import { generateQRMapForProducts } from "./QRService";
import { prefetchProductImages } from "./ImageService";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { updateJobStatus } from "./JobQueue";

// ─────────────────────────────────────────────────────────────
// Sabitler
// ─────────────────────────────────────────────────────────────

const KATALOG_DIR = path.join(
  process.cwd(),
  "public",
  "katalog"
);

const INTRO_COUNT = 5;
const DB_PAGE_SIZE = 1000;

type CatalogFilters = {
  brands?: string[];
  categories?: string[];
};

type CatalogSettings = {
  brandOrder: string[];
  categoryOrder: string[];
};

// ─────────────────────────────────────────────────────────────
// Yardımcı fonksiyonlar
// ─────────────────────────────────────────────────────────────

function normalizeKey(
  value?: string | null
): string {
  return (value || "")
    .trim()
    .toLocaleUpperCase("tr-TR");
}

function parseStringArray(
  value?: string | null,
  fallback: readonly string[] = []
): string[] {
  if (!value) {
    return [...fallback];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [...fallback];
    }

    return Array.from(
      new Set(
        parsed
          .filter(
            (item): item is string =>
              typeof item === "string"
          )
          .map(normalizeKey)
          .filter(Boolean)
      )
    );
  } catch {
    return [...fallback];
  }
}

function getTempFilePath(
  hash: string
): string {
  return path.join(
    os.tmpdir(),
    `catalog_${hash}.pdf`
  );
}

function streamToFile(
  stream: NodeJS.ReadableStream,
  filePath: string
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      const fileStream =
        fs.createWriteStream(
          filePath
        );

      stream.pipe(fileStream);

      fileStream.on(
        "finish",
        resolve
      );

      fileStream.on(
        "error",
        reject
      );
    }
  );
}

/**
 * Aynı ürün birden fazla markada bulunabileceği için
 * PDF görsel/QR hazırlama aşamasında aynı ID'yi
 * tekrar tekrar işlememek için tekilleştirir.
 */
function uniqueProductsById(
  products: Product[]
): Product[] {
  const map =
    new Map<string, Product>();

  for (const product of products) {
    if (!map.has(product.id)) {
      map.set(
        product.id,
        product
      );
    }
  }

  return [...map.values()];
}

// ─────────────────────────────────────────────────────────────
// Admin katalog ayarları
// ─────────────────────────────────────────────────────────────

async function fetchCatalogSettings():
  Promise<CatalogSettings> {
  const { data, error } =
    await supabaseAdmin
      .from("site_settings")
      .select("key, value");

  if (error) {
    throw new Error(
      `Katalog ayarları okunamadı: ${error.message}`
    );
  }

  const settings:
    Record<string, string> = {};

  for (const row of data || []) {
    if (
      typeof row.key === "string" &&
      typeof row.value === "string"
    ) {
      settings[row.key] =
        row.value;
    }
  }

  return {
    brandOrder:
      parseStringArray(
        settings.catalog_brand_order
      ),

    categoryOrder:
      parseStringArray(
        settings.catalog_category_order,
        DEFAULT_CATEGORY_ORDER
      ),
  };
}

// ─────────────────────────────────────────────────────────────
// Aktif kategoriler
// ─────────────────────────────────────────────────────────────

async function fetchActiveCategories():
  Promise<Set<string>> {
  const { data, error } =
    await supabaseAdmin
      .from("categories")
      .select("name")
      .eq(
        "is_active",
        true
      );

  if (error) {
    throw new Error(
      `Aktif kategoriler okunamadı: ${error.message}`
    );
  }

  return new Set(
    (data || [])
      .map((row) =>
        normalizeKey(row.name)
      )
      .filter(Boolean)
  );
}

// ─────────────────────────────────────────────────────────────
// Aktif ürünleri çek
// ─────────────────────────────────────────────────────────────

async function fetchAllProducts():
  Promise<Product[]> {
  const rows: Product[] = [];

  for (
    let from = 0;
    ;
    from += DB_PAGE_SIZE
  ) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("products")
      .select(
        [
          "id",
          "mepak_kodu",
          "tanim_tr",
          "tanim_en",
          "marka_adi",
          "markalar",
          "oem_no",
          "oem_nolari",
          "model",
          "model_yil",
          "resim_kodlari",
          "metadata",
          "category",
          "is_active",
        ].join(",")
      )
      .eq(
        "is_active",
        true
      )
      .range(
        from,
        from +
          DB_PAGE_SIZE -
          1
      )
      .order(
        "mepak_kodu",
        {
          ascending: true,
        }
      );

    if (error) {
      throw new Error(
        `Ürünler okunamadı: ${error.message}`
      );
    }

    const batch =
      (data || []) as Product[];

    rows.push(...batch);

    console.log(
      `[PDF] Ürün yükleme: ${rows.length}`
    );

    if (
      batch.length <
      DB_PAGE_SIZE
    ) {
      break;
    }
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────
// GitHub Releases
// ─────────────────────────────────────────────────────────────

async function uploadToGitHubReleases(
  filePath: string,
  hash: string,
  isFiltered: boolean
): Promise<string | null> {
  try {
    const baseName =
      isFiltered
        ? "torqon_ozel_katalog"
        : "torqon_katalog";

    const fileName =
      `${baseName}_${hash}.pdf`;

    const finalPath =
      path.join(
        path.dirname(filePath),
        fileName
      );

    fs.renameSync(
      filePath,
      finalPath
    );

    console.log(
      "[PDF] GitHub Releases'e yükleniyor..."
    );

    try {
      execSync(
        "gh release view catalogs",
        {
          stdio: "ignore",
        }
      );
    } catch {
      console.log(
        "[PDF] catalogs release bulunamadı, oluşturuluyor..."
      );

      execSync(
        'gh release create catalogs --title "Kataloglar" --notes "Sistem tarafından otomatik üretilen kataloglar"',
        {
          stdio: "inherit",
        }
      );
    }

    execSync(
      `gh release upload catalogs "${finalPath}" --clobber`,
      {
        stdio: "inherit",
      }
    );

    try {
      console.log(
        `[PDF] Eski ${baseName} dosyaları temizleniyor...`
      );

      const assetsJson =
        execSync(
          "gh release view catalogs --json assets",
          {
            encoding:
              "utf-8",
          }
        );

      const releaseData =
        JSON.parse(
          assetsJson
        );

      if (
        releaseData &&
        Array.isArray(
          releaseData.assets
        )
      ) {
        for (
          const asset of
          releaseData.assets
        ) {
          const assetName =
            asset.name;

          if (
            typeof assetName ===
              "string" &&
            assetName.startsWith(
              `${baseName}_`
            ) &&
            assetName.endsWith(
              ".pdf"
            ) &&
            assetName !==
              fileName
          ) {
            console.log(
              `[PDF] Eski asset siliniyor: ${assetName}`
            );

            execSync(
              `gh release delete-asset catalogs "${assetName}" -y`,
              {
                stdio:
                  "ignore",
              }
            );
          }
        }
      }
    } catch (cleanupError) {
      const message =
        cleanupError instanceof
        Error
          ? cleanupError.message
          : "Bilinmeyen hata";

      console.error(
        "[PDF] Eski PDF temizleme hatası:",
        message
      );
    }

    const repo =
      process.env.GITHUB_REPO;

    if (!repo) {
      throw new Error(
        "GITHUB_REPO environment değişkeni bulunamadı."
      );
    }

    return (
      `https://github.com/` +
      `${repo}/releases/download/catalogs/${fileName}`
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata";

    console.error(
      "[PDF] GitHub Releases upload hatası:",
      message
    );

    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// PDF oluştur
// ─────────────────────────────────────────────────────────────

export async function generateCatalogPDF(
  jobId: string,
  hash: string,
  filters?: CatalogFilters
): Promise<string> {
  const finalFilePath =
    getTempFilePath(hash);

  registerServerFonts();

  await updateJobStatus(
    jobId,
    {
      progress: 5,
    }
  );

  const [
    allProducts,
    catalogSettings,
    activeCategories,
  ] = await Promise.all([
    fetchAllProducts(),
    fetchCatalogSettings(),
    fetchActiveCategories(),
  ]);

  console.log(
    `[PDF] Aktif ürün: ${allProducts.length}`
  );

  console.log(
    `[PDF] Aktif kategori: ${activeCategories.size}`
  );

  // ─────────────────────────────────────────────────────────
  // Aktif kategori filtresi
  // ─────────────────────────────────────────────────────────

  const activeProducts =
    allProducts.filter(
      (product) => {
        const category =
          extractCategoryFromTanim(
            product.tanim_tr
          ) ||
          normalizeKey(
            product.category
          );

        if (!category) {
          return false;
        }

        return activeCategories.has(
          normalizeKey(
            category
          )
        );
      }
    );

  console.log(
    `[PDF] Aktif kategori filtresinden sonra ürün: ${activeProducts.length}`
  );

  // ─────────────────────────────────────────────────────────
  // Marka + kategori sırası
  // ─────────────────────────────────────────────────────────

  let groupedBrands =
    groupProductsByBrand(
      activeProducts,
      catalogSettings.brandOrder,
      catalogSettings.categoryOrder
    );

  // ─────────────────────────────────────────────────────────
  // Marka filtresi
  // ─────────────────────────────────────────────────────────

  if (
    filters?.brands &&
    filters.brands.length > 0
  ) {
    const selectedBrands =
      new Set(
        filters.brands
          .map(normalizeKey)
          .filter(Boolean)
      );

    groupedBrands =
      groupedBrands.filter(
        (brand) =>
          selectedBrands.has(
            normalizeKey(
              brand.brand
            )
          )
      );
  }

  // ─────────────────────────────────────────────────────────
  // Kategori filtresi
  // ─────────────────────────────────────────────────────────

  if (
    filters?.categories &&
    filters.categories.length > 0
  ) {
    const selectedCategories =
      new Set(
        filters.categories
          .map(normalizeKey)
          .filter(Boolean)
      );

    groupedBrands =
      groupedBrands
        .map((brand) => {
          const groups =
            brand.groups.filter(
              (group) =>
                selectedCategories.has(
                  normalizeKey(
                    group.groupName
                  )
                )
            );

          return {
            ...brand,

            groups,

            groupCount:
              groups.length,

            productCount:
              groups.reduce(
                (
                  total,
                  group
                ) =>
                  total +
                  group.products
                    .length,
                0
              ),
          };
        })
        .filter(
          (brand) =>
            brand.groups.length >
            0
        );
  }

  if (
    groupedBrands.length === 0
  ) {
    throw new Error(
      "PDF için uygun aktif ürün bulunamadı."
    );
  }

  // ─────────────────────────────────────────────────────────
  // GERÇEK PDF SAYFA NUMARALARINI HESAPLA
  // ─────────────────────────────────────────────────────────

  /*
   * Bu map bütün katalog yapısı üzerinden hesaplanır.
   *
   * Örnek:
   *
   * MERCEDES -> 10
   * MAN      -> 57
   * VOLVO    -> 96
   *
   * Marka dizini ve ürün chunk'ları aynı map'i kullanır.
   */
  const brandStartPages =
    calculateBrandStartPages(
      groupedBrands
    );

  console.log(
    "[PDF] Marka başlangıç sayfaları:",
    brandStartPages
  );

  // ─────────────────────────────────────────────────────────
  // Katalog ürünlerini çıkar
  // ─────────────────────────────────────────────────────────

  const catalogProducts =
    groupedBrands.flatMap(
      (brand) =>
        brand.groups.flatMap(
          (group) =>
            group.products
        )
    );

  const uniqueCatalogProducts =
    uniqueProductsById(
      catalogProducts
    );

  console.log(
    `[PDF] PDF marka sayısı: ${groupedBrands.length}`
  );

  console.log(
    `[PDF] PDF benzersiz ürün sayısı: ${uniqueCatalogProducts.length}`
  );

  // ─────────────────────────────────────────────────────────
  // QR + görseller
  // ─────────────────────────────────────────────────────────

  await updateJobStatus(
    jobId,
    {
      progress: 8,
    }
  );

  const [
    qrMap,
    imgMap,
  ] = await Promise.all([
    generateQRMapForProducts(
      uniqueCatalogProducts.map(
        (product) =>
          product.id
      )
    ),

    prefetchProductImages(
      uniqueCatalogProducts
    ),
  ]);

  const mergeFiles:
    string[] = [];

  const tempFiles:
    string[] = [];

  // ─────────────────────────────────────────────────────────
  // Hazır giriş sayfaları
  // ─────────────────────────────────────────────────────────

  await updateJobStatus(
    jobId,
    {
      progress: 12,
    }
  );

  for (
    let i = 1;
    i <= INTRO_COUNT;
    i++
  ) {
    const introPath =
      path.join(
        KATALOG_DIR,
        `${i}.pdf`
      );

    if (
      fs.existsSync(
        introPath
      )
    ) {
      mergeFiles.push(
        introPath
      );
    } else {
      console.warn(
        `[PDF] Intro PDF bulunamadı: ${i}.pdf`
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  // Marka dizini
  // ─────────────────────────────────────────────────────────

  await updateJobStatus(
    jobId,
    {
      progress: 15,
    }
  );

  const indexStream =
    await renderToStream(
      getCoverAndIndexChunk(
        uniqueCatalogProducts,
        groupedBrands
      ) as unknown as Parameters<
        typeof renderToStream
      >[0]
    );

  const indexPath =
    getTempFilePath(
      `${hash}_chunk_index`
    );

  await streamToFile(
    indexStream as unknown as
      NodeJS.ReadableStream,
    indexPath
  );

  mergeFiles.push(
    indexPath
  );

  tempFiles.push(
    indexPath
  );

  // ─────────────────────────────────────────────────────────
  // Marka ürün sayfaları
  // ─────────────────────────────────────────────────────────

  const RENDER_CONCURRENCY =
    4;

  const chunkPaths:
    string[] =
      new Array(
        groupedBrands.length
      ).fill("");

  for (
    let batchStart = 0;
    batchStart <
    groupedBrands.length;
    batchStart +=
      RENDER_CONCURRENCY
  ) {
    const batchEnd =
      Math.min(
        batchStart +
          RENDER_CONCURRENCY,
        groupedBrands.length
      );

    const batchSlice =
      groupedBrands.slice(
        batchStart,
        batchEnd
      );

    await Promise.all(
      batchSlice.map(
        async (
          brand,
          offsetInBatch
        ) => {
          const globalIdx =
            batchStart +
            offsetInBatch;

          const cPath =
            getTempFilePath(
              `${hash}_chunk_prod_${globalIdx}`
            );

          /*
           * Bu markanın gerçek katalog
           * başlangıç sayfasını al.
           */
          const startPageNumber =
            brandStartPages[
              brand.brand
            ];

          if (
            !startPageNumber
          ) {
            throw new Error(
              `${brand.brand} için başlangıç sayfası hesaplanamadı.`
            );
          }

          /*
           * ÖNEMLİ:
           *
           * Artık ProductPages 1'den başlamıyor.
           * Gerçek PDF sayfasından başlıyor.
           */
          const chunkStream =
            await renderToStream(
              getProductChunk(
                [brand],
                qrMap,
                imgMap,
                startPageNumber
              ) as unknown as Parameters<
                typeof renderToStream
              >[0]
            );

          await streamToFile(
            chunkStream as unknown as
              NodeJS.ReadableStream,
            cPath
          );

          chunkPaths[
            globalIdx
          ] = cPath;
        }
      )
    );

    const progressVal =
      Math.floor(
        15 +
          (
            batchEnd /
            groupedBrands.length
          ) *
            78
      );

    await updateJobStatus(
      jobId,
      {
        progress:
          Math.min(
            progressVal,
            93
          ),
      }
    );
  }

  // ─────────────────────────────────────────────────────────
  // Chunk'ları doğru marka sırasıyla ekle
  // ─────────────────────────────────────────────────────────

  for (
    const cPath of
    chunkPaths
  ) {
    if (!cPath) {
      continue;
    }

    mergeFiles.push(
      cPath
    );

    tempFiles.push(
      cPath
    );
  }

  // ─────────────────────────────────────────────────────────
  // PDF'leri birleştir
  // ─────────────────────────────────────────────────────────

  await updateJobStatus(
    jobId,
    {
      progress: 95,
    }
  );

  await mergePdfChunks(
    mergeFiles,
    finalFilePath
  );

  // ─────────────────────────────────────────────────────────
  // Geçici dosyaları temizle
  // ─────────────────────────────────────────────────────────

  for (
    const tempFile of
    tempFiles
  ) {
    try {
      if (
        fs.existsSync(
          tempFile
        )
      ) {
        fs.unlinkSync(
          tempFile
        );
      }
    } catch {
      // Temizlik hatası PDF üretimini durdurmaz.
    }
  }

  // ─────────────────────────────────────────────────────────
  // GitHub Releases
  // ─────────────────────────────────────────────────────────

  const isFiltered =
    !!(
      filters?.brands?.length ||
      filters?.categories?.length
    );

  const downloadUrl =
    await uploadToGitHubReleases(
      finalFilePath,
      hash,
      isFiltered
    );

  if (!downloadUrl) {
    throw new Error(
      "GitHub Releases'e PDF yükleme başarısız oldu."
    );
  }

  await updateJobStatus(
    jobId,
    {
      status: "done",
      progress: 100,
      file_url:
        downloadUrl,
    }
  );

  return downloadUrl;
}
