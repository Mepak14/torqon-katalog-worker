import type {
  BrandGroup,
} from "@/lib/catalog-data";

/**
 * PDF'de bir sayfada bulunan
 * maksimum ürün sayısı.
 *
 * ProductPages.tsx ile aynı
 * değerde kalmalıdır.
 */
export const PRODUCTS_PER_PAGE =
  4;

/**
 * React-PDF'de chunk'lar arası doğrudan
 * iç link oluşturamadığımız için geçici
 * özel URL kullanıyoruz.
 *
 * PDF birleştirilirken bu URL gerçek
 * PDF sayfa linkine dönüştürülecek.
 */
export const PAGE_LINK_PREFIX =
  "https://torqon.invalid/pdf-page/";

/**
 * Ürün kodlarını karşılaştırırken
 * boşluk/büyük-küçük harf farkını kaldırır.
 */
export function normalizeProductCode(
  code?: string | null
): string {
  return (
    code
      ?.trim()
      .toUpperCase() ||
    ""
  );
}

/**
 * Her MEPAK ürün kodunun katalogdaki
 * gerçek PDF sayfasını hesaplar.
 *
 * Örnek:
 *
 * MM05.60028 -> 245
 * MM05.10002 -> 86
 *
 * Böylece ürün çifti veya bileşen koduna
 * tıklandığında hedef ürünün bulunduğu
 * sayfaya gidebiliriz.
 */
export function buildProductPageMap(
  brands: BrandGroup[],
  brandStartPages: Record<
    string,
    number
  >
): Record<string, number> {
  const pages:
    Record<string, number> =
      Object.create(null);

  for (
    const brand of brands
  ) {
    /*
     * brandStartPages marka ayraç sayfasını
     * gösteriyor.
     *
     * İlk ürün sayfası bundan sonraki sayfadır.
     */
    let page =
      brandStartPages[
        brand.brand
      ] + 1;

    for (
      const group of
      brand.groups
    ) {
      group.products.forEach(
        (
          product,
          index
        ) => {
          const code =
            normalizeProductCode(
              product.mepak_kodu
            );

          /*
           * Aynı ürün birden fazla markada
           * bulunabiliyorsa ilk görünen
           * katalog sayfasını kullan.
           */
          if (
            code &&
            pages[
              code
            ] === undefined
          ) {
            pages[
              code
            ] =
              page +
              Math.floor(
                index /
                  PRODUCTS_PER_PAGE
              );
          }
        }
      );

      page +=
        Math.ceil(
          group.products
            .length /
            PRODUCTS_PER_PAGE
        );
    }
  }

  return pages;
}
