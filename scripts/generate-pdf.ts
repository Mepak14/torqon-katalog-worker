/**
 * GitHub Actions PDF Generator Script
 *
 * Ortam değişkenleri:
 *
 * JOB_ID
 * CONTENT_HASH
 * FILTERS
 * GITHUB_RUN_ID
 * GITHUB_REPO
 * GH_TOKEN
 */

import {
  generateCatalogPDF,
} from "../src/services/pdf/PDFGeneratorService";

import {
  registerServerFonts,
} from "../src/services/pdf/FontService";

import {
  supabaseAdmin,
} from "../src/lib/supabase-admin";

const jobId =
  process.env.JOB_ID;

const hash =
  process.env.CONTENT_HASH;

const filtersRaw =
  process.env.FILTERS ||
  "{}";

const githubRunId =
  process.env
    .GITHUB_RUN_ID;

const githubRepo =
  process.env
    .GITHUB_REPO;

const githubToken =
  process.env
    .GH_TOKEN;

if (
  !jobId ||
  !hash
) {
  console.error(
    "❌ Eksik env: JOB_ID ve CONTENT_HASH zorunlu."
  );

  process.exit(
    1
  );
}

let filters: {
  brands?: string[];
  categories?: string[];
} = {};

try {
  filters =
    JSON.parse(
      filtersRaw
    );
} catch {
  console.warn(
    "FILTERS JSON parse hatası, boş filtre kullanılıyor."
  );
}

/**
 * Mevcut GitHub Actions run'ını iptal eder.
 *
 * Kullanıcı job daha yeni başlarken
 * iptal etmişse burada çalışan run
 * durdurulur.
 */
async function cancelCurrentGithubRun():
  Promise<boolean> {
  if (
    !githubRunId ||
    !githubRepo ||
    !githubToken
  ) {
    console.warn(
      "⚠️ GitHub run iptali için gerekli bilgiler eksik."
    );

    return false;
  }

  try {
    const response =
      await fetch(
        `https://api.github.com/repos/${githubRepo}/actions/runs/${githubRunId}/cancel`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${githubToken}`,

            Accept:
              "application/vnd.github+json",

            "X-GitHub-Api-Version":
              "2022-11-28",

            "User-Agent":
              "Torqon-Catalog-Worker",
          },
        }
      );

    /*
     * 202 = iptal kabul edildi.
     *
     * 409 = run zaten iptal ediliyor
     * veya tamamlanmış olabilir.
     */
    if (
      response.ok ||
      response.status ===
        409
    ) {
      console.log(
        "🛑 GitHub Actions iptal isteği gönderildi."
      );

      return true;
    }

    const body =
      await response.text();

    console.error(
      `❌ GitHub Actions iptal edilemedi: ${response.status} ${body}`
    );

    return false;
  } catch (
    error
  ) {
    console.error(
      "❌ GitHub Actions iptal isteği hatası:",
      error
    );

    return false;
  }
}

/**
 * GitHub run ID'yi job kaydına yazar.
 *
 * Aynı anda cancel_requested değerini
 * kontrol eder.
 *
 * Böylece kullanıcı GitHub run tam
 * başlamadan önce iptal etmişse worker
 * başlar başlamaz kendini durdurabilir.
 */
async function registerGithubRun():
  Promise<boolean> {
  if (
    !githubRunId
  ) {
    console.warn(
      "⚠️ GITHUB_RUN_ID bulunamadı."
    );

    return false;
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "pdf_jobs"
      )
      .update({
        github_run_id:
          githubRunId,
      })
      .eq(
        "id",
        jobId!
      )
      .select(
        "cancel_requested"
      )
      .single();

  if (
    error
  ) {
    throw new Error(
      `GitHub run ID job kaydına yazılamadı: ${error.message}`
    );
  }

  console.log(
    `🔗 GitHub Run ID kaydedildi: ${githubRunId}`
  );

  return (
    data
      ?.cancel_requested ===
    true
  );
}

async function main() {
  console.log(
    `🚀 PDF üretimi başlıyor — Job: ${jobId}`
  );

  console.log(
    `   Hash: ${hash}`
  );

  console.log(
    `   Filters: ${JSON.stringify(
      filters
    )}`
  );

  console.log(
    `   GitHub Run ID: ${
      githubRunId ||
      "yok"
    }`
  );

  /*
   * GitHub Actions run ID'yi
   * Supabase job kaydına bağla.
   */
  const cancelRequested =
    await registerGithubRun();

  /*
   * Kullanıcı run başlamadan hemen önce
   * iptal etmiş olabilir.
   */
  if (
    cancelRequested
  ) {
    console.log(
      "🛑 Bu job için daha önce iptal talebi verilmiş."
    );

    const cancelled =
      await cancelCurrentGithubRun();

    if (
      cancelled
    ) {
      /*
       * GitHub runner'ın cancellation
       * sinyalini almasını bekle.
       */
      await new Promise<void>(
        (
          resolve
        ) => {
          setTimeout(
            resolve,
            60000
          );
        }
      );

      return;
    }

    throw new Error(
      "Katalog iptal talebi alındı ancak GitHub Actions durdurulamadı."
    );
  }

  registerServerFonts();

  const url =
    await generateCatalogPDF(
      jobId!,
      hash!,
      filters
    );

  console.log(
    `✅ Tamamlandı. İndirme URL: ${url}`
  );
}

main().catch(
  (
    err
  ) => {
    console.error(
      "❌ PDF üretimi başarısız:",
      err
    );

    process.exit(
      1
    );
  }
);