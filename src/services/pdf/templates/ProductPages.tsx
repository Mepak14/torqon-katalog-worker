import React from "react";

import {
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from "@react-pdf/renderer";

import {
  BrandGroup,
  Product,
} from "@/lib/catalog-data";

import {
  PRODUCTS_PER_PAGE,
  PAGE_LINK_PREFIX,
  normalizeProductCode,
} from "../ProductLinks";

import {
  SAYFA_DUZENI,
  PAGE_BG_STYLE,
  LOGO_DATA,
} from "./PageTemplate";

const C = {
  navy: "#031a3c",
  navyMid: "#ffffff",
  orange: "#545454",
  white: "#ffffff",
  offWhite: "#f8fafc",
  lightBg: "#f4f6fb",
  border: "#e2e8f0",
  borderLight: "#eef2f7",
  textDark: "#1e293b",
  textMid: "#64748b",
  textLight: "#94a3b8",
};

const CARD_GAP = 8;

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    fontFamily: "Roboto",
    padding: 0,
    color: C.textDark,
  },

  pageInner: {
    flex: 1,
    flexDirection: "column",
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 18,
  },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    paddingBottom: 6,
    marginBottom: 10,
  },

  groupHeaderArea: {
    flex: 1,
    paddingRight: 15,
  },

  groupName: {
    fontSize: 14,
    fontWeight: 900,
    color: C.navy,
    letterSpacing: 0,
    lineHeight: 1.15,
  },

  groupNameEn: {
    fontSize: 8,
    fontWeight: 700,
    color: C.textMid,
    marginTop: 2,
    letterSpacing: 0,
    lineHeight: 1.15,
  },

  brandHeaderArea: {
    width: 180,
    alignItems: "flex-end",
  },

  brandLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: C.navy,
    textAlign: "right",
    lineHeight: 1.15,
    letterSpacing: 0,
  },

  card: {
    flex: 1,
    flexDirection: "row",
    marginBottom: CARD_GAP,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: C.white,
    minHeight: 120,
  },

  cardLast: {
    marginBottom: 0,
  },

  cardImageCol: {
    width: 130,
    backgroundColor: C.offWhite,
    borderRightWidth: 1,
    borderRightColor: C.borderLight,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },

  imageArea: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  relations: {
    width: "100%",
    marginTop: 4,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    flexShrink: 0,
  },

  relation: {
    fontSize: 6,
    lineHeight: 1.35,
    color: C.textMid,
    letterSpacing: 0,
    marginTop: 2,
  },

  relationLink: {
    color: C.navy,
    fontWeight: 900,
    textDecoration: "underline",
  },

  noImg: {
    fontSize: 6,
    color: C.textLight,
    fontWeight: 700,
    letterSpacing: 0,
  },

  cardContent: {
    flex: 1,
    flexDirection: "column",
    overflow: "hidden",
  },

  codeBar: {
    backgroundColor: C.navy,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  codeBarBadge: {
    backgroundColor: C.orange,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 8,
  },

  codeBarBadgeText: {
    fontSize: 6,
    fontWeight: 900,
    color: C.white,
    letterSpacing: 0.4,
  },

  codeBarCode: {
    fontSize: 12,
    fontWeight: 900,
    color: C.white,
    letterSpacing: 0,
    flex: 1,
  },

  infoAndQrRow: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },

  infoArea: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-start",
    marginRight: 8,
  },

  qrBox: {
    width: 82,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 4,
    padding: 5,
  },

  qrImage: {
    width: 70,
    height: 70,
  },

  qrLabel: {
    fontSize: 5,
    fontWeight: 700,
    color: C.textLight,
    marginTop: 3,
    textAlign: "center",
    letterSpacing: 0,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 4,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.borderLight,
  },

  infoLabel: {
    backgroundColor: C.navy,
    color: C.white,
    fontSize: 6,
    fontWeight: 900,
    width: 44,
    paddingVertical: 5,
    paddingHorizontal: 3,
    textAlign: "center",
    letterSpacing: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  infoLabelOrange: {
    backgroundColor: C.orange,
    color: C.white,
    fontSize: 6,
    fontWeight: 900,
    width: 44,
    paddingVertical: 5,
    paddingHorizontal: 3,
    textAlign: "center",
    letterSpacing: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  infoBody: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 7.5,
    fontWeight: 700,
    color: C.textDark,
    justifyContent: "center",
    letterSpacing: 0,
  },

  infoBodyMuted: {
    color: C.textLight,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 3,
  },

  footerPageNum: {
    fontSize: 9,
    fontWeight: 900,
    color: C.navy,
    letterSpacing: 0,
  },

  footerUrl: {
    fontSize: 7,
    color: C.textMid,
  },

  // ─────────────────────────────────────────────────────────────
  // MARKA AYRAÇ SAYFASI
  // ─────────────────────────────────────────────────────────────

  dividerPage: {
    backgroundColor: C.navy,
    padding: 0,
    fontFamily: "Roboto",
  },

  dividerOrangeTop: {
    height: 8,
    backgroundColor: C.orange,
  },

  dividerOrangeBottom: {
    height: 8,
    backgroundColor: C.orange,
  },

  dividerBody: {
    flex: 1.3,
    flexDirection: "row",
  },

  dividerLeft: {
    flex: 1.3,
    paddingHorizontal: 44,
    paddingTop: 70,
    paddingBottom: 50,
    justifyContent: "space-between",
  },

  dividerRight: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 32,
    paddingTop: 70,
    paddingBottom: 50,
    borderLeftWidth: 1,
    borderLeftColor: "#dde3ed",
  },

  dividerEyebrow: {
    fontSize: 9,
    fontWeight: 900,
    color: "#9ca3af",
    letterSpacing: 2,
    marginBottom: 12,
  },

  dividerBrandName: {
    fontWeight: 900,
    color: C.white,
    letterSpacing: 0,
    lineHeight: 1.05,
    maxWidth: 275,
  },

  dividerAccent: {
    width: 60,
    height: 4,
    backgroundColor: "#9ca3af",
    marginTop: 18,
    marginBottom: 18,
  },

  dividerStats: {
    flexDirection: "row",
    marginTop: 30,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },

  dividerStatItem: {
    marginRight: 36,
  },

  dividerStatNum: {
    fontSize: 30,
    fontWeight: 900,
    color: C.white,
    letterSpacing: 0,
  },

  dividerStatLbl: {
    fontSize: 7,
    fontWeight: 900,
    color: "#9ca3af",
    letterSpacing: 1,
    marginTop: 4,
  },

  dividerIndexTitle: {
    fontSize: 8,
    fontWeight: 900,
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  dividerIndexRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  dividerIndexNo: {
    fontSize: 8,
    fontWeight: 900,
    color: "#545454",
    width: 22,
    letterSpacing: 0,
  },

  dividerIndexName: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#1e293b",
    flex: 1,
    lineHeight: 1.3,
    letterSpacing: 0,
  },

  dividerIndexSub: {
    fontSize: 6.5,
    fontWeight: 400,
    color: "#64748b",
    marginTop: 1,
    lineHeight: 1.2,
    letterSpacing: 0,
  },

  dividerBrandBadge: {
    backgroundColor: C.orange,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 3,
    alignSelf: "flex-start",
    marginBottom: 14,
  },

  dividerBrandBadgeText: {
    fontSize: 8,
    fontWeight: 900,
    color: C.white,
    letterSpacing: 1,
  },
});

