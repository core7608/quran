/**
 * Core type definitions — Quran, Reciters, Tafsir, Settings.
 *
 * Only concepts backed by real, bundled data are modelled here. Anything that
 * would require fabricated content (hizb/ruku/manzil boundaries, translations
 * intentionally not bundled, etc.) has deliberately been left out.
 */

// ============================================
// Quran Structure
// ============================================

export type RevelationType = 'meccan' | 'medinan';

export interface Surah {
  number: number; // 1-114
  nameArabic: string; // سُورَةُ الفاتحة
  nameTransliterated: string; // Al-Faatiha
  nameTranslation: string; // The Opening
  revelationType: RevelationType;
  verseCount: number;
  pageStart: number; // First Mushaf page this surah appears on
  pageEnd: number; // Last Mushaf page this surah appears on
  juzList: number[]; // Juz numbers this surah spans
}

export interface Verse {
  surah: number;
  verse: number; // Absolute verse number within the surah
  globalNumber: number; // 1-6236 across the whole Quran
  text: string; // Uthmani script
  page: number; // Mushaf page (1-604)
  juz: number; // 1-30
  sajdah: boolean;
}

// ============================================
// Navigation
// ============================================

/** Navigation modes that can be derived from the bundled data. */
export type NavigationMode = 'surah' | 'page' | 'juz';

export interface NavigationState {
  mode: NavigationMode;
  surah?: number;
  page?: number;
  juz?: number;
  verse?: number; // Scroll target within the reader
}

export interface QuranLocation {
  surah: number;
  verse: number;
  page: number;
  juz: number;
}

export interface JuzStart {
  juz: number;
  surah: number;
  verse: number;
  page: number;
}

// ============================================
// Reciters & Audio
// ============================================

/** How a reciter serves audio for a surah. */
export type ReciterMode = 'ayah' | 'surah';

export interface Reciter {
  id: string; // Provider-specific identifier (e.g. ar.alafasy)
  name: string; // Arabic name
  nameTransliterated: string;
  mode: ReciterMode; // Whether per-ayah or full-surah audio is available
  riwayah?: string;
}

export interface AudioTrack {
  reciterId: string;
  surah: number;
  verseStart?: number;
  verseEnd?: number;
  url: string;
  isDownloaded: boolean;
  localPath?: string;
}

export interface PlaybackState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  position: number; // Milliseconds
  duration: number;
  playbackRate: number;
  repeatMode: 'none' | 'verse' | 'range' | 'surah' | 'all';
  queue: AudioTrack[];
  currentIndex: number;
}

// ============================================
// Tafsir
// ============================================

export interface TafsirEdition {
  id: string;
  name: string;
  nameArabic: string;
  author: string;
  language: string;
  isBundled: boolean;
  source: string;
  license: string;
  verseCoverage: number; // Percentage of verses covered
}

export interface TafsirEntry {
  surah: number;
  verse: number;
  text: string;
  editionId: string;
}

// ============================================
// Search
// ============================================

export interface SearchResult {
  surah: number;
  verse: number;
  text: string;
  surahName: string;
  surahNameTransliterated: string;
}

// ============================================
// Bookmarks & Progress
// ============================================

export interface Bookmark {
  id: string;
  surah: number;
  verse: number;
  createdAt: number;
  note?: string;
}

export interface ReadingProgress {
  surah: number;
  verse: number;
  page: number;
  lastReadAt: number;
}

// ============================================
// Settings & Preferences
// ============================================

export interface QuranDisplaySettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  tafsirEnabled: boolean;
  tafsirSource: string; // Bundled edition id (e.g. ar.muyassar)
  translationEnabled: boolean;
  translationSource: string; // Online edition id (e.g. en.sahih)
  showVerseNumbers: boolean;
  highlightActiveVerse: boolean;
}

export interface AudioSettings {
  defaultReciterId: string;
  playbackRate: number; // 0.5 - 2.0
  repeatMode: PlaybackState['repeatMode'];
  autoPlayNext: boolean;
  backgroundPlayback: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  quranDisplay: QuranDisplaySettings;
  audio: AudioSettings;
}

// ============================================
// Downloads
// ============================================

