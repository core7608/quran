/**
 * Platform-specific Filesystem Adapter
 *
 * - Native: `expo-file-system` SDK 57 `File` / `Directory` / `Paths` API with
 *   `File.createDownloadTask` for progress + pause/resume.
 * - Web: IndexedDB backed blob store (audio downloads cached for offline PWA).
 *
 * URIs are opaque strings from the caller's point of view; native code uses
 * `file://` URIs while web uses object URLs resolved through IndexedDB.
 */

import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { downloadStorage } from '@/storage';
import type { DownloadItem } from '@/types';

// ============================================
// Types
// ============================================

export interface DownloadProgress {
  id: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0-1
}

export interface FileInfo {
  uri: string;
  size: number;
  exists: boolean;
  mimeType?: string;
}

export interface FileSystemAdapter {
  download(
    id: string,
    url: string,
    fileName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<FileInfo>;
  pauseDownload(id: string): void;
  resumeDownload(id: string, onProgress?: (progress: DownloadProgress) => void): void;
  cancelDownload(id: string): void;
  getFileInfo(uri: string): Promise<FileInfo>;
  deleteFile(uri: string): Promise<void>;
  moveFile(from: string, to: string): Promise<string>;
  copyFile(from: string, to: string): Promise<string>;
  listDirectory(dir: string): Promise<string[]>;
  getDownloadDirectory(): string;
  getCacheDirectory(): string;
  getAssetPath(assetModuleOrPath: unknown): Promise<string>;
}

// ============================================
// Native Implementation (expo-file-system SDK 57)
// ============================================

class NativeFileSystem implements FileSystemAdapter {
  private downloads = new Map<string, { task: import('expo-file-system').DownloadTask }>();

  private ensureDownloadsDir(): Directory {
    const dir = new Directory(Paths.document, 'downloads');
    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
    return dir;
  }

  async download(
    id: string,
    url: string,
    fileName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<FileInfo> {
    const dir = this.ensureDownloadsDir();
    const dest = new File(dir, fileName);

    const task = File.createDownloadTask(url, dest, {
      onProgress: (data) => {
        if (onProgress && data.totalBytes > 0) {
          onProgress({
            id,
            totalBytes: data.totalBytes,
            downloadedBytes: data.bytesWritten,
            progress: Math.min(data.bytesWritten / data.totalBytes, 1),
          });
        }
      },
    });

    this.downloads.set(id, { task });

    try {
      const file = await task.downloadAsync();
      this.downloads.delete(id);
      if (!file) throw new Error('Download paused before completion');
      return { uri: file.uri, size: file.size, exists: true };
    } catch (error) {
      this.downloads.delete(id);
      throw error;
    }
  }

  pauseDownload(id: string): void {
    const entry = this.downloads.get(id);
    void entry?.task.pauseAsync();
  }

  resumeDownload(id: string, onProgress?: (progress: DownloadProgress) => void): void {
    const entry = this.downloads.get(id);
    if (!entry) return;
    void entry.task.resumeAsync().then((file) => {
      if (file && onProgress) {
        onProgress({ id, totalBytes: file.size, downloadedBytes: file.size, progress: 1 });
      }
    });
  }

  cancelDownload(id: string): void {
    const entry = this.downloads.get(id);
    entry?.task.cancel();
    this.downloads.delete(id);
  }

  async getFileInfo(uri: string): Promise<FileInfo> {
    const file = new File(uri);
    return { uri, size: file.exists ? file.size : 0, exists: file.exists };
  }

  async deleteFile(uri: string): Promise<void> {
    const file = new File(uri);
    if (file.exists) file.delete();
  }

  async moveFile(from: string, to: string): Promise<string> {
    const src = new File(from);
    const dest = new File(to);
    if (src.exists) await src.move(dest);
    return to;
  }

  async copyFile(from: string, to: string): Promise<string> {
    const src = new File(from);
    const dest = new File(to);
    if (src.exists) await src.copy(dest);
    return to;
  }

  async listDirectory(dir: string): Promise<string[]> {
    const directory = new Directory(dir);
    if (!directory.exists) return [];
    return directory.list().map((entry) => entry.uri);
  }

  getDownloadDirectory(): string {
    return new Directory(Paths.document, 'downloads').uri;
  }

  getCacheDirectory(): string {
    return Paths.cache.uri;
  }

  async getAssetPath(assetModule: unknown): Promise<string> {
    const asset = Asset.fromModule(assetModule as number);
    await asset.downloadAsync();
    return asset.localUri || asset.uri;
  }
}

// ============================================
// Web Implementation (IndexedDB)
// ============================================

interface StoredFile {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  type: string;
  createdAt: number;
  url: string; // Object URL
}

class WebFileSystem implements FileSystemAdapter {
  private dbName = 'quran-app-files';
  private storeName = 'downloads';
  private db: IDBDatabase | null = null;
  private objectUrls = new Map<string, string>();
  private activeDownloads = new Map<string, { controller: AbortController; url: string; fileName: string }>();

