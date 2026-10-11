/**
 * Local Quran data layer.
 *
 * The complete Uthmani text is bundled with the app (assets/data/quran.json)
 * and loaded synchronously on first access, so every core reading feature works
 * fully offline. No network access is required for text, page or juz indices.
 *
 * Source: AlQuran Cloud — `quran-uthmani`
 * (mirrored from the Tanzil Uthmani text). See README for full provenance.
 */

import type { Surah, Verse, QuranLocation, SearchResult, JuzStart } from '@/types';

// ============================================
// Raw bundled shapes
// ============================================

interface RawAyah {
  n: number; // verse number within surah
  g: number; // global number 1-6236
  t: string; // Uthmani text
  j: number; // juz 1-30
  p: number; // page 1-604
  s: boolean; // sajdah
}

interface RawSurah {
  n: number;
  name: string;
  en: string;
  translation: string;
  place: string;
  count: number;
  ayahs: RawAyah[];
}

interface RawQuran {
  source: string;
  surahs: RawSurah[];
}

const RAW_QURAN: RawQuran = require('../../../assets/data/quran.json');

// ============================================
// In-memory store
// ============================================

let surahs: Surah[] = [];
let versesBySurah: Map<number, Verse[]> = new Map();
let verseIndex: Map<string, Verse> = new Map(); // "surah:verse" -> Verse
let versesFlat: Verse[] = [];
let juzStarts: JuzStart[] = [];
let pagesIndex: Map<number, Verse[]> = new Map();
let searchIndex: Map<string, { surah: number; verse: number }[]> = new Map();
let initialized = false;

// ============================================
// Arabic text normalisation (for offline search)
// ============================================

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeArabic(text: string): string {
  return text
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeArabic(text)
    .split(' ')
    .filter((t) => t.length > 1);
}

const ARABIC_TO_LATIN_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function toArabicDigits(value: number): string {
  return String(value).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

function stripArabicDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => ARABIC_TO_LATIN_DIGITS[d] ?? d);
}

// ============================================
// Build
// ============================================

function build(): void {
  if (initialized) return;

  surahs = [];
  versesBySurah = new Map();
  verseIndex = new Map();
  versesFlat = [];
  juzStarts = [];
  pagesIndex = new Map();
  searchIndex = new Map();

  for (const raw of RAW_QURAN.surahs) {
    const verses: Verse[] = raw.ayahs.map((a) => ({
      surah: raw.n,
      verse: a.n,
      globalNumber: a.g,
      text: a.t,
      page: a.p,
      juz: a.j,
      sajdah: a.s,
    }));

    versesBySurah.set(raw.n, verses);
    for (const v of verses) {
      verseIndex.set(`${v.surah}:${v.verse}`, v);
      versesFlat.push(v);
      const page = pagesIndex.get(v.page);
      if (page) page.push(v);
      else pagesIndex.set(v.page, [v]);
    }

    const juzList = Array.from(new Set(verses.map((v) => v.juz))).sort((a, b) => a - b);

    surahs.push({
      number: raw.n,
      nameArabic: raw.name.replace(/^سُورَةُ\s*/u, ''),
      nameTransliterated: raw.en,
      nameTranslation: raw.translation,
      revelationType: raw.place.toLowerCase() === 'medinan' ? 'medinan' : 'meccan',
      verseCount: raw.count ?? verses.length,
      pageStart: verses.length ? verses[0].page : 0,
      pageEnd: verses.length ? verses[verses.length - 1].page : 0,
      juzList,
    });
  }

  // Juz boundaries are derived by scanning the canonical verse order.
  for (const v of versesFlat) {
    if (!juzStarts.length || juzStarts[juzStarts.length - 1].juz !== v.juz) {
      juzStarts.push({ juz: v.juz, surah: v.surah, verse: v.verse, page: v.page });
    }
  }

  buildSearchIndex();
  initialized = true;
}

function buildSearchIndex(): void {
  for (const verse of versesFlat) {
    const tokens = tokenize(verse.text);
    const seen = new Set<string>();
    for (const token of tokens) {
      if (seen.has(token)) continue;
      seen.add(token);
      const bucket = searchIndex.get(token);
      if (bucket) bucket.push({ surah: verse.surah, verse: verse.verse });
      else searchIndex.set(token, [{ surah: verse.surah, verse: verse.verse }]);
    }
  }
}

/**
 * Loads (or returns already-loaded) Quran data. Kept async for API symmetry
 * with the rest of the data layer, even though the bundled JSON is synchronous.
 */
export async function loadQuranData(): Promise<void> {
  if (!initialized) build();
}

export function isInitialized(): boolean {
  return initialized;
}

function ensureReady(): void {
  if (!initialized) build();
}

