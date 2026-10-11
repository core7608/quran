/**
 * Platform-specific Audio Adapter
 *
 * - Native (Android/iOS): `expo-audio` `createAudioPlayer` + `setAudioModeAsync`
 *   with lock-screen / background-playback support.
 * - Web (PWA): native `HTMLAudioElement` (via `window.Audio`) + Media Session API.
 *
 * The rest of the app talks to the unified `AudioEngine` interface below.
 * Times are exposed in milliseconds; expo-audio reports seconds internally.
 */

import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import type { AudioTrack } from '@/types';

// ============================================
// Types
// ============================================

export interface AudioPlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  position: number; // ms
  duration: number; // ms
  playbackRate: number;
  isBuffering: boolean;
  error: string | null;
}

export type AudioPlayerEvent =
  | { type: 'state'; state: Partial<AudioPlayerState> }
  | { type: 'ended'; track: AudioTrack }
  | { type: 'error'; error: string; track: AudioTrack | null }
  | { type: 'buffering'; isBuffering: boolean }
  | { type: 'progress'; position: number; duration: number };

export interface TrackMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
}

type EventListener = (event: AudioPlayerEvent) => void;

export interface AudioEngine {
  subscribe(listener: EventListener): () => void;
  getState(): AudioPlayerState;
  load(track: AudioTrack, meta?: TrackMetadata): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setRate(rate: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  unload(): Promise<void>;
  skipNext(queue: AudioTrack[], currentIndex: number): Promise<{ track: AudioTrack; index: number } | null>;
  skipPrevious(queue: AudioTrack[], currentIndex: number): Promise<{ track: AudioTrack; index: number } | null>;
  /** Toggles lock-screen / background playback integration on native. */
  setBackgroundPlayback(enabled: boolean): void;
}

const INITIAL_STATE: AudioPlayerState = {
  currentTrack: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  playbackRate: 1.0,
  isBuffering: false,
  error: null,
};

// ============================================
// Native Implementation (expo-audio)
// ============================================

class NativeAudioPlayer implements AudioEngine {
  private player: AudioPlayer | null = null;
  private statusSub: { remove(): void } | null = null;
  private listeners = new Set<EventListener>();
  private currentTrack: AudioTrack | null = null;
  private state: AudioPlayerState = { ...INITIAL_STATE };
  private backgroundPlayback = true;

  constructor() {
    this.configureAudioMode();
  }

  private async configureAudioMode(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix', // required for lock-screen controls
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
    } catch (e) {
      console.warn('Audio mode config failed:', e);
    }
  }

