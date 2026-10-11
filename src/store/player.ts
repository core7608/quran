/**
 * Quran audio player store (zustand).
 *
 * Wraps the platform audio engine (`getAudioPlayer`) and exposes a
 * React-friendly state/actions API: queue, repeat modes, transport controls,
 * and progress sync. Also wires up web Media Session metadata/position.
 */

import { create } from 'zustand';
import {
  getAudioPlayer,
  setupMediaSession,
  updateMediaSessionPosition,
  type AudioEngine,
  type TrackMetadata,
} from '@/platform/audio';
import type { AudioTrack, PlaybackState } from '@/types';

interface PlayerStore extends PlaybackState {
  error: string | null;
  isBuffering: boolean;
  init(): void;
  playTrack(track: AudioTrack, queue?: AudioTrack[], meta?: TrackMetadata): Promise<void>;
  togglePlay(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setRate(rate: number): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  setRepeatMode(mode: PlaybackState['repeatMode']): void;
  stop(): Promise<void>;
}

let engine: AudioEngine | null = null;

const initialState: PlaybackState = {
  currentTrack: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  playbackRate: 1.0,
  repeatMode: 'none',
  queue: [],
  currentIndex: -1,
};

export const usePlayer = create<PlayerStore>((set, get) => ({
  ...initialState,
  error: null,
  isBuffering: false,

  init() {
    if (engine) return;
    engine = getAudioPlayer();
    engine.subscribe((event) => {
      switch (event.type) {
        case 'state':
          set({ ...event.state });
          break;
        case 'progress':
          set({ position: event.position, duration: event.duration });
          updateMediaSessionPosition(get());
          break;
        case 'buffering':
          set({ isBuffering: event.isBuffering });
          break;
        case 'ended': {
          const { repeatMode, queue, currentIndex } = get();
          if (repeatMode === 'verse' || repeatMode === 'range') {
            void getAudioPlayer().seek(0);
            void getAudioPlayer().play();
          } else if (repeatMode === 'surah' || repeatMode === 'all') {
            const next = queue[currentIndex + 1];
            if (next) {
              void get().playTrack(next, queue);
            } else if (repeatMode === 'all' && queue.length > 0) {
              void get().playTrack(queue[0], queue);
            } else {
              set({ isPlaying: false, position: 0 });
            }
          } else {
            const next = queue[currentIndex + 1];
            if (next) {
              void get().playTrack(next, queue);
            } else {
              set({ isPlaying: false, position: 0 });
            }
          }
          break;
        }
        case 'error':
          set({ error: event.error, isPlaying: false });
          break;
      }
    });
  },

  async playTrack(track: AudioTrack, queue?: AudioTrack[], meta?: TrackMetadata) {
    if (!engine) get().init();
    const engineRef = engine ?? getAudioPlayer();
    const list = queue && queue.length ? queue : [track];
    set({
      currentTrack: track,
      queue: list,
      currentIndex: list.findIndex((t) => t.url === track.url),
      isPlaying: true,
      isBuffering: true,
      error: null,
      position: 0,
    });
    await setupMediaSession(track, { ...get(), currentTrack: track });
    await engineRef.load(track, meta);
    await engineRef.play();
  },

  async togglePlay() {
    if (get().isPlaying) await get().pause();
    else await get().play();
  },

  async play() {
    if (!engine) get().init();
    if (!engine) return;
    if (!get().currentTrack) return;
    await engine.play();
    set({ isPlaying: true, error: null });
  },

  async pause() {
    if (!engine) get().init();
    if (!engine) return;
    await engine.pause();
    set({ isPlaying: false });
  },

  async seek(positionMs: number) {
    if (!engine) get().init();
    if (!engine) return;
    await engine.seek(positionMs);
  },

  async setRate(rate: number) {
    if (!engine) get().init();
    if (!engine) return;
    await engine.setRate(rate);
    set({ playbackRate: rate });
  },

  async next() {
    const { queue, currentIndex } = get();
    if (!engine) return;
    const result = await engine.skipNext(queue, currentIndex);
    if (result) {
      set({ currentTrack: result.track, currentIndex: result.index });
    } else if (get().repeatMode === 'all' && queue.length > 0) {
      await get().playTrack(queue[0], queue);
    }
  },

  async previous() {
    const { queue, currentIndex } = get();
    if (!engine) return;
    const result = await engine.skipPrevious(queue, currentIndex);
    if (result) {
      set({ currentTrack: result.track, currentIndex: result.index });
    }
  },

  setRepeatMode(mode: PlaybackState['repeatMode']) {
    set({ repeatMode: mode });
  },

  async stop() {
    if (!engine) return;
    await engine.unload();
    set({ ...initialState, error: null, isBuffering: false });
  },
}));

/** Call once at app start so playback events flow into the store. */
export function initPlayerStore(): void {
  usePlayer.getState().init();
}