// ============================================
// Public API
// ============================================

export const quranData = {
  // --- Surahs ---
  getAllSurahs(): Surah[] {
    ensureReady();
    return surahs;
  },

  getSurah(number: number): Surah | undefined {
    ensureReady();
    return surahs.find((s) => s.number === number);
  },

  getSurahByPage(page: number): Surah | undefined {
    ensureReady();
    return surahs.find((s) => s.pageStart <= page && s.pageEnd >= page);
  },

  // --- Verses ---
  getVerse(surah: number, verse: number): Verse | undefined {
    ensureReady();
    return verseIndex.get(`${surah}:${verse}`);
  },

  getSurahVerses(surah: number): Verse[] {
    ensureReady();
    return versesBySurah.get(surah) ?? [];
  },

  getVersesByPage(page: number): Verse[] {
    ensureReady();
    return pagesIndex.get(page) ?? [];
  },

  getVersesByJuz(juz: number): Verse[] {
    ensureReady();
    return versesFlat.filter((v) => v.juz === juz);
  },

  // --- Juz ---
  getJuzStarts(): JuzStart[] {
    ensureReady();
    return juzStarts;
  },

  getJuzStart(juz: number): JuzStart | undefined {
    ensureReady();
    return juzStarts.find((j) => j.juz === juz);
  },

  // --- Location ---
  getLocation(surah: number, verse: number): QuranLocation | null {
    const v = quranData.getVerse(surah, verse);
    if (!v) return null;
    return { surah: v.surah, verse: v.verse, page: v.page, juz: v.juz };
  },

  getPageForVerse(surah: number, verse: number): number | null {
    const v = quranData.getVerse(surah, verse);
    return v ? v.page : null;
  },

  // --- Search ---
  search(query: string, limit = 50): SearchResult[] {
    ensureReady();
    const normalized = normalizeArabic(stripArabicDigits(query));
    const tokens = normalized.split(' ').filter((t) => t.length > 1);
    if (!tokens.length) return [];

    // Require every token to appear (AND search).
    let candidates: Set<string> | null = null;
    for (const token of tokens) {
      const matches = searchIndex.get(token);
      if (!matches || !matches.length) {
        candidates = null;
        break;
      }
      const keys = new Set(matches.map((m) => `${m.surah}:${m.verse}`));
      if (candidates === null) {
        candidates = keys;
      } else {
        const intersection = new Set<string>();
        for (const k of candidates) {
          if (keys.has(k)) intersection.add(k);
        }
        candidates = intersection;
      }
      if (!candidates.size) break;
    }

    if (!candidates || !candidates.size) return [];

    return [...candidates]
      .map((key) => {
        const [s, v] = key.split(':').map(Number);
        const verse = quranData.getVerse(s, v)!;
        const surah = quranData.getSurah(s)!;
        return {
          surah: s,
          verse: v,
          text: verse.text,
          surahName: surah.nameArabic,
          surahNameTransliterated: surah.nameTransliterated,
        } satisfies SearchResult;
      })
      .sort((a, b) => a.surah - b.surah || a.verse - b.verse)
      .slice(0, limit);
  },

  searchSurahs(query: string): Surah[] {
    ensureReady();
    const q = normalizeArabic(query);
    if (!q) return [];
    return surahs.filter(
      (s) =>
        normalizeArabic(s.nameArabic).includes(q) ||
        s.nameTransliterated.toLowerCase().includes(q.toLowerCase()) ||
        s.nameTranslation.toLowerCase().includes(q.toLowerCase())
    );
  },

  // --- Stats ---
  getTotalVerses(): number {
    ensureReady();
    return versesFlat.length;
  },

  getTotalSurahs(): number {
    ensureReady();
    return surahs.length;
  },
};

// ============================================
// Navigation helpers
// ============================================

export const navigation = {
  getNextVerse(surah: number, verse: number): QuranLocation | null {
    const s = quranData.getSurah(surah);
    if (!s) return null;
    if (verse < s.verseCount) return quranData.getLocation(surah, verse + 1);
    if (surah < 114) return quranData.getLocation(surah + 1, 1);
    return null;
  },

  getPrevVerse(surah: number, verse: number): QuranLocation | null {
    if (verse > 1) return quranData.getLocation(surah, verse - 1);
    if (surah > 1) {
      const prev = quranData.getSurah(surah - 1);
      if (prev) return quranData.getLocation(surah - 1, prev.verseCount);
    }
    return null;
  },
};

// ============================================
// Constants
// ============================================

export const QURAN_CONSTANTS = {
  TOTAL_SURAHS: 114,
  TOTAL_VERSES: 6236,
  TOTAL_PAGES: 604,
  TOTAL_JUZ: 30,
} as const;
