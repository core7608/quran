/**
 * Reciter catalogue and audio URL builders.
 *
 * Catalogue is a curated set of 22 recitations served by AlQuran Cloud
 * (https://api.alquran.cloud / https://cdn.islamic.network). Audio is streamed
 * on demand — no recitation data is bundled with the app.
 *
 * Reciters with `mode: 'ayah'` expose per-verse audio; `mode: 'surah'` expose a
 * single file for the whole surah.
 */

import type { Reciter, AudioTrack } from '@/types';

// ============================================
// Catalogue
// ============================================

export const RECITERS: Reciter[] = [
  { id: 'ar.alafasy', name: 'مشاري راشد العفاسي', nameTransliterated: 'Mishary Alafasy', mode: 'ayah' },
  { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس', nameTransliterated: 'Abdurrahmaan As-Sudais', mode: 'ayah' },
  { id: 'ar.mahermuaiqly', name: 'ماهر المعيقلي', nameTransliterated: 'Maher Al Muaiqly', mode: 'ayah' },
  { id: 'ar.husary', name: 'محمود خليل الحصري', nameTransliterated: 'Mahmoud Khalil Al-Husary', mode: 'ayah' },
  { id: 'ar.abdulsamad', name: 'عبد الباسط عبد الصمد', nameTransliterated: 'Abdul Basit Abdus Samad', mode: 'ayah' },
  { id: 'ar.minshawi', name: 'محمد صديق المنشاوي', nameTransliterated: 'Muhammad Siddiq Al-Minshawi', mode: 'ayah' },
  { id: 'ar.ahmedajamy', name: 'أحمد بن علي العجمي', nameTransliterated: 'Ahmed ibn Ali Al-Ajamy', mode: 'ayah' },
  { id: 'ar.shaatree', name: 'أبو بكر الشاطري', nameTransliterated: 'Abu Bakr Ash-Shaatree', mode: 'ayah' },
  { id: 'ar.hudhaify', name: 'علي بن عبد الرحمن الحذيفي', nameTransliterated: 'Ali Al-Hudhaify', mode: 'ayah' },
  { id: 'ar.saoodshuraym', name: 'سعود الشريم', nameTransliterated: 'Saud Ash-Shuraym', mode: 'ayah' },
  { id: 'ar.muhammadayyoub', name: 'محمد أيوب', nameTransliterated: 'Muhammad Ayyub', mode: 'ayah' },
  { id: 'ar.muhammadjibreel', name: 'محمد جبريل', nameTransliterated: 'Muhammad Jibreel', mode: 'ayah' },
  { id: 'ar.hanirifai', name: 'هاني الرفاعي', nameTransliterated: 'Hani Ar-Rifai', mode: 'ayah' },
  { id: 'ar.ibrahimakhbar', name: 'إبراهيم الأخضر', nameTransliterated: 'Ibrahim Al-Akhdar', mode: 'ayah' },
  { id: 'ar.abdullahbasfar', name: 'عبد الله بصفر', nameTransliterated: 'Abdullah Basfar', mode: 'ayah' },
  { id: 'ar.parhizgar', name: 'پرهیزگار', nameTransliterated: 'Parhizgar', mode: 'ayah' },
  { id: 'ar.aymanswoaid', name: 'أيمن سويد', nameTransliterated: 'Ayman Sowaid', mode: 'ayah' },
  { id: 'ar.faresabbad', name: 'فارس عباد', nameTransliterated: 'Fares Abbad', mode: 'surah' },
  { id: 'ar.yasseraldossari', name: 'ياسر الدوسري', nameTransliterated: 'Yasser Al-Dosari', mode: 'surah' },
  { id: 'ar.nasseralqatami', name: 'ناصر القطامي', nameTransliterated: 'Nasser Al Qatami', mode: 'surah' },
  { id: 'ar.mustafaismail', name: 'مصطفى إسماعيل', nameTransliterated: 'Mustafa Ismail', mode: 'surah' },
  { id: 'ar.omaralkazabri', name: 'عمر القزابري', nameTransliterated: 'Omar Al-Kazabri', mode: 'surah' },
];

const RECITER_BY_ID = new Map(RECITERS.map((r) => [r.id, r]));

const AUDIO_CDN = 'https://cdn.islamic.network/quran';

// ============================================
// Helpers
// ============================================

export function getReciter(id: string): Reciter | undefined {
  return RECITER_BY_ID.get(id);
}

export function getDefaultReciter(): Reciter {
  return RECITERS[0];
}

/** Per-verse audio URL. `globalNumber` is the 1-6236 position of the verse. */
export function getAyahAudioUrl(reciterId: string, globalNumber: number): string {
  return `${AUDIO_CDN}/audio/128/${reciterId}/${globalNumber}.mp3`;
}

/** Full-surah audio URL. */
export function getSurahAudioUrl(reciterId: string, surah: number): string {
  return `${AUDIO_CDN}/audio-surah/128/${reciterId}/${surah}.mp3`;
}

// ============================================
// Track builders
// ============================================

export function buildSurahTrack(reciterId: string, surah: number): AudioTrack {
  const reciter = getReciter(reciterId);
  const url = reciter?.mode === 'surah' ? getSurahAudioUrl(reciterId, surah) : getAyahAudioUrl(reciterId, 1);
  return { reciterId, surah, url, isDownloaded: false };
}

export function buildVerseTrack(reciterId: string, surah: number, verse: number, globalNumber: number): AudioTrack {
  const reciter = getReciter(reciterId);
  const url = reciter?.mode === 'surah' ? getSurahAudioUrl(reciterId, surah) : getAyahAudioUrl(reciterId, globalNumber);
  return { reciterId, surah, verseStart: verse, verseEnd: verse, url, isDownloaded: false };
}

export const recitersApi = {
  async getAll(): Promise<Reciter[]> {
    return RECITERS;
  },
  async getById(id: string): Promise<Reciter | null> {
    return getReciter(id) ?? null;
  },
  search(query: string): Reciter[] {
    const q = query.trim().toLowerCase();
    if (!q) return RECITERS;
    return RECITERS.filter(
      (r) =>
        r.name.includes(query.trim()) ||
        r.nameTransliterated.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  },
};