  private emit(event: AudioPlayerEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  private updateState(partial: Partial<AudioPlayerState>): void {
    this.state = { ...this.state, ...partial };
    this.emit({ type: 'state', state: partial });
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): AudioPlayerState {
    return { ...this.state };
  }

  setBackgroundPlayback(enabled: boolean): void {
    this.backgroundPlayback = enabled;
  }

  private teardownPlayer(): void {
    if (this.statusSub) {
      this.statusSub.remove();
      this.statusSub = null;
    }
    if (this.player) {
      try {
        this.player.pause();
        this.player.clearLockScreenControls();
        this.player.remove();
      } catch {
        // Already released
      }
      this.player = null;
    }
  }

  private handleStatus(status: AudioStatus): void {
    if (status.error) {
      this.updateState({ error: status.error, isBuffering: false });
      this.emit({ type: 'error', error: status.error, track: this.currentTrack });
      return;
    }
    const position = status.currentTime * 1000;
    const duration = status.duration * 1000;
    this.updateState({
      position,
      duration,
      isPlaying: status.playing,
      isBuffering: status.isBuffering || (!status.isLoaded && !status.playing),
    });
    this.emit({ type: 'progress', position, duration });

    if (status.didJustFinish) {
      this.updateState({ isPlaying: false, position: duration });
      if (this.currentTrack) this.emit({ type: 'ended', track: this.currentTrack });
    }
  }

  async load(track: AudioTrack, meta?: TrackMetadata): Promise<void> {
    try {
      this.updateState({ isBuffering: true, error: null, currentTrack: track });
      this.currentTrack = track;
      this.teardownPlayer();

      const player = createAudioPlayer(
        { uri: track.localPath || track.url },
        { updateInterval: 250 }
      );
      this.player = player;
      player.setPlaybackRate(this.state.playbackRate);
      this.statusSub = player.addListener('playbackStatusUpdate', (status) => this.handleStatus(status));

      if (this.backgroundPlayback) {
        player.setActiveForLockScreen(true, {
          title: meta?.title ?? `سورة ${track.surah}`,
          artist: meta?.artist ?? track.reciterId,
          albumTitle: meta?.album ?? 'القرآن الكريم',
          artworkUrl: meta?.artworkUrl,
        });
      }

      this.updateState({ isBuffering: false });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load audio';
      this.updateState({ error: msg, isBuffering: false });
      this.emit({ type: 'error', error: msg, track });
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.player) return;
    try {
      this.player.play();
      this.updateState({ isPlaying: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Playback failed';
      this.updateState({ error: msg });
      this.emit({ type: 'error', error: msg, track: this.currentTrack });
    }
  }

  async pause(): Promise<void> {
    if (!this.player) return;
    try {
      this.player.pause();
      this.updateState({ isPlaying: false });
    } catch (error) {
      console.warn('Pause failed:', error);
    }
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.player) return;
    try {
      await this.player.seekTo(positionMs / 1000);
      this.updateState({ position: positionMs });
    } catch (error) {
      console.warn('Seek failed:', error);
    }
  }

  async setRate(rate: number): Promise<void> {
    if (!this.player) return;
    try {
      this.player.setPlaybackRate(rate);
      this.updateState({ playbackRate: rate });
    } catch (error) {
      console.warn('Set rate failed:', error);
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.player) return;
    try {
      this.player.volume = volume;
    } catch (error) {
      console.warn('Set volume failed:', error);
    }
  }

  async unload(): Promise<void> {
    this.teardownPlayer();
    this.currentTrack = null;
    this.state = { ...INITIAL_STATE };
    this.emit({ type: 'state', state: { ...INITIAL_STATE } });
  }

  async skipNext(queue: AudioTrack[], currentIndex: number): Promise<{ track: AudioTrack; index: number } | null> {
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      const nextTrack = queue[nextIndex];
      await this.load(nextTrack);
      await this.play();
      return { track: nextTrack, index: nextIndex };
    }
    return null;
  }

  async skipPrevious(queue: AudioTrack[], currentIndex: number): Promise<{ track: AudioTrack; index: number } | null> {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevTrack = queue[prevIndex];
      await this.load(prevTrack);
      await this.play();
      return { track: prevTrack, index: prevIndex };
    }
    return null;
  }
}

// ============================================
// Web Implementation (HTMLAudioElement)
// ============================================

