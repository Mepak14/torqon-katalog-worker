import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types";

export type { Product };

export type BrandGroup = {
  brand: string;
  productCount: number;
  groupCount: number;
  groups: {
    groupName: string;
    groupNameEn: string;
    products: Product[];
  }[];
};

/**
 * Admin panelinde özel kategori sırası tanımlanmamışsa
 * kullanılacak varsayılan katalog sırası.
 */
export const DEFAULT_CATEGORY_ORDER = [
  "ROTBAŞI",
  "ROT KOLU",
  "STABİLİZER",
  "TORK KOLU",
  "V KOLU",
  "TAMİR TAKIMI",
  "ROTİL",
  "BURÇ",
  "ROTMİLİ",
] as const;

/**
 * Kaynak veride farklı yazılan kategori adlarını
 * tek bir standart isim altında toplar.
 */
const CATEGORY_SYNONYMS: Record<string, string> = {
  "ROT BAŞI": "ROTBAŞI",
  "ROTKOLU": "ROT KOLU",

  "MAKAS YATAK TAMİR TAKIMI":
    "MAKAS YATAĞI TAMİR TAKIMI",

  "S KAM TAMİR TAKIMI":
    "S KAM MİLİ TAMİR TAKIMI",

  "ÇALIŞMA SİLİNDİRİ HİDROLİK DİREKSİYON":
    "ÇALIŞMA SİLİNDİRİ HİDROLİK DİREKSİYON",

  "SİLİNDİR KABİN KALDIRMA":
    "KABİN KALDIRMA SİLİNDİRİ",
};

/**
 * Gerçek kategori olmayan kayıtlar.
 */
const CATEGORY_BLOCKLIST = new Set([
  "SİSTEMDEN SİLİNDİ",
]);

type BrandOemMapping = {
  marka: string;
  oemler: string[];
};

/**
 * Başlıkları temizler.
 */
export function normalizeTitle(
  value?: string | null
): string {
  return (value || "").trim();
}

/**
 * String veya array alanlarını standart string[]
 * formatına çevirir.
 */
