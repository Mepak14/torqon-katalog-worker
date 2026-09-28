import React from "react";
import { Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { BrandGroup, Product } from "@/lib/catalog-data";
import { SAYFA_DUZENI, PAGE_BG_STYLE, LOGO_DATA } from "./PageTemplate";


// ─── Mepak Brand Colors ──────────────────────────────────────────────────────
const C = {
  navy:       "#031a3c",
  navyMid:    "#ffffff",
  orange:     "#545454",
  white:      "#ffffff",
  offWhite:   "#f8fafc",
  lightBg:    "#f4f6fb",
  border:     "#e2e8f0",
  borderLight:"#eef2f7",
  textDark:   "#1e293b",
  textMid:    "#64748b",
  textLight:  "#94a3b8",
};

// ─── Layout constants ────────────────────────────────────────────────────────
const PRODUCTS_PER_PAGE = 4;
const CARD_GAP = 8;

const styles = StyleSheet.create({
  // ─── Page ───────────────────────────────────────────────────────────────
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

  // ─── Page Header ────────────────────────────────────────────────────────
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    paddingBottom: 6,
    marginBottom: 10,
  },

  groupName: {
    fontSize: 14,
    fontWeight: 900,
    color: C.navy,
    letterSpacing: -0.3,
  },

  groupNameEn: {
    fontSize: 8,
    fontWeight: 700,
    color: C.textMid,
    marginTop: 1,
    letterSpacing: 0.5,
  },

  suitableLabel: {
    fontSize: 7,
    fontWeight: 900,
    color: C.orange,
    letterSpacing: 1.5,
    marginBottom: 2,
    textAlign: "right",
  },

  brandLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: C.navy,
    textAlign: "right",
  },

  // ─── Card ───────────────────────────────────────────────────────────────
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

  // Left: Product image
  cardImageCol: {
    width: 130,
    backgroundColor: C.offWhite,
    borderRightWidth: 1,
    borderRightColor: C.borderLight,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },

  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  noImg: {
    fontSize: 6,
    color: C.textLight,
    fontWeight: 700,
    letterSpacing: 0.8,
  },

  // Right: Content column
  cardContent: {
    flex: 1,
    flexDirection: "column",
    overflow: "hidden",
  },

  // ─── Code Bar ───────────────────────────────────────────────────────────
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
    letterSpacing: 1,
  },

  codeBarCode: {
    fontSize: 12,
    fontWeight: 900,
    color: C.white,
    letterSpacing: 1.5,
    flex: 1,
  },

  // ─── Info + QR row ──────────────────────────────────────────────────────
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

  // ─── QR Code box ────────────────────────────────────────────────────────
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
    letterSpacing: 0.5,
  },

  // ─── Info rows ──────────────────────────────────────────────────────────
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
    letterSpacing: 0.3,
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
    letterSpacing: 0.3,
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
  },

  infoBodyMuted: {
    color: C.textLight,
  },

  // ─── Page Footer ────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 3,
  },

  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
  },

  footerLogoMark: {
    backgroundColor: C.navy,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 5,
  },

  footerLogoMarkText: {
    fontSize: 7,
    fontWeight: 900,
    color: C.white,
  },

  footerLogoText: {
    fontSize: 7,
    fontWeight: 900,
    color: C.navy,
    letterSpacing: 1,
  },

  footerPageNum: {
    fontSize: 9,
    fontWeight: 900,
    color: C.navy,
  },

  footerUrl: {
    fontSize: 7,
    color: C.textMid,
  },

  // ─── Brand Divider Page ─────────────────────────────────────────────────
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
    flex: 1,
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
    letterSpacing: 3,
    marginBottom: 12,
  },

  dividerBrandName: {
    fontSize: 48,
    fontWeight: 900,
    color: C.white,
    letterSpacing: -1,
    lineHeight: 1.05,
  },

  dividerAccent: {
    width: 60,
    height: 4,
    backgroundColor: "#9ca3af",
    marginTop: 18,
    marginBottom: 18,
  },

  dividerSubline: {
    fontSize: 10,
    fontWeight: 400,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 1.5,
    letterSpacing: 0.3,
    maxWidth: 280,
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
    letterSpacing: -0.5,
  },

  dividerStatLbl: {
    fontSize: 7,
    fontWeight: 900,
    color: "#9ca3af",
    letterSpacing: 2,
    marginTop: 4,
  },

  dividerIndexTitle: {
    fontSize: 8,
    fontWeight: 900,
    color: "#64748b",
    letterSpacing: 2.5,
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
  },

  dividerIndexName: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#1e293b",
    flex: 1,
    lineHeight: 1.3,
  },

  dividerIndexSub: {
    fontSize: 6.5,
    fontWeight: 400,
    color: "#64748b",
    marginTop: 1,
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
    letterSpacing: 2.5,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function splitValues(value?: string | null): string[] {
  return (value || "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatYears(value?: string | null): string {
  const raw = (value || "").trim();

  if (!raw) return "";

  const parts = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^[\-\.\s]+$/.test(s));

  if (parts.length === 0) return "";

  const allYears = parts.every((p) => /^\d{4}$/.test(p));

  if (allYears && parts.length > 2) {
    const nums = parts.map(Number).sort((a, b) => a - b);

    return `${nums[0]} – ${nums[nums.length - 1]}`;
  }

  const shown = parts.slice(0, 3);
  const suffix = parts.length > 3 ? ` +${parts.length - 3}` : "";

  return shown.join(" · ") + suffix;
}

// ─── Brand Divider Page ──────────────────────────────────────────────────────
const BrandDividerPage = ({
  brandObj,
}: {
  brandObj: BrandGroup;
}) => {
  const MAX_INDEX = 16;

  const visibleGroups = brandObj.groups.slice(0, MAX_INDEX);

  const extraCount =
    brandObj.groups.length - visibleGroups.length;

  return (
    <Page
      size="A4"
      style={styles.dividerPage}
      wrap={false}
    >
      <View style={styles.dividerOrangeTop} />

      <View style={styles.dividerBody}>
        {/* Sol kolon */}
        <View style={styles.dividerLeft}>
          <View>
            <View style={styles.dividerBrandBadge}>
              <Text style={styles.dividerBrandBadgeText}>
                BRAND · MARKA
              </Text>
            </View>

            <Text style={styles.dividerEyebrow}>
              TORQON PARTS
            </Text>

            <Text style={styles.dividerBrandName}>
              {brandObj.brand}
            </Text>

            <View style={styles.dividerAccent} />

            <Text style={styles.dividerSubline}>
              Bu bölümde {brandObj.brand} markasına ait
              orijinal kalitede direksiyon parçaları, ana ürün
              gruplarına göre sınıflandırılmıştır.
            </Text>
          </View>

          {/* Sadece ürün adedi gösterilir */}
          <View style={styles.dividerStats}>
            <View style={styles.dividerStatItem}>
              <Text style={styles.dividerStatNum}>
                {brandObj.productCount}
              </Text>

              <Text style={styles.dividerStatLbl}>
                ÜRÜN · PRODUCTS
              </Text>
            </View>
          </View>
        </View>

        {/* Sağ kolon */}
        <View style={styles.dividerRight}>
          <Text style={styles.dividerIndexTitle}>
            ÜRÜN GRUPLARI · GROUPS
          </Text>

          {visibleGroups.map((group, idx) => (
            <View
              key={`di-${idx}`}
              style={styles.dividerIndexRow}
            >
              <Text style={styles.dividerIndexNo}>
                {String(idx + 1).padStart(2, "0")}
              </Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.dividerIndexName}>
                  {group.groupName}
                </Text>

                {group.groupNameEn ? (
                  <Text style={styles.dividerIndexSub}>
                    {group.groupNameEn}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}

          {extraCount > 0 && (
            <View
              style={[
                styles.dividerIndexRow,
                { marginTop: 6 },
              ]}
            >
              <Text style={styles.dividerIndexNo}>
                +
              </Text>

              <Text
                style={[
                  styles.dividerIndexName,
                  { color: C.orange },
                ]}
              >
                {extraCount} diğer ürün grubu
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.dividerOrangeBottom} />
    </Page>
  );
};

// ─── Product Card ────────────────────────────────────────────────────────────
const ProductCard = ({
  product,
  qrDataUrl,
  imgDataUrl,
  isLast,
}: {
  product: Product;
  qrDataUrl?: string;
  imgDataUrl?: string;
  isLast?: boolean;
}) => {
  const oemList = splitValues(product.oem_no);

  const modelList = splitValues(product.model);

  return (
    <View
      style={
        isLast
          ? [styles.card, styles.cardLast]
          : styles.card
      }
    >
      {/* Product Image */}
      <View style={styles.cardImageCol}>
        {imgDataUrl ? (
          <Image
            style={styles.cardImg}
            src={imgDataUrl}
          />
        ) : (
          <Text style={styles.noImg}>
            GÖRSEL YOK
          </Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <View style={styles.codeBar}>
          <View style={styles.codeBarBadge}>
            <Text style={styles.codeBarBadgeText}>
              TORQON
            </Text>
          </View>

          <Text style={styles.codeBarCode}>
            {product.mepak_kodu || "—"}
          </Text>
        </View>

        <View style={styles.infoAndQrRow}>
          <View style={styles.infoArea}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                O.E.M
              </Text>

              <View style={styles.infoBody}>
                {oemList.length > 0 ? (
                  <Text>
                    {oemList
                      .slice(0, 4)
                      .join(" · ")}
                  </Text>
                ) : (
                  <Text style={styles.infoBodyMuted}>
                    —
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                MODELLER
              </Text>

              <View style={styles.infoBody}>
                {modelList.length > 0 ? (
                  <Text>
                    {modelList
                      .slice(0, 5)
                      .join(" / ")}
                  </Text>
                ) : (
                  <Text style={styles.infoBodyMuted}>
                    —
                  </Text>
                )}
              </View>
            </View>

            {formatYears(product.model_yil) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabelOrange}>
                  YIL
                </Text>

                <View style={styles.infoBody}>
                  <Text>
                    {formatYears(product.model_yil)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* QR */}
          <View style={styles.qrBox}>
            {qrDataUrl ? (
              <Image
                style={styles.qrImage}
                src={qrDataUrl}
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

            <Text style={styles.qrLabel}>
              ÜRÜN SAYFASI
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Product Page ────────────────────────────────────────────────────────────
const ProductPage = ({
  group,
  brandName,
  chunk,
  pageNumber,
  qrMap,
  imgMap,
}: {
  group: {
    groupName: string;
    groupNameEn?: string | null;
  };
  brandName: string;
  chunk: Product[];
  pageNumber: number;
  qrMap: Map<string, string>;
  imgMap: Map<string, string>;
}) => (
  <Page
    size="A4"
    style={styles.page}
    wrap={false}
  >
    <Image
      src={SAYFA_DUZENI}
      style={PAGE_BG_STYLE}
    />

    <View style={styles.pageInner}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.groupName}>
            {group.groupName}
          </Text>

          {group.groupNameEn && (
            <Text style={styles.groupNameEn}>
              {group.groupNameEn}
            </Text>
          )}
        </View>

        <View>
          <Text style={styles.brandLabel}>
            {brandName}
          </Text>
        </View>
      </View>

      {/* Product Cards */}
      <View
        style={{
          flex: 1,
          flexDirection: "column",
        }}
      >
        {chunk.map((product, pIdx) => (
          <ProductCard
            key={`prod-${pIdx}`}
            product={product}
            qrDataUrl={qrMap.get(product.id)}
            imgDataUrl={
              product.resim_kodlari
                ? imgMap.get(
                    product.resim_kodlari
                  )
                : undefined
            }
            isLast={
              pIdx ===
              chunk.length - 1
            }
          />
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {LOGO_DATA && (
          <Image
            src={LOGO_DATA}
            style={{
              width: 60,
              height: 20,
              objectFit: "contain",
            }}
          />
        )}

        <Text style={styles.footerPageNum}>
          {pageNumber}
        </Text>

        <Text style={styles.footerUrl}>
          www.torqon.com.tr
        </Text>
      </View>
    </View>
  </Page>
);

// ─── Main Export ─────────────────────────────────────────────────────────────
export const ProductPages = ({
  groupedBrands,
  qrMap,
  imgMap,
}: {
  groupedBrands: BrandGroup[];
  qrMap: Map<string, string>;
  imgMap: Map<string, string>;
}) => {
  const pages: React.ReactNode[] = [];

  let pageNumber = 1;

  groupedBrands.forEach(
    (brandObj, brandIdx) => {
      // 1. Brand Divider
      pages.push(
        <BrandDividerPage
          key={`divider-${brandIdx}`}
          brandObj={brandObj}
        />
      );

      pageNumber++;

      // 2. Product pages
      brandObj.groups.forEach(
        (group, groupIdx) => {
          const chunks: Product[][] = [];

          for (
            let i = 0;
            i < group.products.length;
            i += PRODUCTS_PER_PAGE
          ) {
            chunks.push(
              group.products.slice(
                i,
                i + PRODUCTS_PER_PAGE
              )
            );
          }

          chunks.forEach(
            (chunk, chunkIdx) => {
              pages.push(
                <ProductPage
                  key={`page-${brandIdx}-${groupIdx}-${chunkIdx}`}
                  group={group}
                  brandName={brandObj.brand}
                  chunk={chunk}
                  pageNumber={pageNumber}
                  qrMap={qrMap}
                  imgMap={imgMap}
                />
              );

              pageNumber++;
            }
          );
        }
      );
    }
  );

  return <>{pages}</>;
};