// ─────────────────────────────────────────────────────────────
// Yardımcı fonksiyonlar
// ─────────────────────────────────────────────────────────────

function splitValues(
  value?: string | null
): string[] {
  return (value || "")
    .split(/[\n,;]+/)
    .map(
      (s) =>
        s.trim()
    )
    .filter(
      Boolean
    );
}

function getFirstImageKey(
  value?: string | null
): string | undefined {
  return value
    ?.split(
      /[,;|\n]+/
    )
    .map(
      (
        item
      ) =>
        item.trim()
    )
    .find(
      Boolean
    );
}

function splitRelationCodes(
  value?: string | null
): string[] {
  return (
    value || ""
  )
    .split(
      /[,;|\n]+/
    )
    .map(
      (
        code
      ) =>
        code.trim()
    )
    .filter(
      (
        code
      ) =>
        Boolean(
          code
        ) &&
        !/^[\s.\-]+$/.test(
          code
        )
    );
}

function validQuantity(
  value?: string | null
): string {
  const quantity =
    (
      value || ""
    ).trim();

  if (
    !quantity ||
    /^[\s.\-]+$/.test(
      quantity
    )
  ) {
    return "";
  }

  return quantity;
}

function formatYears(
  value?: string | null
): string {
  const raw =
    (
      value ||
      ""
    ).trim();

  if (!raw) {
    return "";
  }

  const parts =
    raw
      .split(
        /[\n,;]+/
      )
      .map(
        (
          s
        ) =>
          s.trim()
      )
      .filter(
        (
          s
        ) =>
          s.length >
            0 &&
          !/^[\-\.\s]+$/.test(
            s
          )
      );

  if (
    parts.length ===
    0
  ) {
    return "";
  }

  const allYears =
    parts.every(
      (
        p
      ) =>
        /^\d{4}$/.test(
          p
        )
    );

  if (
    allYears &&
    parts.length >
      2
  ) {
    const nums =
      parts
        .map(
          Number
        )
        .sort(
          (
            a,
            b
          ) =>
            a -
            b
        );

    return `${nums[0]} – ${
      nums[
        nums.length -
          1
      ]
    }`;
  }

  const shown =
    parts.slice(
      0,
      3
    );

  const suffix =
    parts.length >
    3
      ? ` +${
          parts.length -
          3
        }`
      : "";

  return (
    shown.join(
      " · "
    ) +
    suffix
  );
}

