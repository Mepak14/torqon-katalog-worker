import React from "react";
import { Document } from "@react-pdf/renderer";

import {
  BrandGroup,
  Product,
} from "@/lib/catalog-data";

import { CoverPage } from "./CoverPage";
import { BrandIndexPages } from "./BrandIndexPage";
import { ProductPages } from "./ProductPages";

const COVER_PAGE_COUNT = 1;
const BRANDS_PER_INDEX_PAGE = 21;
const PRODUCTS_PER_PAGE = 4;

type CatalogDocumentProps = {
  products: Product[];
  groupedBrands: BrandGroup[];
  qrMap?: Map<string, string>;
  imgMap?: Map<string, string>;
};

/**
 * Eski tek-parça CatalogDocument kullanımı için
 * marka başlangıç sayfalarını hesaplar.
 *
 * Bu dosyada yapı:
 *
 * 1 sayfa kapak
 * + marka dizini
 * + marka ayraçları
 * + ürün sayfaları
 *
 * şeklindedir.
 */
function calculateBrandStartPages(
  groupedBrands: BrandGroup[]
): Record<string, number> {
  const brandStartPages:
    Record<string, number> = {};

  const indexPageCount =
    Math.max(
      1,
      Math.ceil(
        groupedBrands.length /
          BRANDS_PER_INDEX_PAGE
      )
    );

  /*
   * Kapak:
   * 1
   *
   * Marka dizini:
   * 2...
   *
   * İlk marka ayraç sayfası:
   * kapak + dizin + 1
   */
  let currentPage =
    COVER_PAGE_COUNT +
    indexPageCount +
    1;

  for (const brand of groupedBrands) {
    brandStartPages[
      brand.brand
    ] = currentPage;

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

    /*
     * +1 = marka ayraç sayfası
     */
    currentPage +=
      1 +
      productPageCount;
  }

  return brandStartPages;
}

export const CatalogDocument = ({
  products,
  groupedBrands,
  qrMap = new Map(),
  imgMap = new Map(),
}: CatalogDocumentProps) => {
  const brandStartPages =
    calculateBrandStartPages(
      groupedBrands
    );

  /*
   * ProductPages ayraç sayfasından başlar.
   */
  const firstBrandPage =
    groupedBrands.length > 0
      ? brandStartPages[
          groupedBrands[0].brand
        ]
      : 1;

  return (
    <Document>
      <CoverPage
        products={products}
        groupedBrands={
          groupedBrands
        }
      />

      {BrandIndexPages({
        products,
        groupedBrands,
        brandStartPages,
      })}

      {ProductPages({
        groupedBrands,
        qrMap,
        imgMap,
        startPageNumber:
          firstBrandPage,
      })}
    </Document>
  );
};
