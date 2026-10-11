/**
 * Unified storage layer — MMKV on native, AsyncStorage on web, with automatic
 * platform detection. Everything is stored as JSON strings.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AppSettings,
  AudioSettings,
  Bookmark,
  DownloadItem,
  KhatmahPlan,
  Playlist,
  PrayerSettings,
  QuranDisplaySettings,
  ReadingProgress,
  RenadMomentState,
  TadabburNote,
} from '@/types';

// MMKV for native (fast, synchronous)
let MMKVStorage: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    MMKVStorage = new MMKV();
  } catch {
    // MMKV unavailable — fall back to AsyncStorage
  }
}

// ============================================
// Storage adapter
// ============================================

interface StorageAdapter {
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  delete(key: string): void;
  clearAll(): void;
  getAllKeys(): string[];
}

const createAdapter = (): StorageAdapter => {
  if (MMKVStorage) {
    return {
      getString: (key) => MMKVStorage.getString(key) ?? undefined,
      setString: (key, value) => MMKVStorage.set(key, value),
      delete: (key) => MMKVStorage.delete(key),
      clearAll: () => MMKVStorage.clearAll(),
      getAllKeys: () => MMKVStorage.getAllKeys(),
    };
  }

  // Web fallback — AsyncStorage behind a synchronous read cache.
  const cache = new Map<string, string>();
  let hydrated = false;

  const hydrate = async () => {
    if (hydrated) return;
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([k, v]) => {
      if (v != null) cache.set(k, v);
    });
    hydrated = true;
  };

  return {
    getString: (key) => {
      if (!hydrated) void hydrate();
      return cache.get(key);
    },
    setString: (key, value) => {
      cache.set(key, value);
      void AsyncStorage.setItem(key, value);
    },
    delete: (key) => {
      cache.delete(key);
      void AsyncStorage.removeItem(key);
    },
    clearAll: () => {
      cache.clear();
      void AsyncStorage.clear();
    },
    getAllKeys: () => Array.from(cache.keys()),
  };
};

const adapter = createAdapter();

// ============================================
// Typed storage keys
// ============================================

export const STORAGE_KEYS = {
  settings: 'app:settings',
  quranDisplay: 'app:quranDisplay',
  audioSettings: 'app:audioSettings',
  theme: 'app:theme',
  lastRead: 'quran:lastRead',
  readingProgress: 'quran:progress',
  bookmarks: 'quran:bookmarks',
  downloadQueue: 'downloads:queue',
  renadState: 'renad:state',
  khatmah: 'khatmah:plan',
  notes: 'tadabbur:notes',
  playlists: 'studio:playlists',
  resumePlayback: 'studio:resume',
  adhkarProgress: 'adhkar:progress',
  prayerSettings: 'prayer:settings',
} as const;

// ============================================
// Generic helpers
// ============================================

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const value = adapter.getString(key);
      if (value === undefined) return defaultValue;
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      adapter.setString(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Storage set error for ${key}:`, e);
    }
  },

  remove(key: string): void {
    adapter.delete(key);
  },

  clear(): void {
    adapter.clearAll();
  },

  secure: {
    async get(key: string): Promise<string | null> {
      if (Platform.OS === 'web') return AsyncStorage.getItem(`secure:${key}`);
      return SecureStore.getItemAsync(key);
    },
    async set(key: string, value: string): Promise<void> {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(`secure:${key}`, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    },
    async delete(key: string): Promise<void> {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(`secure:${key}`);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    },
  },
};

// ============================================
// Domain helpers
// ============================================

export const settingsStorage = {
  getAll: (): AppSettings => storage.get(STORAGE_KEYS.settings, getDefaultSettings()),
  setAll: (settings: AppSettings) => storage.set(STORAGE_KEYS.settings, settings),
  getQuranDisplay: (): QuranDisplaySettings =>
    storage.get(STORAGE_KEYS.quranDisplay, getDefaultQuranDisplay()),
  setQuranDisplay: (s: QuranDisplaySettings) => storage.set(STORAGE_KEYS.quranDisplay, s),
  getAudio: (): AudioSettings => storage.get(STORAGE_KEYS.audioSettings, getDefaultAudioSettings()),
  setAudio: (s: AudioSettings) => storage.set(STORAGE_KEYS.audioSettings, s),
  getTheme: (): AppSettings['theme'] => storage.get(STORAGE_KEYS.theme, 'system'),
  setTheme: (t: AppSettings['theme']) => storage.set(STORAGE_KEYS.theme, t),
};

export const quranStorage = {
  getLastRead: (): ReadingProgress | null => storage.get(STORAGE_KEYS.lastRead, null),
  setLastRead: (progress: ReadingProgress) => storage.set(STORAGE_KEYS.lastRead, progress),
  getProgress: (): ReadingProgress[] => storage.get(STORAGE_KEYS.readingProgress, []),
  addProgress: (progress: ReadingProgress) => {
    const list = quranStorage
      .getProgress()
      .filter((p) => !(p.surah === progress.surah && p.verse === progress.verse));
    list.unshift(progress);
    storage.set(STORAGE_KEYS.readingProgress, list.slice(0, 50));
  },

  getBookmarks: (): Bookmark[] => storage.get(STORAGE_KEYS.bookmarks, []),
  isBookmarked: (surah: number, verse: number): boolean =>
    quranStorage.getBookmarks().some((b) => b.surah === surah && b.verse === verse),
  toggleBookmark: (bookmark: Bookmark) => {
    const list = quranStorage.getBookmarks();
    const exists = list.some((b) => b.surah === bookmark.surah && b.verse === bookmark.verse);
    if (exists) {
      storage.set(
        STORAGE_KEYS.bookmarks,
        list.filter((b) => !(b.surah === bookmark.surah && b.verse === bookmark.verse))
      );
    } else {
      storage.set(STORAGE_KEYS.bookmarks, [bookmark, ...list]);
    }
  },
  removeBookmark: (id: string) => {
    storage.set(
      STORAGE_KEYS.bookmarks,
      quranStorage.getBookmarks().filter((b) => b.id !== id)
    );
  },
};

export const downloadStorage = {
  getQueue: (): DownloadItem[] => storage.get(STORAGE_KEYS.downloadQueue, []),
  setQueue: (queue: DownloadItem[]) => storage.set(STORAGE_KEYS.downloadQueue, queue),
  upsert: (item: DownloadItem) => {
    const queue = downloadStorage.getQueue();
    const idx = queue.findIndex((d) => d.id === item.id);
    if (idx >= 0) queue[idx] = item;
    else queue.push(item);
    downloadStorage.setQueue(queue);
  },
  remove: (id: string) => {
    downloadStorage.setQueue(downloadStorage.getQueue().filter((d) => d.id !== id));
  },
};

export const renadStorage = {
  get: (): RenadMomentState =>
    storage.get(STORAGE_KEYS.renadState, {
      hasSeenAnimation: false,
      personalNotes: '',
      lastVisitedAt: 0,
      playCount: 0,
    }),
  set: (state: RenadMomentState) => storage.set(STORAGE_KEYS.renadState, state),
  updateNotes: (notes: string) => {
    const state = renadStorage.get();
    renadStorage.set({ ...state, personalNotes: notes });
  },
  setFavorite: (surah?: number, verse?: number) => {
    const state = renadStorage.get();
    renadStorage.set({ ...state, favoriteSurah: surah, favoriteVerse: verse });
  },
};

export const khatmahStorage = {
  getPlan: (): KhatmahPlan | null => storage.get<KhatmahPlan | null>(STORAGE_KEYS.khatmah, null),
  setPlan: (plan: KhatmahPlan | null) => {
    if (plan === null) storage.remove(STORAGE_KEYS.khatmah);
    else storage.set(STORAGE_KEYS.khatmah, plan);
  },
};

export const notesStorage = {
  getAll: (): TadabburNote[] => storage.get(STORAGE_KEYS.notes, []),
  getForVerse: (surah: number, verse: number): TadabburNote[] =>
    notesStorage.getAll().filter((n) => n.surah === surah && n.verse === verse),
  upsert: (note: TadabburNote) => {
    const list = notesStorage.getAll().filter((n) => n.id !== note.id);
    storage.set(STORAGE_KEYS.notes, [note, ...list]);
  },
  remove: (id: string) => {
    storage.set(
      STORAGE_KEYS.notes,
      notesStorage.getAll().filter((n) => n.id !== id)
    );
  },
  removeForVerse: (surah: number, verse: number) => {
    storage.set(
      STORAGE_KEYS.notes,
      notesStorage.getAll().filter((n) => !(n.surah === surah && n.verse === verse))
    );
  },
  getAllTags: (): string[] => {
    const tags = new Set<string>();
    notesStorage.getAll().forEach((n) => n.tags.forEach((t) => tags.add(t)));
    return [...tags].sort((a, b) => a.localeCompare(b, 'ar'));
  },
};

export const playlistsStorage = {
  getAll: (): Playlist[] => storage.get(STORAGE_KEYS.playlists, []),
  setAll: (playlists: Playlist[]) => storage.set(STORAGE_KEYS.playlists, playlists),
  upsert: (playlist: Playlist) => {
    const list = playlistsStorage.getAll().filter((p) => p.id !== playlist.id);
    playlistsStorage.setAll([playlist, ...list]);
  },
  remove: (id: string) => {
    playlistsStorage.setAll(playlistsStorage.getAll().filter((p) => p.id !== id));
  },
};

/** Persisted "resume" pointer for the Recitation Studio. */
export interface ResumePlayback {
  reciterId: string;
  surah: number;
  verse?: number;
  playlistId?: string;
  at: number;
}

