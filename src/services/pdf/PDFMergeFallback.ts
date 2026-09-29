import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
} from "pdf-lib";

import {
  PAGE_LINK_PREFIX,
} from "./ProductLinks";

import fs from "fs";

/**
 * PDF içindeki string / name değerlerini
 * normal metne dönüştürür.
 */
function decodePdfText(
  value: unknown
): string | null {
  if (
    value instanceof PDFString ||
    value instanceof PDFHexString
  ) {
    return value.decodeText();
  }

  if (
    value instanceof PDFName
  ) {
    return value
      .toString()
      .replace(
        /^\//,
        ""
      );
  }

  return null;
}

/**
 * PDF link hedefinden gerçek sayfa
 * numarasını çıkarır.
 *
 * Desteklenen formatlar:
 *
 * Marka dizini:
 * page=48
 * #page=48
 *
 * Ürün çifti / bileşen:
 * https://torqon.invalid/pdf-page/245
 */
function parsePageNumber(
  value: string | null
): number | null {
  if (!value) {
    return null;
  }

  // ─────────────────────────────────────────────
  // Ürün çifti / bileşen linki
  // ─────────────────────────────────────────────

  if (
    value.startsWith(
      PAGE_LINK_PREFIX
    )
  ) {
    const pageNumber =
      Number(
        value.slice(
          PAGE_LINK_PREFIX.length
        )
      );

    if (
      Number.isInteger(
        pageNumber
      ) &&
      pageNumber > 0
    ) {
      return pageNumber;
    }

    return null;
  }

  // ─────────────────────────────────────────────
  // Marka dizini linki
  // ─────────────────────────────────────────────

  const match =
    value.match(
      /^#?page=(\d+)$/
    );

  if (!match) {
    return null;
  }

  const pageNumber =
    Number(
      match[1]
    );

  if (
    !Number.isInteger(
      pageNumber
    ) ||
    pageNumber <= 0
  ) {
    return null;
  }

  return pageNumber;
}

/**
 * React-PDF tarafından oluşturulan
 * bağlantının hedef sayfasını bulur.
 *
 * Hem marka dizini hem ürün ilişki
 * bağlantıları burada çözülür.
 */
function getPageNumberFromAnnotation(
  pdf: PDFDocument,
  annotation: PDFDict
): number | null {
  const context =
    pdf.context;

  // ─────────────────────────────────────────────
  // 1. Action kontrolü
  // ─────────────────────────────────────────────

  const actionObject =
    annotation.get(
      PDFName.of("A")
    );

  if (actionObject) {
    try {
      const action =
        context.lookup(
          actionObject,
          PDFDict
        );

      // ─────────────────────────────────────────
      // React-PDF GoTo bağlantısı
      //
      // Örnek:
      //
      // /A <<
      //   /S /GoTo
      //   /D (page=48)
      // >>
      // ─────────────────────────────────────────

      const destinationObject =
        action.get(
          PDFName.of("D")
        );

      const destinationText =
        decodePdfText(
          destinationObject
        );

      const destinationPage =
        parsePageNumber(
          destinationText
        );

      if (
        destinationPage !==
        null
      ) {
        return destinationPage;
      }

      // ─────────────────────────────────────────
      // URI bağlantısı
      //
      // Ürün çifti / bileşen için:
      //
      // https://torqon.invalid/pdf-page/245
      // ─────────────────────────────────────────

      const uriObject =
        action.get(
          PDFName.of("URI")
        );

      const uriText =
        decodePdfText(
          uriObject
        );

      const uriPage =
        parsePageNumber(
          uriText
        );

      if (
        uriPage !==
        null
      ) {
        return uriPage;
      }
    } catch {
      /*
       * Action okunamazsa doğrudan
       * Dest kontrolüne devam et.
       */
    }
  }

  // ─────────────────────────────────────────────
  // 2. Annotation üzerinde direkt /Dest
  // ─────────────────────────────────────────────

  const destObject =
    annotation.get(
      PDFName.of("Dest")
    );

  const destText =
    decodePdfText(
      destObject
    );

  const destPage =
    parsePageNumber(
      destText
    );

  if (
    destPage !==
    null
  ) {
    return destPage;
  }

  return null;
}

