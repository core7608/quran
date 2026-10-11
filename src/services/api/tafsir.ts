/**
 * Tafsir API — Online tafsir from Quran.com
 * Bundled tafsir handled separately in src/data/
 */

import { api, ProviderName } from './client';
import type { TafsirEdition, TafsirEntry } from '@/types';
import type { ApiResponse } from './client';

const PROVIDER: ProviderName = 'quranCom';

// ============================================
// Types (Quran.com API v4)
// ============================================

interface QuranComTafsirResource {
  id: number;
  resource_id: number;
  name: string;
  language_name: string;
  language_id: string;
  author_name: string;
  description: string;
  is_verified: boolean;
}

interface QuranComTafsirResponse {
  tafsirs: QuranComTafsirResource[];
}

interface QuranComTafsirTextResponse {
  tafsir: {
    id: number;
    verse_key: string;           // "surah:verse"
    text: string;
    language_name: string;
    resource_name: string;
  };
}

// ============================================
// API Functions
// ============================================

export const tafsirApi = {
  /**
   * Fetch available tafsir editions
   */
  async getEditions(): Promise<ApiResponse<TafsirEdition[]>> {
    const res = await api.get<QuranComTafsirResponse>('/resources/tafsirs', {
      provider: PROVIDER,
      params: { language: 'ar' },
    });

    if (res.error || !res.data) return { data: null, error: res.error, loading: false, fromCache: res.fromCache };

    const editions: TafsirEdition[] = res.data.tafsirs.map(t => ({
      id: String(t.resource_id),
      name: t.name,
      nameArabic: t.name,
      author: t.author_name,
      language: t.language_name,
      isBundled: false,
      source: 'quran.com',
      license: 'Quran.com Terms of Use',
      verseCoverage: 100, // Most editions cover all verses
    }));

    return { data: editions, error: null, loading: false, fromCache: res.fromCache };
  },

  /**
   * Get tafsir for a specific verse
   */
  async getVerseTafsir(verseKey: string, editionId: string): Promise<ApiResponse<TafsirEntry | null>> {
    const res = await api.get<QuranComTafsirTextResponse>(`/tafsirs/${editionId}/by_verse/${verseKey}`, {
      provider: PROVIDER,
      params: { language: 'ar' },
    });

    if (res.error || !res.data) return { data: null, error: res.error, loading: false, fromCache: res.fromCache };

    const [surahStr, verseStr] = verseKey.split(':');
    const entry: TafsirEntry = {
      surah: parseInt(surahStr, 10),
      verse: parseInt(verseStr, 10),
      text: res.data.tafsir.text,
      editionId,
    };

    return { data: entry, error: null, loading: false, fromCache: res.fromCache };
  },

  /**
   * Get tafsir for a surah (all verses)
   */
  async getSurahTafsir(surah: number, editionId: string): Promise<ApiResponse<TafsirEntry[]>> {
    const res = await api.get<{ tafsirs: QuranComTafsirTextResponse['tafsir'][] }>(`/tafsirs/${editionId}/by_surah/${surah}`, {
      provider: PROVIDER,
      params: { language: 'ar' },
    });

    if (res.error || !res.data) return { data: null, error: res.error, loading: false, fromCache: res.fromCache };

    const entries: TafsirEntry[] = res.data.tafsirs.map(t => {
      const [, verseStr] = t.verse_key.split(':');
      return {
        surah,
        verse: parseInt(verseStr, 10),
        text: t.text,
        editionId,
      };
    });

    return { data: entries, error: null, loading: false, fromCache: res.fromCache };
  },
};

// ============================================
// Bundled Tafsir Interface (implemented in src/data/)
// ============================================

export interface BundledTafsirStore {
  init(): Promise<void>;
  getEdition(): TafsirEdition;
  getVerseTafsir(surah: number, verse: number): string | null;
  getSurahTafsir(surah: number): Map<number, string>;
  search(query: string): { surah: number; verse: number; text: string }[];
  getTotalVerses(): number;
}

// Factory to create the appropriate store (online vs bundled).
//
// The only bundled edition is التفسير الميسّر (`ar.muyassar`). Anything else is
// served from the online provider.
export async function createTafsirStore(editionId: string, preferBundled = true): Promise<{
  online: typeof tafsirApi;
  bundled: BundledTafsirStore | null;
}> {
  let bundled: BundledTafsirStore | null = null;

  if (preferBundled && editionId === 'ar.muyassar') {
    try {
      const { MuyassarStore } = await import('@/data/tafsir/muyassar');
      bundled = new MuyassarStore();
      await bundled.init();
    } catch {
      console.warn('Bundled tafsir not available, falling back to online');
    }
  }

  return { online: tafsirApi, bundled };
}