export const resumeStorage = {
  get: (): ResumePlayback | null => storage.get<ResumePlayback | null>(STORAGE_KEYS.resumePlayback, null),
  set: (resume: ResumePlayback) => storage.set(STORAGE_KEYS.resumePlayback, resume),
  clear: () => storage.remove(STORAGE_KEYS.resumePlayback),
};

/** Per-collection adhkar counter progress. */
export interface AdhkarProgress {
  /** Map of `${collectionId}:${itemId}` -> current count. */
  counts: Record<string, number>;
  /** Map of `${collectionId}:${itemId}` -> repetitions completed (session target). */
  completed: Record<string, boolean>;
  lastCollection?: string;
  updatedAt: number;
}

export const adhkarStorage = {
  get: (): AdhkarProgress =>
    storage.get(STORAGE_KEYS.adhkarProgress, { counts: {}, completed: {}, updatedAt: 0 }),
  set: (progress: AdhkarProgress) => storage.set(STORAGE_KEYS.adhkarProgress, progress),
};

export const prayerStorage = {
  get: (): PrayerSettings => storage.get(STORAGE_KEYS.prayerSettings, getDefaultPrayerSettings()),
  set: (settings: PrayerSettings) => storage.set(STORAGE_KEYS.prayerSettings, settings),
};

// ============================================
// Defaults
// ============================================

export function getDefaultSettings(): AppSettings {
  return {
    theme: 'system',
    quranDisplay: getDefaultQuranDisplay(),
    audio: getDefaultAudioSettings(),
  };
}

export function getDefaultQuranDisplay(): QuranDisplaySettings {
  return {
    fontSize: 'medium',
    tafsirEnabled: false,
    tafsirSource: 'ar.muyassar',
    translationEnabled: false,
    translationSource: 'en.sahih',
    showVerseNumbers: true,
    highlightActiveVerse: true,
  };
}

export function getDefaultAudioSettings(): AudioSettings {
  return {
    defaultReciterId: 'ar.alafasy',
    playbackRate: 1.0,
    repeatMode: 'none',
    autoPlayNext: true,
    backgroundPlayback: true,
  };
}

export function getDefaultPrayerSettings(): PrayerSettings {
  return {
    method: 'MWL',
    asrMethod: 'standard',
    highLatitudeRule: 'none',
    adjustments: {},
    location: null,
    useAutoLocation: false,
    timezone: null,
    notificationsEnabled: false,
  };
}