  private openDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  private revokeObjectUrl(id: string): void {
    const url = this.objectUrls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(id);
    }
  }

  async download(
    id: string,
    url: string,
    fileName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<FileInfo> {
    const controller = new AbortController();
    this.activeDownloads.set(id, { controller, url, fileName });

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const chunks: Uint8Array[] = [];
      let downloadedBytes = 0;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        downloadedBytes += value.length;
        if (onProgress && totalBytes > 0) {
          onProgress({ id, totalBytes, downloadedBytes, progress: downloadedBytes / totalBytes });
        }
      }

      // `Uint8Array<ArrayBufferLike>` from fetch streams isn't directly a
      // `BlobPart` under TS 6's strict ArrayBuffer generics — cast explicitly.
      const blob = new Blob(chunks as unknown as BlobPart[]);
      const objectUrl = URL.createObjectURL(blob);
      this.objectUrls.set(id, objectUrl);

      const file: StoredFile = {
        id,
        name: fileName,
        blob,
        size: blob.size,
        type: blob.type || 'audio/mpeg',
        createdAt: Date.now(),
        url: objectUrl,
      };
      await this.saveFile(file);
      return { uri: objectUrl, size: blob.size, exists: true, mimeType: file.type };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download cancelled');
      }
      throw error;
    } finally {
      this.activeDownloads.delete(id);
    }
  }

  private async saveFile(file: StoredFile): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(file);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  pauseDownload(id: string): void {
    const download = this.activeDownloads.get(id);
    if (download) download.controller.abort();
  }

  resumeDownload(id: string, onProgress?: (progress: DownloadProgress) => void): void {
    const download = this.activeDownloads.get(id);
    if (download) {
      void this.download(id, download.url, download.fileName, onProgress);
    }
  }

  cancelDownload(id: string): void {
    const download = this.activeDownloads.get(id);
    if (download) download.controller.abort();
    this.activeDownloads.delete(id);
    this.revokeObjectUrl(id);
    void this.deleteFile(id);
  }

  async getFileInfo(uri: string): Promise<FileInfo> {
    for (const [id, url] of this.objectUrls.entries()) {
      if (url === uri) {
        const file = await this.getFile(id);
        if (file) return { uri, size: file.size, exists: true, mimeType: file.type };
      }
    }
    try {
      const response = await fetch(uri, { method: 'HEAD' });
      return {
        uri,
        size: parseInt(response.headers.get('content-length') || '0', 10),
        exists: response.ok,
      };
    } catch {
      return { uri, size: 0, exists: false };
    }
  }

  private async getFile(id: string): Promise<StoredFile | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const request = tx.objectStore(this.storeName).get(id);
      request.onsuccess = () => resolve((request.result as StoredFile) || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(id: string): Promise<void> {
    this.revokeObjectUrl(id);
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async moveFile(from: string, to: string): Promise<string> {
    const fromId = this.getIdFromUrl(from);
    const toId = this.getIdFromUrl(to);
    if (fromId && toId && fromId !== toId) {
      const file = await this.getFile(fromId);
      if (file) {
        await this.saveFile({ ...file, id: toId, name: toId });
        await this.deleteFile(fromId);
      }
    }
    return to;
  }

  async copyFile(from: string, to: string): Promise<string> {
    const fromId = this.getIdFromUrl(from);
    const toId = this.getIdFromUrl(to);
    if (fromId && toId) {
      const file = await this.getFile(fromId);
      if (file) await this.saveFile({ ...file, id: toId, name: toId });
    }
    return to;
  }

  private getIdFromUrl(url: string): string | null {
    for (const [id, u] of this.objectUrls.entries()) {
      if (u === url) return id;
    }
    return null;
  }

  async listDirectory(dir: string): Promise<string[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const request = tx.objectStore(this.storeName).getAll();
      request.onsuccess = () => resolve((request.result as StoredFile[]).map((f) => f.url));
      request.onerror = () => reject(request.error);
    });
  }

  getDownloadDirectory(): string {
    return 'indexeddb://downloads/';
  }

  getCacheDirectory(): string {
    return 'indexeddb://cache/';
  }

  async getAssetPath(assetPath: string): Promise<string> {
    return `/assets/${assetPath}`;
  }

  async clearAll(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).clear();
      tx.oncomplete = () => {
        this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        this.objectUrls.clear();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ============================================
// Factory & Export
// ============================================

let fsInstance: FileSystemAdapter | null = null;

export function getFileSystem(): FileSystemAdapter {
  if (!fsInstance) {
    fsInstance = Platform.OS === 'web' ? new WebFileSystem() : new NativeFileSystem();
  }
  return fsInstance;
}

// ============================================
// High-level Download Manager (uses platform FS)
// ============================================

export class DownloadManager {
  private fs = getFileSystem();
  private listeners = new Set<(item: DownloadItem) => void>();

  subscribe(listener: (item: DownloadItem) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(item: DownloadItem): void {
    this.listeners.forEach((l) => l(item));
    downloadStorage.upsert(item);
  }

  async startDownload(item: Omit<DownloadItem, 'id' | 'progress' | 'status' | 'downloadedBytes' | 'startedAt'>): Promise<DownloadItem> {
    const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const downloadItem: DownloadItem = {
      ...item,
      id,
      progress: 0,
      status: 'downloading',
      downloadedBytes: 0,
      startedAt: Date.now(),
    };

    this.notify(downloadItem);

    try {
      const result = await this.fs.download(
        id,
        item.metadata?.url as string,
        item.metadata?.fileName as string,
        (progress) => {
          downloadItem.progress = progress.progress;
          downloadItem.downloadedBytes = progress.downloadedBytes;
          downloadItem.totalBytes = progress.totalBytes;
          this.notify({ ...downloadItem });
        }
      );

      downloadItem.status = 'completed';
      downloadItem.progress = 1;
      downloadItem.downloadedBytes = result.size;
      downloadItem.localPath = result.uri;
      downloadItem.completedAt = Date.now();
      this.notify(downloadItem);
      return downloadItem;
    } catch (error) {
      downloadItem.status = 'failed';
      downloadItem.error = error instanceof Error ? error.message : 'Download failed';
      this.notify(downloadItem);
      throw error;
    }
  }

  pauseDownload(id: string): void {
    this.fs.pauseDownload(id);
    const item = downloadStorage.getQueue().find((d) => d.id === id);
    if (item) {
      item.status = 'paused';
      downloadStorage.upsert(item);
      this.notify(item);
    }
  }

  resumeDownload(id: string): void {
    const item = downloadStorage.getQueue().find((d) => d.id === id);
    if (!item) return;
    item.status = 'downloading';
    downloadStorage.upsert(item);
    this.notify(item);
    this.fs.resumeDownload(id, (progress) => {
      item.progress = progress.progress;
      item.downloadedBytes = progress.downloadedBytes;
      downloadStorage.upsert(item);
      this.notify(item);
    });
  }

  cancelDownload(id: string): void {
    this.fs.cancelDownload(id);
    const item = downloadStorage.getQueue().find((d) => d.id === id);
    if (item) {
      item.status = 'cancelled';
      downloadStorage.upsert(item);
      this.notify(item);
    }
    downloadStorage.remove(id);
  }

  async deleteDownload(id: string): Promise<void> {
    const item = downloadStorage.getQueue().find((d) => d.id === id);
    if (item?.localPath) {
      await this.fs.deleteFile(item.localPath);
    }
    downloadStorage.remove(id);
    downloadStorage.getQueue().forEach((i) => this.notify(i));
  }

  getQueue(): DownloadItem[] {
    return downloadStorage.getQueue();
  }
}

export const downloadManager = new DownloadManager();