export interface DownloadItem {
  id: string;
  type: 'audio' | 'tafsir' | 'font';
  title: string;
  progress: number; // 0-1
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  totalBytes: number;
  downloadedBytes: number;
  localPath?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// Khatmah — smart reading plan
// ============================================

export interface KhatmahPlan {
  active: boolean;
  durationDays: number; // Target number of days (e.g. 30, 60, or a custom value)
  startedAt: number; // Timestamp the plan began
  completedPages: number[]; // Unique Mushaf pages marked as read
  /** dateKey (YYYY-MM-DD) -> number of pages completed that day. */
  dailyLog: Record<string, number>;
  lastPage: number; // Last page the user was reading
  lastActivityAt: number;
  completedAt: number | null; // Set once all 604 pages are read
}

export interface KhatmahProgress {
  plan: KhatmahPlan | null;
  totalPages: number;
  completedCount: number;
  remainingCount: number;
  /** Whole days since the plan started (0-based). */
  daysElapsed: number;
  /** Days left to still finish on time (>= 0). */
  daysRemaining: number;
  /** Pages to read per remaining day to finish on time. */
  pagesPerDay: number;
  /** How many pages the plan expects to be done by the end of today. */
  todayTarget: number;
  /** Pages completed today. */
  todayDone: number;
  /** Expected completed pages by now if reading steadily. */
  expectedByNow: number;
  onTrack: boolean;
  percent: number;
}

// ============================================
// Tadabbur notebook — personal reflections
// ============================================

export interface TadabburNote {
  id: string;
  surah: number;
  verse: number;
  text: string; // The user's own reflection / benefit
  tags: string[];
  tafsirText?: string; // Optional saved tafsir text
  tafsirSource?: string; // Edition id the saved tafsir came from
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Recitation Studio
// ============================================

export interface PlaylistItem {
  surah: number;
  verseStart?: number;
  verseEnd?: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: number;
  updatedAt: number;
}

export interface SleepTimerState {
  active: boolean;
  endsAt: number | null; // Timestamp when playback should stop
  minutes: number; // Selected duration (5, 10, 15, 30, 60)
}

// ============================================
// Adhkar (remembrance)
// ============================================

export interface AdhkarItem {
  id: string;
  text: string;
  count: number; // Recommended repetitions
  source: string; // Documented source of the dhikr
  virtue?: string; // Optional reported virtue
}

export type AdhkarCollectionId = 'morning' | 'evening' | 'sleep';

export interface AdhkarCollection {
  id: AdhkarCollectionId;
  title: string;
  subtitle: string;
  source: string; // Overall source note for the collection
  items: AdhkarItem[];
}

// ============================================
// Prayer center
// ============================================

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerCalcMethod =
  | 'MWL'
  | 'ISNA'
  | 'Egypt'
  | 'Makkah'
  | 'Karachi'
  | 'Tehran'
  | 'Jafari';

export type HighLatitudeRule = 'none' | 'middleOfTheNight' | 'seventhOfTheNight' | 'angleBased';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface PrayerSettings {
  method: PrayerCalcMethod;
  asrMethod: 'standard' | 'hanafi';
  highLatitudeRule: HighLatitudeRule;
  /** Per-prayer manual adjustment in minutes. */
  adjustments: Partial<Record<PrayerName, number>>;
  location: GeoLocation | null;
  useAutoLocation: boolean;
  timezone: string | null; // IANA name, e.g. "Africa/Cairo"
  notificationsEnabled: boolean;
}

export interface PrayerTimesResult {
  /** Local calendar date (YYYY-MM-DD) the times belong to. */
  date: string;
  /** Timestamps in ms for each prayer. */
  times: Record<PrayerName, number>;
}

// ============================================
// Advanced search
// ============================================

export type SearchScope = 'quran' | 'tafsir' | 'notes';

export interface AdvancedSearchOptions {
  matchMode: 'all' | 'any' | 'phrase';
  ignoreDiacritics: boolean;
  scope: SearchScope;
}

// ============================================
// Offline content manager
// ============================================

export type OfflineCategory = 'mushaf' | 'tafsir' | 'audio' | 'content';

export interface OfflineAssetInfo {
  id: string;
  category: OfflineCategory;
  title: string;
  bytes: number;
  status: 'bundled' | 'downloaded' | 'partial' | 'remote';
  localPath?: string;
}

// ============================================
// Mushaf page layout (QCF Madani)
// ============================================

export interface MushafSurahHeaderLine {
  t: 's';
  s: number; // surah number
  n: string; // header glyph string
}

export interface MushafBasmalaLine {
  t: 'b';
  g: string; // basmala glyph string
  w: number; // natural width, in em, at font-size 1
  h: number; // natural height, in em, at font-size 1
  c: number; // ink-centre offset from baseline, in em
}

export interface MushafAyahLine {
  t: 'a';
  c?: number; // present when the line should be centred
  g: string[]; // glyph strings, one per word
  r: [number, number, number][]; // [surah, ayah, wordCount] runs
}

export type MushafLine = MushafSurahHeaderLine | MushafBasmalaLine | MushafAyahLine;

export interface MushafPageLayout {
  l: MushafLine[];
}

// ============================================
// Renad Moment
// ============================================

export interface RenadMomentState {
  hasSeenAnimation: boolean;
  personalNotes: string;
  lastVisitedAt: number;
  playCount: number;
  /** The verse the user chose to keep, if any. */
  favoriteSurah?: number;
  favoriteVerse?: number;
}