/**
 * React-PDF tarafından oluşturulan
 * geçici bağlantıları birleştirilmiş PDF
 * içindeki gerçek sayfa referanslarına
 * dönüştürür.
 *
 * Bu işlem:
 *
 * - marka dizini bağlantılarını
 * - ürün çifti bağlantılarını
 * - bileşen bağlantılarını
 *
 * aynı sistem üzerinden çözer.
 */
function fixInternalPageLinks(
  pdf: PDFDocument
): number {
  const pages =
    pdf.getPages();

  const context =
    pdf.context;

  let fixedCount = 0;

  for (
    const page of pages
  ) {
    const annotsObject =
      page.node.get(
        PDFName.of(
          "Annots"
        )
      );

    if (!annotsObject) {
      continue;
    }

    let annotations:
      PDFArray;

    try {
      annotations =
        context.lookup(
          annotsObject,
          PDFArray
        );
    } catch {
      continue;
    }

    for (
      let i = 0;
      i <
      annotations.size();
      i++
    ) {
      const annotationObject =
        annotations.get(i);

      let annotation:
        PDFDict;

      try {
        annotation =
          context.lookup(
            annotationObject,
            PDFDict
          );
      } catch {
        continue;
      }

      const subtype =
        annotation.get(
          PDFName.of(
            "Subtype"
          )
        );

      /*
       * Yalnızca PDF Link annotation'larını
       * işle.
       */
      if (
        subtype?.toString() !==
        "/Link"
      ) {
        continue;
      }

      const pageNumber =
        getPageNumberFromAnnotation(
          pdf,
          annotation
        );

      if (
        pageNumber === null
      ) {
        continue;
      }

      /*
       * PDF sayfa numarası 1'den başlar.
       * JavaScript dizisi 0'dan başlar.
       */
      const targetIndex =
        pageNumber - 1;

      if (
        targetIndex < 0 ||
        targetIndex >=
          pages.length
      ) {
        console.warn(
          `[PDF] Geçersiz iç bağlantı: sayfa ${pageNumber}`
        );

        continue;
      }

      const targetPage =
        pages[
          targetIndex
        ];

      /*
       * Gerçek PDF hedefi:
       *
       * [
       *   pageRef
       *   /Fit
       * ]
       */
      const destination =
        context.obj([
          targetPage.ref,
          PDFName.of(
            "Fit"
          ),
        ]);

      /*
       * React-PDF'nin eski action'ını
       * kaldır.
       */
      annotation.delete(
        PDFName.of("A")
      );

      /*
       * Yerine gerçek PDF sayfasını
       * hedefleyen Dest ekle.
       */
      annotation.set(
        PDFName.of(
          "Dest"
        ),
        destination
      );

      fixedCount++;
    }
  }

  return fixedCount;
}

/**
 * PDF chunk'larını tek PDF haline getirir.
 */
export async function mergePdfChunks(
  chunkFilePaths: string[],
  outputPath: string
): Promise<string> {
  const mergedPdf =
    await PDFDocument.create();

  for (
    const chunkPath of
    chunkFilePaths
  ) {
    if (
      !fs.existsSync(
        chunkPath
      )
    ) {
      console.warn(
        `[PDF] Chunk bulunamadı, atlanıyor: ${chunkPath}`
      );

      continue;
    }

    const chunkBytes =
      fs.readFileSync(
        chunkPath
      );

    const chunkDocument =
      await PDFDocument.load(
        chunkBytes
      );

    const copiedPages =
      await mergedPdf.copyPages(
        chunkDocument,
        chunkDocument.getPageIndices()
      );

    for (
      const page of
      copiedPages
    ) {
      mergedPdf.addPage(
        page
      );
    }
  }

  /*
   * Tüm chunk'lar birleştikten sonra:
   *
   * - marka dizini
   * - ürün çifti
   * - bileşen
   *
   * bağlantılarını gerçek PDF sayfalarına bağla.
   */
  const fixedLinkCount =
    fixInternalPageLinks(
      mergedPdf
    );

  console.log(
    `[PDF] ${fixedLinkCount} iç PDF bağlantısı düzeltildi.`
  );

  if (
    fixedLinkCount === 0
  ) {
    console.warn(
      "[PDF] UYARI: Düzeltilebilir PDF iç bağlantısı bulunamadı."
    );
  }

  const mergedPdfFile =
    await mergedPdf.save();

  fs.writeFileSync(
    outputPath,
    mergedPdfFile
  );

  return outputPath;
}
