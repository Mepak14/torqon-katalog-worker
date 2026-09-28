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
 * PDF annotation içindeki string değerini okur.
 */
function decodePdfString(
  value: unknown
): string | null {
  if (
    value instanceof PDFString ||
    value instanceof PDFHexString
  ) {
    return value.decodeText();
  }

  return null;
}

/**
 * React PDF tarafından oluşturulan:
 *
 * #page=12
 *
 * biçimindeki bağlantıları bulur.
 */
function getPageNumberFromAnnotation(
  pdf: PDFDocument,
  annotation: PDFDict
): number | null {
  const context =
    pdf.context;

  /*
   * React PDF Link çoğunlukla:
   *
   * /A <<
   *   /S /URI
   *   /URI (#page=12)
   * >>
   *
   * şeklinde gelir.
   */
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

      const uriObject =
        action.get(
          PDFName.of("URI")
        );

      const uri =
        decodePdfString(
          uriObject
        );

      if (uri) {
        const match =
          uri.match(
            /^#page=(\d+)$/
          );

        if (match) {
          return Number(
            match[1]
          );
        }
      }
    } catch {
      /*
       * Action okunamıyorsa Dest kontrolüne
       * devam et.
       */
    }
  }

  /*
   * Alternatif olarak /Dest string biçiminde
   * gelmiş olabilir.
   */
  const destObject =
    annotation.get(
      PDFName.of("Dest")
    );

  const destText =
    decodePdfString(
      destObject
    );

  if (destText) {
    const match =
      destText.match(
        /^#?page=(\d+)$/
      );

    if (match) {
      return Number(
        match[1]
      );
    }
  }

  return null;
}

/**
 * Marka listesindeki #page=X bağlantılarını,
 * birleştirilmiş PDF içindeki gerçek sayfalara bağlar.
 *
 * Örnek:
 *
 * #page=48
 *
 * artık tarayıcı URI'si değildir.
 * PDF'in 48. sayfasına gerçek GoTo bağlantısı olur.
 */
function fixInternalPageLinks(
  pdf: PDFDocument
): number {
  const pages =
    pdf.getPages();

  const context =
    pdf.context;

  let fixedCount = 0;

  for (const page of pages) {
    const annotsObject =
      page.node.get(
        PDFName.of("Annots")
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
      i < annotations.size();
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

      /*
       * Sadece Link annotation'larını değiştir.
       */
      const subtype =
        annotation.get(
          PDFName.of(
            "Subtype"
          )
        );

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
        pageNumber === null ||
        !Number.isInteger(
          pageNumber
        )
      ) {
        continue;
      }

      /*
       * Kullanıcıdaki PDF sayfa numarası 1'den,
       * JavaScript array ise 0'dan başlar.
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
       * Gerçek PDF destination:
       *
       * [ pageRef /Fit ]
       *
       * Böylece PDF okuyucu doğrudan ilgili
       * sayfaya gider.
       */
      const destination =
        context.obj([
          targetPage.ref,
          PDFName.of("Fit"),
        ]);

      /*
       * Eski URI action'ını kaldır.
       */
      annotation.delete(
        PDFName.of("A")
      );

      /*
       * Gerçek iç PDF hedefini ekle.
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
 * Küçük PDF chunk'larını tek bir master PDF
 * altında birleştirir.
 *
 * Birleştirme tamamlandıktan sonra marka dizini
 * bağlantıları gerçek PDF sayfa bağlantılarına
 * dönüştürülür.
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
   * PDF parçaları artık tek dosya altında.
   * Şimdi marka dizinindeki #page=X linklerini
   * gerçek sayfa referanslarına dönüştür.
   */
  const fixedLinkCount =
    fixInternalPageLinks(
      mergedPdf
    );

  console.log(
    `[PDF] ${fixedLinkCount} marka dizini bağlantısı düzeltildi.`
  );

  const mergedPdfFile =
    await mergedPdf.save();

  fs.writeFileSync(
    outputPath,
    mergedPdfFile
  );

  return outputPath;
}
