import React from "react";
import { Document } from "@react-pdf/renderer";

import {
  BrandGroup,
  Product,
} from "@/lib/catalog-data";

import { BrandIndexPages } from "./BrandIndexPage";
import { ProductPages } from "./ProductPages";

const INTRO_PAGE_COUNT = 5;
const BRANDS_PER_INDEX_PAGE = 21;
const PRODUCTS_PER_PAGE = 4;

/**
 * Marka dizininin kaç sayfa süreceğini hesaplar.
 *
 * 21 marka = 1 sayfa
 * 22 marka = 2 sayfa
 * vb.
 */
export function calculateBrandIndexPageCount(
  groupedBrands: BrandGroup[]
): number {
  return Math.max(
    1,
    Math.ceil(
      groupedBrands.length /
        BRANDS_PER_INDEX_PAGE
    )
  );
}

/**
 * Her markanın katalogdaki gerçek başlangıç
 * sayfasını hesaplar.
 *
 * Örnek:
 *
 * 1-5  → giriş sayfaları
 * 6-9  → marka dizini
 * 10   → ilk marka ayraç sayfası
 * 11   → ilk ürün sayfası
 */
export function calculateBrandStartPages(
  groupedBrands: BrandGroup[]
): Record<string, number> {
  const brandStartPages:
    Record<string, number> = {};

  const indexPageCount =
    calculateBrandIndexPageCount(
      groupedBrands
    );

  /*
   * İlk marka ayraç sayfası:
   *
   * intro +
   * marka dizini +
   * 1
   */
  let currentPage =
    INTRO_PAGE_COUNT +
    indexPageCount +
    1;

  for (const brand of groupedBrands) {
    /*
     * Bu sayı markanın AYRAÇ sayfasıdır.
     */
    brandStartPages[
      brand.brand
    ] = currentPage;

    /*
     * Markanın ürün sayfalarını hesapla.
     *
     * Her sayfada maksimum 4 ürün bulunur.
     */
    const productPageCount =
      brand.groups.reduce(
        (total, group) => {
          return (
            total +
            Math.ceil(
              group.products.length /
                PRODUCTS_PER_PAGE
            )
          );
        },
        0
      );

    /*
     * +1 = marka ayraç sayfası
     */
    currentPage +=
      1 + productPageCount;
  }

  return brandStartPages;
}

/**
 * Marka dizini PDF chunk'ı.
 *
 * Hazır 1.pdf - 5.pdf dosyaları
 * PDFGeneratorService tarafından bunun
 * önüne eklenir.
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
 * Marka + ürün sayfaları PDF chunk'ı.
 *
 * startPageNumber:
 * Bu markanın gerçek katalog başlangıç
 * sayfasıdır.
 *
 * Örneğin marka ayraç sayfası 37 ise:
 *
 * startPageNumber = 37
 *
 * ProductPages:
 * ayraç -> 37
 * ilk ürün sayfası -> 38
 * ikinci ürün sayfası -> 39
 *
 * şeklinde devam eder.
 */
export const getProductChunk = (
  groupedBrands: BrandGroup[],
  qrMap: Map<string, string>,
  imgMap: Map<string, string>,
  startPageNumber = 1
) => {
  return (
    <Document>
      {ProductPages({
        groupedBrands,
        qrMap,
        imgMap,
        startPageNumber,
      })}
    </Document>
  );
};
