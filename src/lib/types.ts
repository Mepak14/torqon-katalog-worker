/**
 * Excel'de zamanla eklenen yeni sütunları temel tipi bozmadan taşıyabilmek için
 * kullanılan esnek alan. Supabase tarafında JSONB olarak saklanır.
 */
export interface ProductMetadata {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined;
}

export interface Product {
  id: string;

  // ─────────────────────────────────────────────
  // Marka
  // ─────────────────────────────────────────────

  /**
   * Eski tek marka alanı.
   * Geriye uyumluluk için korunur.
   */
  marka_adi: string;

  /**
   * Ürünün bağlı olduğu tüm markalar.
   * Yeni çoklu marka sistemi bunu kullanır.
   */
  markalar?: string[];

  // ─────────────────────────────────────────────
  // Temel ürün bilgileri
  // ─────────────────────────────────────────────

  mepak_kodu: string;

  tanim_tr: string;

  tanim_en: string;

  resim_kodlari: string;

  // ─────────────────────────────────────────────
  // OEM
  // ─────────────────────────────────────────────

  /**
   * Eski tek OEM alanı.
   */
  oem_no: string;

  /**
   * Ürüne ait tüm OEM numaraları.
   */
  oem_nolari?: string[];

  model: string;

  model_yil: string;

  // ─────────────────────────────────────────────
  // Teknik ölçüler
  // ─────────────────────────────────────────────

  koni_capi_c?: string;

  govde_disi_d1?: string;

  mafsal_disi_d2?: string;

  boru_capi_d?: string;

  eksen_mesafesi_l1?: string;

  dist_capi_d3?: string;

  delik_capi_h1?: string;

  delik_eksen_mesafesi_l2?: string;

  // ─────────────────────────────────────────────
  // Çapraz referans / muadil numaralar
  // ─────────────────────────────────────────────

  bagen_no?: string;

  rota_no?: string;

  egerot_no?: string;

  ditas_no?: string;

  ayd_no?: string;

  acv_no?: string;

  sem_no?: string;

  sampa_no?: string;

  lemforder_no?: string;

  trw_no?: string;

  febi_no?: string;

  cei_no?: string;

  delphi_no?: string;

  dt_no?: string;

  emmerre_no?: string;

  federal_mogul_no?: string;

  pe_automotive_no?: string;

  samko_no?: string;

  automann_no?: string;

  dayton_no?: string;

  meritor_no?: string;

  // ─────────────────────────────────────────────
  // Sonradan eklenen ürün alanları
  // ─────────────────────────────────────────────

  marka_kodu?: string;

  description_short?: string;

  alt_bilesen_1?: string;

  alt_bilesen_1_miktar?: string;

  alt_bilesen_2?: string;

  alt_bilesen_2_miktar?: string;

  cift_parca_no?: string;

  // ─────────────────────────────────────────────
  // JSONB metadata
  // ─────────────────────────────────────────────

  /**
   * marka_oem_eslesmeleri_json gibi yeni alanlar
   * burada saklanabilir.
   */
  metadata?: ProductMetadata;

  // ─────────────────────────────────────────────
  // Sistem alanları
  // ─────────────────────────────────────────────

  created_at?: string;

  updated_at?: string;

  sync_token?: string;

  /**
   * Admin panelindeki aktif / pasif durumu.
   *
   * PDF yalnızca true olan ürünleri alacak.
   */
  is_active?: boolean;

  cross_no?: string;

  uyumlu_modeller?: string;

  koli_adet?: number;

  koli_agirlik?: number;

  koli_hacim?: number;

  /**
   * Ürünün normalize edilmiş kategori alanı.
   */
  category?: string;
}

export type Category = string;

export type Brand = string;

export type Model = string;

export interface SearchParams {
  query?: string;

  category?: string;

  brand?: string;

  model?: string;

  page?: number;

  all?: boolean;
}

export interface SearchResult {
  data: Product[];

  totalCount: number;

  cappedCount: number;

  page: number;

  pageSize: number;

  totalPages: number;

  hasNextPage: boolean;

  hasPrevPage: boolean;

  isCapped: boolean;
}
