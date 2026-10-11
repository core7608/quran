/**
 * Translation API — served online from AlQuran Cloud (`/surah/{surah}/{edition}`).
 *
 * Translations are intentionally NOT bundled (the app ships exactly one tafsir,
 * ar.muyassar, and no translations) — they are fetched on demand and cached by
 * the API client. All editions below exist on AlQuran Cloud.
 */

import { api, type ApiResponse, type ProviderName } from './client';

const PROVIDER: ProviderName = 'alQuranCloud';

export interface TranslationEdition {
  id: string;
  name: string;
  language: string;
}

export interface TranslationEntry {
  surah: number;
  verse: number;
  text: string;
  editionId: string;
}

/**
 * Curated set of editions that exist on AlQuran Cloud. `en.sahih` is the
 * default translation source (see storage defaults).
 */
export const TRANSLATION_EDITIONS: TranslationEdition[] = [
  { id: 'en.sahih', name: 'Saheeh International', language: 'en' },
  { id: 'en.pickthall', name: 'Muhammad Pickthall', language: 'en' },
  { id: 'en.yusufali', name: 'Abdullah Yusuf Ali', language: 'en' },
  { id: 'en.transliteration', name: 'Transliteration', language: 'en' },
  { id: 'fr.hamidullah', name: 'Muhammad Hamidullah', language: 'fr' },
  { id: 'ur.jalandhry', name: 'Jalandhry (اردو)', language: 'ur' },
  { id: 'id.indonesian', name: 'Bahasa Indonesia', language: 'id' },
  { id: 'tr.diyanet', name: 'Diyanet İşleri (Türkçe)', language: 'tr' },
  { id: 'de.aburida', name: 'Abu Rida (Deutsch)', language: 'de' },
  { id: 'es.cortes', name: 'Julio Cortés (Español)', language: 'es' },
];

interface AlQuranCloudSurahResponse {
  code: number;
  status: string;
  data: {
    number: number;
    edition: { identifier: string; language: string; name: string };
    ayahs: {
      number: number;
      numberInSurah: number;
      text: string;
      juz: number;
      page: number;
    }[];
  };
}

export const translationsApi = {
  /**
   * Fetch the translation of a whole surah (cached by the client).
   */
  async getSurahTranslation(surah: number, editionId: string): Promise<ApiResponse<TranslationEntry[]>> {
    const res = await api.get<AlQuranCloudSurahResponse>(`/surah/${surah}/${editionId}`, {
      provider: PROVIDER,
    });

    if (res.error || !res.data) {
      return { data: null, error: res.error, loading: false, fromCache: res.fromCache };
    }

    const entries: TranslationEntry[] = res.data.data.ayahs.map((a) => ({
      surah,
      verse: a.numberInSurah,
      text: a.text,
      editionId,
    }));

    return { data: entries, error: null, loading: false, fromCache: res.fromCache };
  },

  /**
   * Fetch a single verse translation.
   */
  async getVerseTranslation(surah: number, verse: number, editionId: string): Promise<ApiResponse<TranslationEntry | null>> {
    const res = await translationsApi.getSurahTranslation(surah, editionId);
    if (res.error || !res.data) {
      return { data: null, error: res.error, loading: false, fromCache: res.fromCache };
    }
    const entry = res.data.find((e) => e.verse === verse) ?? null;
    return { data: entry, error: null, loading: false, fromCache: res.fromCache };
  },
};