/**
 * Marka ayraç sayfasındaki büyük marka adı.
 */
function brandTitleSize(
  brand: string
): number {
  const length =
    brand.trim()
      .length;

  if (
    length <=
    10
  ) {
    return 44;
  }

  if (
    length <=
    14
  ) {
    return 36;
  }

  if (
    length <=
    20
  ) {
    return 30;
  }

  if (
    length <=
    28
  ) {
    return 25;
  }

  if (
    length <=
    36
  ) {
    return 21;
  }

  return 18;
}

/**
 * Uzun marka adını kontrollü şekilde
 * en fazla iki satıra böler.
 */
function formatBrandTitle(
  brand: string
): string {
  const clean =
    brand.trim();

  if (
    clean.length <=
    11
  ) {
    return clean;
  }

  const hyphenIndex =
    clean.indexOf(
      "-"
    );

  if (
    hyphenIndex >
      0 &&
    hyphenIndex <
      clean.length -
        1
  ) {
    const left =
      clean.slice(
        0,
        hyphenIndex +
          1
      );

    const right =
      clean.slice(
        hyphenIndex +
          1
      );

    return `${left}\n${right}`;
  }

  const words =
    clean.split(
      /\s+/
    );

  if (
    words.length >
    1
  ) {
    let bestIndex =
      1;

    let bestDifference =
      Number.MAX_SAFE_INTEGER;

    for (
      let i = 1;
      i <
      words.length;
      i++
    ) {
      const left =
        words
          .slice(
            0,
            i
          )
          .join(
            " "
          );

      const right =
        words
          .slice(
            i
          )
          .join(
            " "
          );

      const difference =
        Math.abs(
          left.length -
            right.length
        );

      if (
        difference <
        bestDifference
      ) {
        bestDifference =
          difference;

        bestIndex =
          i;
      }
    }

    return (
      words
        .slice(
          0,
          bestIndex
        )
        .join(
          " "
        ) +
      "\n" +
      words
        .slice(
          bestIndex
        )
        .join(
          " "
        )
    );
  }

  return clean;
}

/**
 * Ürün sayfasının sağ üstündeki marka adı.
 */
function headerBrandSize(
  brand: string
): number {
  const length =
    brand.trim()
      .length;

  if (
    length <=
    14
  ) {
    return 11;
  }

  if (
    length <=
    22
  ) {
    return 9.5;
  }

  if (
    length <=
    30
  ) {
    return 8.5;
  }

  return 7.5;
}

/**
 * Sol üst kategori başlığı.
 */
function groupTitleSize(
  title: string
): number {
  const length =
    title.trim()
      .length;

  if (
    length <=
    18
  ) {
    return 14;
  }

  if (
    length <=
    28
  ) {
    return 12.5;
  }

  if (
    length <=
    40
  ) {
    return 11;
  }

  return 9.5;
}

// ─────────────────────────────────────────────────────────────
// Marka ayraç sayfası
// ─────────────────────────────────────────────────────────────

