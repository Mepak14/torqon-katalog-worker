import React from "react";
import { Document } from "@react-pdf/renderer";
import { BrandGroup, Product } from "@/lib/catalog-data";
import { BrandIndexPages } from "./BrandIndexPage";
import { ProductPages } from "./ProductPages";

const INTRO_PAGE_COUNT = 5;
const BRANDS_PER_INDEX_PAGE = 21;
const PRODUCTS_PER_PAGE = 4;

/**
 * Her markanın katalogdaki gerçek başlangıç sayfasını hesaplar.
 *
 * Katalog sırası:
 * 1-5   → hazır giriş PDF'leri
 * 6...  → marka dizini
 * sonra → marka ayraç + ürün sayfaları
 */
function calculateBrandStartPages(
  groupedBrands: BrandGroup[]
): Record<string, number> {
  const brandStartPages: Record<string, number> = {};

  const indexPageCount = Math.max(
    1,
    Math.ceil(
      groupedBrands.length /
        BRANDS_PER_INDEX_PAGE
    )
  );

  /*
   * İlk marka:
   *
   * 5 intro sayfası
   * + marka dizini sayfaları
   * + 1
   */
  let currentPage =
    INTRO_PAGE_COUNT +
    indexPageCount +
    1;

  for (const brand of groupedBrands) {
    brandStartPages[brand.brand] =
      currentPage;

    /*
     * Her markada:
     *
     * 1 marka ayraç sayfası
     * +
     * her kategori için ürün sayfaları
     */
    const productPageCount =
      brand.groups.reduce(
        (total, group) =>
          total +
          Math.ceil(
            group.products.length /
              PRODUCTS_PER_PAGE
          ),
        0
      );

    currentPage +=
      1 + productPageCount;
  }

  return brandStartPages;
}

/**
 * Marka dizini chunk'ı.
 *
 * Intro PDF'ler PDFGeneratorService tarafından
 * daha sonra bunun önüne eklenir.
 */
export const getCoverAndIndexChunk = (
  products: Product[],
  groupedBrands: BrandGroup[]
) => {
  const brandStartPages =
    calculateBrandStartPages(
      groupedBrands
    );

  return (
    <Document>
      {BrandIndexPages({
        products,
        groupedBrands,
        brandStartPages,
      })}
    </Document>
  );
};

/**
 * Marka + ürün sayfaları chunk'ı.
 */
export const getProductChunk = (
  groupedBrands: BrandGroup[],
  qrMap: Map<string, string>,
  imgMap: Map<string, string>
) => {
  return (
    <Document>
      {ProductPages({
        groupedBrands,
        qrMap,
        imgMap,
      })}
    </Document>
  );
};