class WebAudioPlayer implements AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<EventListener>();
  private currentTrack: AudioTrack | null = null;
  private state: AudioPlayerState = { ...INITIAL_STATE };
  private backgroundPlayback = true;

  private emit(event: AudioPlayerEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  private updateState(partial: Partial<AudioPlayerState>): void {
    this.state = { ...this.state, ...partial };
    this.emit({ type: 'state', state: partial });
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): AudioPlayerState {
    return { ...this.state };
  }

  setBackgroundPlayback(enabled: boolean): void {
    this.backgroundPlayback = enabled;
  }

  private detach(): void {
    const a = this.audio;
    if (!a) return;
    a.pause();
    a.src = '';
    a.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
    a.removeEventListener('timeupdate', this.handleTimeUpdate);
    a.removeEventListener('ended', this.handleEnded);
    a.removeEventListener('error', this.handleError);
    a.removeEventListener('waiting', this.handleWaiting);
    a.removeEventListener('canplay', this.handleCanPlay);
    this.audio = null;
  }

  async load(track: AudioTrack, _meta?: TrackMetadata): Promise<void> {
    try {
      this.updateState({ isBuffering: true, error: null, currentTrack: track });
      this.currentTrack = track;
      this.detach();

      // `window.Audio` — the module-level `AudioPlayerState` name shadows `Audio`.
      const audio = new window.Audio(track.localPath || track.url);
      audio.crossOrigin = 'anonymous';
      audio.preload = 'metadata';
      audio.playbackRate = this.state.playbackRate;

      audio.addEventListener('loadedmetadata', this.handleLoadedMetadata);
      audio.addEventListener('timeupdate', this.handleTimeUpdate);
      audio.addEventListener('ended', this.handleEnded);
      audio.addEventListener('error', this.handleError);
      audio.addEventListener('waiting', this.handleWaiting);
      audio.addEventListener('canplay', this.handleCanPlay);

      this.audio = audio;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load audio';
      this.updateState({ error: msg, isBuffering: false });
      this.emit({ type: 'error', error: msg, track });
      throw error;
    }
  }

  private handleLoadedMetadata = (): void => {
    if (!this.audio) return;
    this.updateState({ duration: this.audio.duration * 1000, isBuffering: false });
  };

  private handleTimeUpdate = (): void => {
    if (!this.audio) return;
    const position = this.audio.currentTime * 1000;
    this.updateState({ position });
    this.emit({ type: 'progress', position, duration: this.state.duration });
  };

  private handleEnded = (): void => {
    this.updateState({ isPlaying: false, position: this.state.duration });
    if (this.currentTrack) this.emit({ type: 'ended', track: this.currentTrack });
  };

  private handleError = (e: Event): void => {
    const error = (e.target as HTMLAudioElement | null)?.error?.message || 'Audio playback error';
    this.updateState({ error, isBuffering: false, isPlaying: false });
    this.emit({ type: 'error', error, track: this.currentTrack });
  };

  private handleWaiting = (): void => {
    this.updateState({ isBuffering: true });
    this.emit({ type: 'buffering', isBuffering: true });
  };

  private handleCanPlay = (): void => {
    this.updateState({ isBuffering: false });
    this.emit({ type: 'buffering', isBuffering: false });
  };

  async play(): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.play();
      this.updateState({ isPlaying: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Playback failed';
      this.updateState({ error: msg });
      this.emit({ type: 'error', error: msg, track: this.currentTrack });
    }
  }

  async pause(): Promise<void> {
    if (!this.audio) return;
    this.audio.pause();
    this.updateState({ isPlaying: false });
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.audio) return;
    this.audio.currentTime = positionMs / 1000;
    this.updateState({ position: positionMs });
  }

  async setRate(rate: number): Promise<void> {
    if (!this.audio) return;
    this.audio.playbackRate = rate;
    this.updateState({ playbackRate: rate });
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.audio) return;
    this.audio.volume = volume;
  }

  async unload(): Promise<void> {
    this.detach();
    this.currentTrack = null;
    this.state = { ...INITIAL_STATE };
    this.emit({ type: 'state', state: { ...INITIAL_STATE } });
  }

  async skipNext(queue: AudioTrack[], currentIndex: number): Promise<{ track: AudioTrack; index: number } | null> {
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      const nextTrack = queue[nextIndex];
      await this.load(nextTrack);
      await this.play();
      return { track: nextTrack, index: nextIndex };
    }
    return null;
  }

  async skipPrevious(queue: AudioTrack[], currentIndex: number): Promise<{ track: AudioTrack; index: number } | null> {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevTrack = queue[prevIndex];
      await this.load(prevTrack);
      await this.play();
      return { track: prevTrack, index: prevIndex };
    }
    return null;
  }
}

// ============================================
// Factory & Export
// ============================================

let audioEngineInstance: AudioEngine | null = null;

export function getAudioPlayer(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = Platform.OS === 'web' ? new WebAudioPlayer() : new NativeAudioPlayer();
  }
  return audioEngineInstance;
}

export function destroyAudioPlayer(): void {
  if (audioEngineInstance) {
    void audioEngineInstance.unload();
    audioEngineInstance = null;
  }
}

// ============================================
// Media Session (Web lockscreen/media keys)
// ============================================

export async function setupMediaSession(track: AudioTrack, state: AudioPlayerState): Promise<void> {
  if (Platform.OS === 'web' && 'mediaSession' in navigator) {
    try {
      const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
      if (!ms) return;
      ms.metadata = new MediaMetadata({
        title: `Surah ${track.surah}`,
        artist: track.reciterId,
        album: 'Quran',
        artwork: [],
      });

      ms.setActionHandler('play', () => {
        void getAudioPlayer().play();
      });
      ms.setActionHandler('pause', () => {
        void getAudioPlayer().pause();
      });
      ms.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          void getAudioPlayer().seek(details.seekTime * 1000);
        }
      });
      ms.setActionHandler('previoustrack', () => {
        /* handled by the store */
      });
      ms.setActionHandler('nexttrack', () => {
        /* handled by the store */
      });

      ms.playbackState = state.isPlaying ? 'playing' : 'paused';
    } catch (e) {
      console.warn('Media Session setup failed:', e);
    }
  }
}

export function updateMediaSessionPosition(state: AudioPlayerState): void {
  if (Platform.OS === 'web' && 'mediaSession' in navigator) {
    try {
      const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
      if (!ms || ms.playbackState !== 'playing') return;
      ms.setPositionState({
        duration: state.duration / 1000,
        playbackRate: state.playbackRate,
        position: state.position / 1000,
      });
    } catch {
      // Not supported in some browsers
    }
  }
}