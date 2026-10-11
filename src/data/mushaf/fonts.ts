/**
 * Loads the per-page QCF Madani fonts (and the two ornament fonts) on demand.
 *
 * The fonts live in assets/mushaf/fonts and are referenced through the
 * generated static require map in ./fontModules. Each page has its own font
 * whose glyphs are laid out for the fixed Madani page grid.
 */

import { loadAsync } from 'expo-font';
import { MUSHAF_PAGE_FONTS, MUSHAF_ORNAMENT_FONTS, type FontAssetModule } from './fontModules';

export const MUSHAF_SURAH_FONT = 'MushafSurah';
export const MUSHAF_BASMALA_FONT = 'MushafBasmala';

export function mushafFontFamily(page: number): string {
  return `MushafQCF${String(page).padStart(3, '0')}`;
}

const loaded = new Set<string>();
const inflight = new Map<string, Promise<void>>();

async function loadFamily(family: string, module: FontAssetModule): Promise<void> {
  if (loaded.has(family)) return;
  const pending = inflight.get(family);
  if (pending) return pending;

  const promise = loadAsync({ [family]: module })
    .then(() => {
      loaded.add(family);
    })
    .finally(() => {
      inflight.delete(family);
    });

  inflight.set(family, promise);
  return promise;
}

export function isMushafFontLoaded(page: number): boolean {
  return loaded.has(mushafFontFamily(page));
}

export function ensureMushafFontLoaded(page: number): Promise<void> {
  const module = MUSHAF_PAGE_FONTS[page];
  if (!module) return Promise.reject(new Error(`No Mushaf font bundled for page ${page}`));
  return loadFamily(mushafFontFamily(page), module);
}

export async function ensureMushafOrnamentsLoaded(): Promise<void> {
  await Promise.all([
    loadFamily(MUSHAF_SURAH_FONT, MUSHAF_ORNAMENT_FONTS.surahHeader),
    loadFamily(MUSHAF_BASMALA_FONT, MUSHAF_ORNAMENT_FONTS.bismillah),
  ]);
}
