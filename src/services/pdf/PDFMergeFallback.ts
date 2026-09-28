import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
} from "pdf-lib";

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
 * page=48 veya #page=48 gibi değerlerden
 * sayfa numarasını çıkarır.
 */
function parsePageNumber(
  value: string | null
): number | null {
  if (!value) {
    return null;
  }

  const match =
    value.match(
      /^#?page=(\d+)$/
    );

  if (!match) {
    return null;
  }

  const pageNumber =
    Number(match[1]);

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
 * marka dizini linkinin hedef sayfasını bulur.
 *
 * React-PDF:
 *
 * <Link src="#page=48">
 *
 * kullanımını PDF içinde çoğunlukla:
 *
 * /A <<
 *   /S /GoTo
 *   /D (page=48)
 * >>
 *
 * biçiminde oluşturur.
 *
 * Eski kodumuz yalnızca /URI alanına baktığı
 * için bu linkleri göremiyordu.
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
      // React-PDF iç link:
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
      // Normal URI ihtimalini de destekle.
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
        uriPage !== null
      ) {
        return uriPage;
      }
    } catch {
      /*
       * Action okunamazsa doğrudan Dest
       * kontrolüne devam et.
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
    destPage !== null
  ) {
    return destPage;
  }

  return null;
}

/**
 * Marka listesindeki React-PDF GoTo linklerini,
 * birleştirilmiş PDF içindeki gerçek sayfa
 * referanslarına dönüştürür.
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
       * PDF sayfa numarası 1'den başlıyor.
       * JavaScript dizisi ise 0'dan.
       */
      const targetIndex =
        pageNumber - 1;

      if (
        targetIndex < 0 ||
        targetIndex >=
          pages.length
      ) {
        console.warn(
          `[PDF] Geçersiz marka linki: sayfa ${pageNumber}`
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
       * Eski React-PDF GoTo action'ını kaldır.
       *
       * Çünkü eski action named destination
       * arıyor:
       *
       * page=48
       *
       * fakat chunk birleştirmesi sonrasında
       * bu named destination mevcut değil.
       */
      annotation.delete(
        PDFName.of("A")
      );

      /*
       * Yerine doğrudan gerçek PDF sayfasını
       * hedefleyen Dest ekle.
       */
      annotation.set(
        PDFName.of("Dest"),
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
   * Bütün chunk'lar birleştikten sonra
   * marka dizini linklerini gerçek sayfalara
   * bağla.
   */
  const fixedLinkCount =
    fixInternalPageLinks(
      mergedPdf
    );

  console.log(
    `[PDF] ${fixedLinkCount} marka dizini bağlantısı düzeltildi.`
  );

  /*
   * Ek kontrol:
   *
   * Marka varsa fakat hiçbir bağlantı
   * bulunamadıysa logda açıkça görelim.
   */
  if (
    fixedLinkCount === 0
  ) {
    console.warn(
      "[PDF] UYARI: Marka dizininde düzeltilebilir bağlantı bulunamadı."
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