const BrandDividerPage =
  ({
    brandObj,
  }: {
    brandObj:
      BrandGroup;
  }) => {
    const MAX_INDEX =
      16;

    const visibleGroups =
      brandObj.groups.slice(
        0,
        MAX_INDEX
      );

    const extraCount =
      brandObj.groups
        .length -
      visibleGroups.length;

    return (
      <Page
        size="A4"
        style={
          styles.dividerPage
        }
        wrap={
          false
        }
      >
        <View
          style={
            styles.dividerOrangeTop
          }
        />

        <View
          style={
            styles.dividerBody
          }
        >
          <View
            style={
              styles.dividerLeft
            }
          >
            <View>
              <View
                style={
                  styles.dividerBrandBadge
                }
              >
                <Text
                  style={
                    styles.dividerBrandBadgeText
                  }
                >
                  BRAND ·
                  MARKA
                </Text>
              </View>

              <Text
                style={
                  styles.dividerEyebrow
                }
              >
                TORQON
                PARTS
              </Text>

              <Text
                style={[
                  styles.dividerBrandName,
                  {
                    fontSize:
                      brandTitleSize(
                        brandObj.brand
                      ),
                  },
                ]}
              >
                {formatBrandTitle(
                  brandObj.brand
                )}
              </Text>

              <View
                style={
                  styles.dividerAccent
                }
              />
            </View>

            <View
              style={
                styles.dividerStats
              }
            >
              <View
                style={
                  styles.dividerStatItem
                }
              >
                <Text
                  style={
                    styles.dividerStatNum
                  }
                >
                  {
                    brandObj.productCount
                  }
                </Text>

                <Text
                  style={
                    styles.dividerStatLbl
                  }
                >
                  ÜRÜN ·
                  PRODUCTS
                </Text>
              </View>
            </View>
          </View>

          <View
            style={
              styles.dividerRight
            }
          >
            <Text
              style={
                styles.dividerIndexTitle
              }
            >
              ÜRÜN
              GRUPLARI ·
              GROUPS
            </Text>

            {visibleGroups.map(
              (
                group,
                idx
              ) => (
                <View
                  key={`di-${idx}`}
                  style={
                    styles.dividerIndexRow
                  }
                >
                  <Text
                    style={
                      styles.dividerIndexNo
                    }
                  >
                    {String(
                      idx +
                        1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </Text>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.dividerIndexName
                      }
                    >
                      {
                        group.groupName
                      }
                    </Text>

                    {group.groupNameEn ? (
                      <Text
                        style={
                          styles.dividerIndexSub
                        }
                      >
                        {
                          group.groupNameEn
                        }
                      </Text>
                    ) : null}
                  </View>
                </View>
              )
            )}

            {extraCount >
              0 && (
              <View
                style={[
                  styles.dividerIndexRow,
                  {
                    marginTop:
                      6,
                  },
                ]}
              >
                <Text
                  style={
                    styles.dividerIndexNo
                  }
                >
                  +
                </Text>

                <Text
                  style={[
                    styles.dividerIndexName,
                    {
                      color:
                        C.orange,
                    },
                  ]}
                >
                  {
                    extraCount
                  }{" "}
                  diğer
                  ürün
                  grubu
                </Text>
              </View>
            )}
          </View>
        </View>

        <View
          style={
            styles.dividerOrangeBottom
          }
        />
      </Page>
    );
  };

// ─────────────────────────────────────────────────────────────
// Ürün kartı
// ─────────────────────────────────────────────────────────────

const ProductCard =
  ({
    product,
    qrDataUrl,
    imgDataUrl,
    isLast,
    productPages,
  }: {
    product:
      Product;

    qrDataUrl?:
      string;

    imgDataUrl?:
      string;

    isLast?:
      boolean;

    productPages:
      Record<
        string,
        number
      >;
  }) => {
    const oemList =
      splitValues(
        product.oem_no
      );

    const modelList =
      splitValues(
        product.model
      );

    const relations =
      [
        ...splitRelationCodes(
          product.cift_parca_no
        ).map(
          (
            code
          ) => ({
            label:
              "ÜRÜN ÇİFTİ",

            code,

            quantity:
              "",
          })
        ),

        ...splitRelationCodes(
          product.alt_bilesen_1
        ).map(
          (
            code
          ) => ({
            label:
              "BİLEŞEN",

            code,

            quantity:
              validQuantity(
                product.alt_bilesen_1_miktar
              ),
          })
        ),

        ...splitRelationCodes(
          product.alt_bilesen_2
        ).map(
          (
            code
          ) => ({
            label:
              "BİLEŞEN",

            code,

            quantity:
              validQuantity(
                product.alt_bilesen_2_miktar
              ),
          })
        ),
      ];

    return (
      <View
        style={
          isLast
            ? [
                styles.card,
                styles.cardLast,
              ]
            : styles.card
        }
      >
        <View
          style={
            styles.cardImageCol
          }
        >
          <View
            style={
              styles.imageArea
            }
          >
            {imgDataUrl ? (
              <Image
                style={
                  styles.cardImg
                }
                src={
                  imgDataUrl
                }
              />
            ) : (
              <Text
                style={
                  styles.noImg
                }
              >
                GÖRSEL YOK
              </Text>
            )}
          </View>

          {relations.length >
            0 && (
            <View
              style={
                styles.relations
              }
            >
              {relations.map(
                (
                  relation,
                  index
                ) => {
                  const targetPage =
                    productPages[
                      normalizeProductCode(
                        relation.code
                      )
                    ];

                  return (
                    <Text
                      key={`relation-${index}`}
                      style={
                        styles.relation
                      }
                    >
                      {
                        relation.label
                      }
                      :{" "}

                      {targetPage ? (
                        <Link
                          src={`${PAGE_LINK_PREFIX}${targetPage}`}
                          style={
                            styles.relationLink
                          }
                        >
                          {
                            relation.code
                          }
                        </Link>
                      ) : (
                        relation.code
                      )}

                      {relation.quantity
                        ? ` ×${relation.quantity}`
                        : ""}
                    </Text>
                  );
                }
              )}
            </View>
          )}
        </View>

        <View
          style={
            styles.cardContent
          }
        >
          <View
            style={
              styles.codeBar
            }
          >
            <View
              style={
                styles.codeBarBadge
              }
            >
              <Text
                style={
                  styles.codeBarBadgeText
                }
              >
                TORQON
              </Text>
            </View>

            <Text
              style={
                styles.codeBarCode
              }
            >
              {
                product.mepak_kodu ||
                "—"
              }
            </Text>
          </View>

          <View
            style={
              styles.infoAndQrRow
            }
          >
            <View
              style={
                styles.infoArea
              }
            >
              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  O.E.M
                </Text>

                <View
                  style={
                    styles.infoBody
                  }
                >
                  {oemList.length >
                  0 ? (
                    <Text>
                      {oemList
                        .slice(
                          0,
                          4
                        )
                        .join(
                          " · "
                        )}
                    </Text>
                  ) : (
                    <Text
                      style={
                        styles.infoBodyMuted
                      }
                    >
                      —
                    </Text>
                  )}
                </View>
              </View>

              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  MODELLER
                </Text>

                <View
                  style={
                    styles.infoBody
                  }
                >
                  {modelList.length >
                  0 ? (
                    <Text>
                      {modelList
                        .slice(
                          0,
                          5
                        )
                        .join(
                          " / "
                        )}
                    </Text>
                  ) : (
                    <Text
                      style={
                        styles.infoBodyMuted
                      }
                    >
                      —
                    </Text>
                  )}
                </View>
              </View>

              {formatYears(
                product.model_yil
              ) && (
                <View
                  style={
                    styles.infoRow
                  }
                >
                  <Text
                    style={
                      styles.infoLabelOrange
                    }
                  >
                    YIL
                  </Text>

                  <View
                    style={
                      styles.infoBody
                    }
                  >
                    <Text>
                      {formatYears(
                        product.model_yil
                      )}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View
              style={
                styles.qrBox
              }
            >
              {qrDataUrl ? (
                <Image
                  style={
                    styles.qrImage
                  }
                  src={
                    qrDataUrl
                  }
                />
              ) : (
                <View
                  style={[
                    styles.qrImage,
                    {
                      backgroundColor:
                        C.lightBg,
                    },
                  ]}
                />
              )}

              <Text
                style={
                  styles.qrLabel
                }
              >
                ÜRÜN
                SAYFASI
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

// ─────────────────────────────────────────────────────────────
// Ürün sayfası
// ─────────────────────────────────────────────────────────────

const ProductPage =
  ({
    group,
    brandName,
    chunk,
    pageNumber,
    qrMap,
    imgMap,
    productPages,
  }: {
    group: {
      groupName:
        string;

      groupNameEn?:
        | string
        | null;
    };

    brandName:
      string;

    chunk:
      Product[];

    pageNumber:
      number;

    qrMap:
      Map<
        string,
        string
      >;

    imgMap:
      Map<
        string,
        string
      >;

    productPages:
      Record<
        string,
        number
      >;
  }) => (
    <Page
      size="A4"
      style={
        styles.page
      }
      wrap={
        false
      }
    >
      <Image
        src={
          SAYFA_DUZENI
        }
        style={
          PAGE_BG_STYLE
        }
      />

      <View
        style={
          styles.pageInner
        }
      >
        <View
          style={
            styles.pageHeader
          }
        >
          <View
            style={
              styles.groupHeaderArea
            }
          >
            <Text
              style={[
                styles.groupName,
                {
                  fontSize:
                    groupTitleSize(
                      group.groupName
                    ),
                },
              ]}
            >
              {
                group.groupName
              }
            </Text>

            {group.groupNameEn && (
              <Text
                style={
                  styles.groupNameEn
                }
              >
                {
                  group.groupNameEn
                }
              </Text>
            )}
          </View>

          <View
            style={
              styles.brandHeaderArea
            }
          >
            <Text
              style={[
                styles.brandLabel,
                {
                  fontSize:
                    headerBrandSize(
                      brandName
                    ),
                },
              ]}
            >
              {
                brandName
              }
            </Text>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            flexDirection:
              "column",
          }}
        >
          {chunk.map(
            (
              product,
              pIdx
            ) => {
              const imageKey =
                getFirstImageKey(
                  product.resim_kodlari
                );

              return (
                <ProductCard
                  key={`prod-${pIdx}`}
                  product={
                    product
                  }
                  productPages={
                    productPages
                  }
                  qrDataUrl={
                    qrMap.get(
                      product.id
                    )
                  }
                  imgDataUrl={
                    imageKey
                      ? imgMap.get(
                          imageKey
                        )
                      : undefined
                  }
                  isLast={
                    pIdx ===
                    chunk.length -
                      1
                  }
                />
              );
            }
          )}
        </View>

        <View
          style={
            styles.footer
          }
        >
          {LOGO_DATA && (
            <Image
              src={
                LOGO_DATA
              }
              style={{
                width: 60,
                height: 20,
                objectFit:
                  "contain",
              }}
            />
          )}

          <Text
            style={
              styles.footerPageNum
            }
          >
            {
              pageNumber
            }
          </Text>

          <Text
            style={
              styles.footerUrl
            }
          >
            www.torqon.com.tr
          </Text>
        </View>
      </View>
    </Page>
  );

// ─────────────────────────────────────────────────────────────
// Ana çıktı
// ─────────────────────────────────────────────────────────────

export const ProductPages =
  ({
    groupedBrands,
    qrMap,
    imgMap,
    startPageNumber = 1,
    productPages = {},
  }: {
    groupedBrands:
      BrandGroup[];

    qrMap:
      Map<
        string,
        string
      >;

    imgMap:
      Map<
        string,
        string
      >;

    startPageNumber?:
      number;

    productPages?:
      Record<
        string,
        number
      >;
  }) => {
    const pages:
      React.ReactNode[] =
        [];

    let pageNumber =
      startPageNumber;

    groupedBrands.forEach(
      (
        brandObj,
        brandIdx
      ) => {
        pages.push(
          <BrandDividerPage
            key={`divider-${brandIdx}`}
            brandObj={
              brandObj
            }
          />
        );

        pageNumber++;

        brandObj.groups.forEach(
          (
            group,
            groupIdx
          ) => {
            const chunks:
              Product[][] =
                [];

            for (
              let i = 0;
              i <
              group.products
                .length;
              i +=
                PRODUCTS_PER_PAGE
            ) {
              chunks.push(
                group.products.slice(
                  i,
                  i +
                    PRODUCTS_PER_PAGE
                )
              );
            }

            chunks.forEach(
              (
                chunk,
                chunkIdx
              ) => {
                pages.push(
                  <ProductPage
                    key={`page-${brandIdx}-${groupIdx}-${chunkIdx}`}
                    group={
                      group
                    }
                    brandName={
                      brandObj.brand
                    }
                    chunk={
                      chunk
                    }
                    pageNumber={
                      pageNumber
                    }
                    qrMap={
                      qrMap
                    }
                    imgMap={
                      imgMap
                    }
                    productPages={
                      productPages
                    }
                  />
                );

                pageNumber++;
              }
            );
          }
        );
      }
    );

    return (
      <>
        {
          pages
        }
      </>
    );
  };
