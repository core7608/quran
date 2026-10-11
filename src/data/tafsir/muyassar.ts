/**
 * Bundled Tafsir: التفسير الميسّر (Tafsir al-Muyassar) — Arabic.
 *
 * This is the single tafsir shipped inside the app. Provenance and licensing
 * are documented in README.md and docs/PROVENANCE.md.
 *
 * Bundled shape (assets/data/tafsir.json):
 *   { source: string, surahs: string[][] }
 * indexed as surahs[surah - 1][ayah - 1].
 */

import type { TafsirEdition } from '@/types';
import type { BundledTafsirStore } from '@/services/api/tafsir';
import { normalizeArabic } from '@/data/quran';

interface RawTafsir {
  source: string;
  surahs: string[][];
}

const RAW_TAFSIR: RawTafsir = require('../../../assets/data/tafsir.json');

export const MUYASSAR_EDITION: TafsirEdition = {
  id: 'ar.muyassar',
  name: 'Tafsir al-Muyassar',
  nameArabic: 'التفسير الميسّر',
  author: 'مجمع الملك فهد لطباعة المصحف الشريف',
  language: 'ar',
  isBundled: true,
  source: 'AlQuran Cloud — ar.muyassar',
  license: 'King Fahd Complex / QUL terms (see docs/PROVENANCE.md)',
  verseCoverage: 100,
};

export class MuyassarStore implements BundledTafsirStore {
  private loaded = false;
  private total = 0;
  private normalizedCache: Map<string, string> | null = null;

  async init(): Promise<void> {
    if (this.loaded) return;
    if (!Array.isArray(RAW_TAFSIR.surahs) || RAW_TAFSIR.surahs.length !== 114) {
      throw new Error('Bundled Muyassar tafsir is incomplete.');
    }
    for (const surah of RAW_TAFSIR.surahs) this.total += surah.length;
    this.loaded = true;
  }

  getEdition(): TafsirEdition {
    return MUYASSAR_EDITION;
  }

  getVerseTafsir(surah: number, verse: number): string | null {
    const text = RAW_TAFSIR.surahs[surah - 1]?.[verse - 1];
    return typeof text === 'string' ? text : null;
  }

  getSurahTafsir(surah: number): Map<number, string> {
    const result = new Map<number, string>();
    const verses = RAW_TAFSIR.surahs[surah - 1];
    if (!verses) return result;
    verses.forEach((text, index) => result.set(index + 1, text));
    return result;
  }

  search(query: string): { surah: number; verse: number; text: string }[] {
    const q = normalizeArabic(query.trim());
    if (!q) return [];

    if (!this.normalizedCache) {
      this.normalizedCache = new Map<string, string>();
      RAW_TAFSIR.surahs.forEach((verses, sIndex) => {
        verses.forEach((text, vIndex) => {
          this.normalizedCache!.set(`${sIndex + 1}:${vIndex + 1}`, normalizeArabic(text));
        });
      });
    }

    const results: { surah: number; verse: number; text: string }[] = [];
    for (const [key, normalized] of this.normalizedCache) {
      if (normalized.includes(q)) {
        const [s, v] = key.split(':').map(Number);
        results.push({ surah: s, verse: v, text: RAW_TAFSIR.surahs[s - 1][v - 1] });
      }
    }
    return results.sort((a, b) => a.surah - b.surah || a.verse - b.verse);
  }

  getTotalVerses(): number {
    return this.total;
  }
}

export const muyassar = new MuyassarStore();

let readyPromise: Promise<MuyassarStore> | null = null;

/**
 * Returns the bundled Muyassar store, initialised exactly once. Memoised so
 * repeated `await`s in screens share the same init promise.
 */
export function getMuyassarStore(): Promise<MuyassarStore> {
  if (!readyPromise) {
    readyPromise = muyassar.init().then(() => muyassar);
  }
  return readyPromise;
}
