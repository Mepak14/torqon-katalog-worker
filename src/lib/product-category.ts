export const MEPAK_CATEGORY_RULES = [
  {
    digit: "1",
    prefix: "MM05.1",
    category: "ROTBAŞI",
  },
  {
    digit: "2",
    prefix: "MM05.2",
    category: "ROT KOLU",
  },
  {
    digit: "3",
    prefix: "MM05.3",
    category: "STABİLİZER",
  },
  {
    digit: "4",
    prefix: "MM05.4",
    category: "TORK KOLU",
  },
  {
    digit: "5",
    prefix: "MM05.5",
    category: "V KOLU",
  },
  {
    digit: "6",
    prefix: "MM05.6",
    category: "TAMİR TAKIMI",
  },
  {
    digit: "7",
    prefix: "MM05.7",
    category: "ROTİL",
  },
  {
    digit: "8",
    prefix: "MM05.8",
    category: "BURÇ",
  },
  {
    digit: "9",
    prefix: "MM05.9",
    category: "ROTMİLİ",
  },
] as const;

const CATEGORY_SYNONYMS: Record<
  string,
  string
> = {
  "ROT BAŞI":
    "ROTBAŞI",

  ROTBASI:
    "ROTBAŞI",

  ROTKOLU:
    "ROT KOLU",

  STABILIZER:
    "STABİLİZER",

  "TAMIR TAKIMI":
    "TAMİR TAKIMI",

  ROTIL:
    "ROTİL",

  BURC:
    "BURÇ",

  "ROT MILI":
    "ROTMİLİ",

  ROTMILI:
    "ROTMİLİ",

  "MAKAS YATAK TAMİR TAKIMI":
    "MAKAS YATAĞI TAMİR TAKIMI",

  "S KAM TAMİR TAKIMI":
    "S KAM MİLİ TAMİR TAKIMI",

  "SİLİNDİR KABİN KALDIRMA":
    "KABİN KALDIRMA SİLİNDİRİ",
};

const CATEGORY_BLOCKLIST =
  new Set([
    "",
    "-",
    "VERİ YOK",
    "SİSTEMDEN SİLİNDİ",
  ]);

function toAsciiUpper(
  value?: string | null
): string {
  return (
    value ||
    ""
  )
    .trim()
    .replace(
      /İ/g,
      "I"
    )
    .replace(
      /ı/g,
      "I"
    )
    .replace(
      /Ğ/g,
      "G"
    )
    .replace(
      /ğ/g,
      "G"
    )
    .replace(
      /Ü/g,
      "U"
    )
    .replace(
      /ü/g,
      "U"
    )
    .replace(
      /Ş/g,
      "S"
    )
    .replace(
      /ş/g,
      "S"
    )
    .replace(
      /Ö/g,
      "O"
    )
    .replace(
      /ö/g,
      "O"
    )
    .replace(
      /Ç/g,
      "C"
    )
    .replace(
      /ç/g,
      "C"
    )
    .toUpperCase()
    .replace(
      /\s+/g,
      " "
    );
}

export function normalizeCategoryName(
  value?: string | null
): string {
  const clean =
    (
      value ||
      ""
    )
      .trim()
      .toLocaleUpperCase(
        "tr-TR"
      )
      .replace(
        /\s+/g,
        " "
      );

  if (
    !clean
  ) {
    return "";
  }

  const direct =
    CATEGORY_SYNONYMS[
      clean
    ];

  if (
    direct
  ) {
    return direct;
  }

  const ascii =
    toAsciiUpper(
      clean
    );

  return (
    CATEGORY_SYNONYMS[
      ascii
    ] ||
    clean
  );
}

export function hasValidCategory(
  value?: string | null
): boolean {
  const normalized =
    normalizeCategoryName(
      value
    );

  if (
    !normalized
  ) {
    return false;
  }

  return !CATEGORY_BLOCKLIST.has(
    normalized
  );
}

export function inferCategoryFromMepakCode(
  value?: string | null
): string | null {
  const code =
    (
      value ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    !code
  ) {
    return null;
  }

  const match =
    code.match(
      /^MM05[\s.\-]?([1-9])/
    );

  if (
    !match
  ) {
    return null;
  }

  const rule =
    MEPAK_CATEGORY_RULES.find(
      (
        item
      ) =>
        item.digit ===
        match[1]
    );

  return (
    rule?.category ||
    null
  );
}

export function extractCategoryFromTanim(
  tanim?: string | null
): string | null {
  if (
    !tanim
  ) {
    return null;
  }

  const tanimUpper =
    tanim
      .toLocaleUpperCase(
        "tr-TR"
      )
      .trim();

  if (
    CATEGORY_BLOCKLIST.has(
      tanimUpper
    )
  ) {
    return null;
  }

  const base =
    tanimUpper
      .split(
        " - "
      )[0]
      .trim();

  let normalized =
    base
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

  normalized =
    normalizeCategoryName(
      normalized
    );

  if (
    normalized.length <
      2 ||
    CATEGORY_BLOCKLIST.has(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

type ProductCategoryInput = {
  category?:
    | string
    | null;

  mepak_kodu?:
    | string
    | null;

  tanim_tr?:
    | string
    | null;
};

export function resolveProductCategory(
  product: ProductCategoryInput
): string | null {
  /*
   * 1. Manuel/veritabanındaki kategori
   */
  if (
    hasValidCategory(
      product.category
    )
  ) {
    return normalizeCategoryName(
      product.category
    );
  }

  /*
   * 2. MEPAK kodu
   */
  const fromCode =
    inferCategoryFromMepakCode(
      product.mepak_kodu
    );

  if (
    fromCode
  ) {
    return fromCode;
  }

  /*
   * 3. Son fallback: Türkçe tanım
   */
  return extractCategoryFromTanim(
    product.tanim_tr
  );
}