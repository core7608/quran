/**
 * Mushaf page layout (QCF Madani 1405).
 *
 * Each page is a list of lines; a line is either a surah header ornament, a
 * basmala ornament, or a run of words with per-word ayah ownership.
 *
 * Source: Madani 1405 layout released by SakinaDevGroup/al_quran_madani
 * (fonts & layout attributed to King Fahd Complex via QUL). See
 * docs/PROVENANCE.md.
 */

import type { MushafPageLayout, MushafLine } from '@/types';

interface RawLayout {
  source: string;
  pages: { l: MushafLine[] }[];
}

const RAW_LAYOUT: RawLayout = require('../../../assets/data/mushaf-layout.json');

export const TOTAL_MUSHAF_PAGES = 604;

/**
 * Reference metrics for the surah-header ornament font, expressed in em at a
 * font-size of 1. `c` is the ink centre offset from the baseline.
 */
export const MUSHAF_SURAH_HEADER_METRICS = { w: 3.3028, h: 0.4104, c: 0 } as const;

export function getMushafPage(page: number): MushafPageLayout | null {
  if (!Number.isInteger(page) || page < 1 || page > TOTAL_MUSHAF_PAGES) return null;
  return RAW_LAYOUT.pages[page - 1] ?? null;
}

export function getMushafPageCount(): number {
  return RAW_LAYOUT.pages.length;
}

/**
 * Expands an ayah line's `r` runs into a per-word owner list, matching the
 * order of the `g` glyph array.
 */
export function expandLineOwners(runs: [number, number, number][]): { surah: number; verse: number }[] {
  const owners: { surah: number; verse: number }[] = [];
  for (const run of runs ?? []) {
    const count = Number(run[2] ?? 0);
    for (let i = 0; i < count; i++) owners.push({ surah: run[0], verse: run[1] });
  }
  return owners;
}