function splitValues(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Marka/kategori isimlerini karşılaştırırken
 * aynı formata getirir.
 */
function normalizeKey(
  value?: string | null
): string {
  return (value || "")
    .trim()
    .toLocaleUpperCase("tr-TR");
}

/**
 * tanim_tr alanından gerçek ürün kategorisini çıkarır.
 *
 * Örnek:
 *
 * "ROTBAŞI - M30x1.5 RHT"
 * ->
 * "ROTBAŞI"
 */
export function extractCategoryFromTanim(
  tanim?: string | null
): string | null {
  if (!tanim) {
    return null;
  }

  const tanimUpper =
    tanim
      .toLocaleUpperCase("tr-TR")
      .trim();

  if (
    CATEGORY_BLOCKLIST.has(
      tanimUpper
    )
  ) {
    return null;
  }

  /*
   * Önce " - " öncesini al.
   */
  const base =
    tanimUpper
      .split(" - ")[0]
      .trim();

  /*
   * Sonra veri içindeki ekstra ölçü,
   * parantez vb. kısımları temizle.
   */
  let normalized = base
    .replace(
      /\s*[-–]?\s*L\s*:\s*[\d.,]+\s*MM.*/i,
      ""
    )
    .replace(
      /\s*\(.*$/g,
      ""
    )
    .replace(
      /\s*[-–]+\s*$/,
      ""
    )
    .replace(
      /,/g,
      ""
    )
    .replace(
      /\s{2,}/g,
      " "
    )
    .trim();

  if (
    CATEGORY_SYNONYMS[
      normalized
    ]
  ) {
    normalized =
      CATEGORY_SYNONYMS[
        normalized
      ];
  }

  if (
    normalized.length < 2
  ) {
    return null;
  }

  return normalized;
}

/**
 * Admin sıralaması ile mevcut değerleri birleştirir.
 *
 * Admin panelinde sıralanmış olanlar önce gelir.
 * Yeni/ekstra değerler sona alfabetik eklenir.
 */
export function mergeOrderedValues(
  configured: string[],
  available: string[]
): string[] {
  const normalizedAvailable =
    Array.from(
      new Set(
        available
          .map(normalizeKey)
          .filter(Boolean)
      )
    );

  const availableSet =
    new Set(
      normalizedAvailable
    );

  const normalizedConfigured =
    Array.from(
      new Set(
        configured
          .map(normalizeKey)
          .filter(Boolean)
      )
    );

  const ordered =
    normalizedConfigured.filter(
      (item) =>
        availableSet.has(item)
    );

  const configuredSet =
    new Set(ordered);

  const remaining =
    normalizedAvailable
      .filter(
        (item) =>
          !configuredSet.has(item)
      )
      .sort((a, b) =>
        a.localeCompare(
          b,
          "tr"
        )
      );

  return [
    ...ordered,
    ...remaining,
  ];
}

/**
 * Ürünün marka ↔ OEM ilişkilerini çözer.
 *
 * Öncelik:
 *
 * 1. metadata.marka_oem_eslesmeleri_json
 * 2. markalar + oem_nolari
 * 3. eski marka_adi + oem_no
 */
function getBrandMappings(
  product: Product
): BrandOemMapping[] {
  const stored =
    product.metadata?.[
      "marka_oem_eslesmeleri_json"
    ];

  /*
   * Yeni marka/OEM eşleştirme yapısı.
   */
  if (
    typeof stored === "string" &&
    stored.trim()
  ) {
    try {
      const parsed =
        JSON.parse(stored);

      if (
        Array.isArray(parsed)
      ) {
        const mappings =
          parsed
            .map((item) => {
              const marka =
                normalizeKey(
                  item?.marka
                );

              const oemler =
                splitValues(
                  item?.oemler
                );

              return {
                marka,
                oemler,
              };
            })
            .filter(
              (item) =>
                !!item.marka
            );

        if (
          mappings.length > 0
        ) {
          return mappings;
        }
      }
    } catch {
      /*
       * JSON bozuksa eski alanlara
       * fallback yapılır.
       */
    }
  }

  /*
   * Yeni çoklu marka alanı.
   */
  const brands =
    product.markalar?.length
      ? product.markalar
      : splitValues(
          product.marka_adi
        );

  /*
   * Yeni çoklu OEM alanı.
   */
  const oems =
    product.oem_nolari?.length
      ? product.oem_nolari
      : splitValues(
          product.oem_no
        );

  return brands
    .map((brand) => ({
      marka:
        normalizeKey(brand),

      oemler: oems,
    }))
    .filter(
      (item) =>
        !!item.marka
    );
}

/**
 * Çoklu markalı ürünleri PDF için marka bazında açar.
 *
 * Örneğin bir ürün:
 *
 * MERCEDES
 * MAN
 * VOLVO
 *
 * markalarına bağlıysa katalogda üç marka altında
 * gösterilebilir.
 */
export function expandProductsByBrand(
  products: Product[]
): Product[] {
  return products.flatMap(
    (product) => {
      const mappings =
        getBrandMappings(
          product
        );

      if (
        mappings.length === 0
      ) {
        return [
          {
            ...product,
            marka_adi:
              "DİĞER MARKALAR",
          },
        ];
      }

      return mappings.map(
        (mapping) => ({
          ...product,

          marka_adi:
            mapping.marka,

          /*
           * Her marka için sadece o markaya
           * ait OEM numaralarını göster.
           */
          oem_no:
            mapping.oemler.join(
              " | "
            ),

          oem_nolari:
            mapping.oemler,
        })
      );
    }
  );
}

/**
 * Tüm aktif ürünleri getirir.
 *
 * ÖNEMLİ:
 *
 * Eski sistem:
 * 0-4999
 *
 * şeklinde sabit 5 batch çekiyordu.
 *
 * Yeni sistem veri bitene kadar 1000'er 1000'er
 * devam eder.
 *
 * Böylece 5000 ürün sınırı yoktur.
 */
export async function getAllProducts(
  brands?: string[]
): Promise<Product[]> {
  const rows: Product[] = [];

  const PAGE_SIZE = 1000;

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {
    const {
      data,
      error,
    } = await supabase
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
          PAGE_SIZE -
          1
      )
      .order(
        "mepak_kodu",
        {
          ascending: true,
        }
      );

    if (error) {
      throw error;
    }

    const batch =
      (data || []) as Product[];

    rows.push(...batch);

    /*
     * Son batch 1000'den azsa
     * veri bitmiştir.
     */
    if (
      batch.length <
      PAGE_SIZE
    ) {
      break;
    }
  }

  /*
   * Marka filtresi yoksa bütün aktif ürünleri dön.
   */
  if (
    !brands ||
    brands.length === 0
  ) {
    return rows;
  }

  /*
   * Marka filtresi varsa eski marka_adi alanına
   * güvenmek yerine yeni çoklu marka sistemini kullan.
   */
  const wantedBrands =
    new Set(
      brands
        .map(normalizeKey)
        .filter(Boolean)
    );

  return rows.filter(
    (product) => {
      const mappings =
        getBrandMappings(
          product
        );

      return mappings.some(
        (mapping) =>
          wantedBrands.has(
            mapping.marka
          )
      );
    }
  );
}

/**
 * Ürünleri marka ve kategori bazında gruplar.
 *
 * brandOrder:
 * Admin → Katalog Yönetimi → marka sırası
 *
 * categoryOrder:
 * Admin → Katalog Yönetimi → kategori sırası
 */
export function groupProductsByBrand(
  products: Product[],
  brandOrder: string[] = [],
  categoryOrder: string[] = [
    ...DEFAULT_CATEGORY_ORDER,
  ]
): BrandGroup[] {
  const grouped =
    new Map<
      string,
      Map<
        string,
        {
          tr: string;
          en: string;
          items: Product[];
        }
      >
    >();

  /*
   * Çoklu marka sistemini önce aç.
   */
  const expandedProducts =
    expandProductsByBrand(
      products
    );

  for (
    const product of
    expandedProducts
  ) {
    const brand =
      normalizeKey(
        product.marka_adi
      ) ||
      "DİĞER MARKALAR";

    /*
     * Önce tanim_tr içinden kategori bul.
     * Olmazsa category kolonunu kullan.
     */
    const category =
      extractCategoryFromTanim(
        product.tanim_tr
      ) ||
      normalizeKey(
        product.category
      ) ||
      "DİĞER ÜRÜNLER";

    const tanimEn =
      normalizeTitle(
        product.tanim_en
      );

    /*
     * İngilizce kategori adında da "-" sonrası
     * ürün detayını kaldır.
     */
    const groupNameEn =
      tanimEn.includes(" - ")
        ? tanimEn
            .split(" - ")[0]
            .trim()
        : tanimEn;

    if (
      !grouped.has(brand)
    ) {
      grouped.set(
        brand,
        new Map()
      );
    }

    const brandGroups =
      grouped.get(brand)!;

    if (
      !brandGroups.has(
        category
      )
    ) {
      brandGroups.set(
        category,
        {
          tr: category,
          en: groupNameEn,
          items: [],
        }
      );
    }

    brandGroups
      .get(category)!
      .items.push(
        product
      );
  }

  /*
   * Admin marka sırası uygulanır.
   */
  const orderedBrands =
    mergeOrderedValues(
      brandOrder,
      [
        ...grouped.keys(),
      ]
    );

  return orderedBrands.map(
    (brand) => {
      const brandGroups =
        grouped.get(brand)!;

      /*
       * Admin kategori sırası uygulanır.
       */
      const orderedCategories =
        mergeOrderedValues(
          categoryOrder,
          [
            ...brandGroups.keys(),
          ]
        );

      const groups =
        orderedCategories.map(
          (groupKey) => {
            const group =
              brandGroups.get(
                groupKey
              )!;

            /*
             * Ürün kodlarını doğal sıra ile sırala.
             *
             * Örn:
             * MM05.2
             * MM05.10
             *
             * alfabetik terslik yaşamaz.
             */
            const sortedProducts =
              [...group.items].sort(
                (a, b) =>
                  (
                    a.mepak_kodu ||
                    ""
                  ).localeCompare(
                    b.mepak_kodu ||
                      "",
                    "tr",
                    {
                      numeric: true,
                    }
                  )
              );

            return {
              groupName:
                group.tr.toLocaleUpperCase(
                  "tr-TR"
                ),

              groupNameEn:
                group.en.toLocaleUpperCase(
                  "en-US"
                ),

              products:
                sortedProducts,
            };
          }
        );

      return {
        brand,

        groups,

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

        groupCount:
          groups.length,
      };
    }
  );
}
