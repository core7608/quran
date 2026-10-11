/**
 * MushafPage — renders one QCF Madani 1405 page as a phone-sized, anchored
 * Arabic page, porting the Wird PWA v2 technique:
 *
 *   1. Each ayah line is measured first at a reference font size (hidden
 *      measuring tree) to get its natural width.
 *   2. `scale = min(availableWidth / (naturalWidth + centeredExtra))` across
 *      all ayah lines; every line shares the page font size = REF * scale.
 *   3. Non-centered lines spread their words across the row
 *      (space-between, RTL); centered lines use a fixed `0.26em` gap.
 *   4. Surah-header and basmala ornaments are fitted from their `{w,h,c}`
 *      em metrics against the row (`width*0.98/0.64`, `height*0.86/0.62`).
 *
 * Words are pressable and the active verse is highlighted.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import { theme } from '@/theme';
import { getMushafPage, expandLineOwners, MUSHAF_SURAH_HEADER_METRICS } from '@/data/mushaf/layout';
import {
  mushafFontFamily,
  ensureMushafFontLoaded,
  ensureMushafOrnamentsLoaded,
  MUSHAF_SURAH_FONT,
  MUSHAF_BASMALA_FONT,
} from '@/data/mushaf/fonts';
import type { MushafLine, MushafAyahLine } from '@/types';

// ============================================
// Constants
// ============================================

const MEASURE_REF = 32; // reference font size used to measure natural widths
const ROW_PITCH = 1.62; // row height in em (matches Wird --mushaf-row-pitch)
const FILL_SAFETY = 0.995; // small epsilon so rounding never overflows the row

interface Owner {
  surah: number;
  verse: number;
}

interface MushafPageProps {
  page: number;
  activeVerse?: Owner | null;
  zoom?: number; // extra glyph scale multiplier (1 = standard)
  onWordPress?: (owner: Owner) => void;
  style?: object;
}

export const MushafPage = React.memo(({ page, activeVerse, zoom = 1, onWordPress, style }: MushafPageProps) => {
  const lines = useMemo(() => getMushafPage(page)?.l ?? [], [page]);

  const [fontReady, setFontReady] = useState(false);
  const [availableWidth, setAvailableWidth] = useState<number>(0);
  const [naturalWidths, setNaturalWidths] = useState<Map<number, number>>(new Map());

  // Load the page font + ornament fonts before measuring anything.
  useEffect(() => {
    let cancelled = false;
    setFontReady(false);
    setAvailableWidth(0);
    setNaturalWidths(new Map());
    (async () => {
      try {
        await Promise.all([ensureMushafFontLoaded(page), ensureMushafOrnamentsLoaded()]);
        if (!cancelled) setFontReady(true);
      } catch (e) {
        console.warn(`Mushaf font failed for page ${page}:`, e);
        if (!cancelled) setFontReady(true); // fall back to system glyphs
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    setAvailableWidth(e.nativeEvent.layout.width);
  }, []);

  const onLineMeasured = useCallback((lineIndex: number, width: number) => {
    setNaturalWidths((prev) => {
      if (prev.get(lineIndex) === width) return prev;
      const next = new Map(prev);
      next.set(lineIndex, width);
      return next;
    });
  }, []);

  // Once we have the container width and every ayah line measured, compute the
  // shared page font size.
  const fontSize = useMemo<number | null>(() => {
    if (!fontReady || availableWidth <= 0) return null;
    const effWidth = availableWidth / zoom;
    let scale = Infinity;
    let ayahCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.t !== 'a') continue;
      ayahCount++;
      const natural = naturalWidths.get(i);
      if (natural == null || natural <= 0) return null;
      let target = natural;
      if (line.c) target += 0.26 * MEASURE_REF * Math.max(0, line.g.length - 1);
      if (target > 0) scale = Math.min(scale, (effWidth * FILL_SAFETY) / target);
    }

    if (ayahCount === 0 || !Number.isFinite(scale)) return MEASURE_REF * 0.35;
    return Math.max(8, MEASURE_REF * scale * zoom);
  }, [fontReady, availableWidth, naturalWidths, lines, zoom]);

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.page} onLayout={onContentLayout}>
        {/* Hidden measuring tree — lays out at MEASURE_REF so we can compute ratios */}
        {fontReady && (
          <View pointerEvents="none" style={styles.measurer} aria-hidden>
            {lines.map((line, i) =>
              line.t === 'a' ? (
                <View key={i} style={styles.measureLine} onLayout={(e) => onLineMeasured(i, e.nativeEvent.layout.width)}>
                  {line.g.map((word, w) => (
                    <Text key={w} style={{ fontFamily: mushafFontFamily(page), fontSize: MEASURE_REF, writingDirection: 'rtl' }} numberOfLines={1}>
                      {word}
                    </Text>
                  ))}
                </View>
              ) : null
            )}
          </View>
        )}

        {/* Visible page */}
        {fontSize != null ? (
          <View style={styles.column}>
            {lines.map((line, i) => renderLine(line, i, page, fontSize, availableWidth, zoom, activeVerse ?? null, onWordPress))}
          </View>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.brownPrimary} size="small" />
          </View>
        )}
      </View>
    </ScrollView>
  );
});

MushafPage.displayName = 'MushafPage';

// ============================================
// Line renderers
// ============================================

function renderLine(
  line: MushafLine,
  index: number,
  page: number,
  fontSize: number,
  rowWidth: number,
  zoom: number,
  activeVerse: Owner | null,
  onWordPress?: (owner: Owner) => void
): React.ReactNode {
  if (line.t === 's') {
    const rowHeight = ROW_PITCH * fontSize;
    const size = Math.min(
      (rowWidth * 0.98) / MUSHAF_SURAH_HEADER_METRICS.w,
      (rowHeight * 0.86) / MUSHAF_SURAH_HEADER_METRICS.h
    );
    return (
      <View key={index} style={[styles.row, styles.ornamentRow, { height: rowHeight }]}>
        <Text
          style={{
            fontFamily: MUSHAF_SURAH_FONT,
            fontSize: size,
            lineHeight: size,
            writingDirection: 'ltr',
            transform: [{ translateY: -MUSHAF_SURAH_HEADER_METRICS.c * size * zoom }],
          }}
          numberOfLines={1}
          selectable={false}
        >
          {line.n}
        </Text>
      </View>
    );
  }

  if (line.t === 'b') {
    const rowHeight = ROW_PITCH * fontSize;
    const size = Math.min((rowWidth * 0.64) / line.w, (rowHeight * 0.62) / line.h);
    return (
      <View key={index} style={[styles.row, styles.ornamentRow, { height: rowHeight }]}>
        <Text
          style={{
            fontFamily: MUSHAF_BASMALA_FONT,
            fontSize: size,
            lineHeight: size,
            writingDirection: 'ltr',
            transform: [{ translateY: -line.c * size * zoom }],
          }}
          numberOfLines={1}
          selectable={false}
        >
          {line.g}
        </Text>
      </View>
    );
  }

  return renderAyahLine(line, index, page, fontSize, activeVerse, onWordPress);
}

function renderAyahLine(
  line: MushafAyahLine,
  index: number,
  page: number,
  fontSize: number,
  activeVerse: Owner | null,
  onWordPress?: (owner: Owner) => void
): React.ReactNode {
  const owners = expandLineOwners(line.r);
  const isCentered = Boolean(line.c);
  const family = mushafFontFamily(page);

  return (
    <View
      key={index}
      style={[
        styles.row,
        {
          height: ROW_PITCH * fontSize,
          alignItems: 'baseline',
          justifyContent: isCentered ? 'center' : 'space-between',
          direction: 'rtl',
        },
      ]}
      accessible={false}
    >
      {isCentered ? (
        <View style={[styles.wordCluster, { gap: 0.26 * fontSize, direction: 'rtl' }]}>
          {line.g.map((word, w) => {
            const owner = owners[w] ?? { surah: 0, verse: 0 };
            return renderWord(word, `${index}-${w}`, family, fontSize, owner, activeVerse, onWordPress);
          })}
        </View>
      ) : (
        <>
          {line.g.map((word, w) => {
            const owner = owners[w] ?? { surah: 0, verse: 0 };
            return renderWord(word, `${index}-${w}`, family, fontSize, owner, activeVerse, onWordPress);
          })}
        </>
      )}
    </View>
  );
}

function renderWord(
  glyph: string,
  key: string,
  family: string,
  fontSize: number,
  owner: Owner,
  activeVerse: Owner | null,
  onWordPress?: (owner: Owner) => void
): React.ReactNode {
  const isActive = activeVerse != null && owner.surah === activeVerse.surah && owner.verse === activeVerse.verse;
  const pressable = owner.surah > 0;

  const content = (
    <Text
      style={[
        styles.word,
        {
          fontFamily: family,
          fontSize,
          writingDirection: 'rtl',
          backgroundColor: isActive ? theme.colors.verseHighlight : 'transparent',
          borderRadius: isActive ? 0.12 * fontSize : 0,
        },
      ]}
      numberOfLines={1}
      selectable={false}
    >
      {glyph}
    </Text>
  );

  if (!pressable) return <React.Fragment key={key}>{content}</React.Fragment>;

  return (
    <Pressable
      key={key}
      onPress={() => onWordPress?.(owner)}
      accessibilityLabel={`الآية ${owner.verse}`}
      accessibilityRole="button"
      style={styles.wordPressable}
      hitSlop={{ top: 2, bottom: 2, left: 1, right: 1 }}
    >
      {content}
    </Pressable>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    position: 'relative',
  },
  measurer: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'flex-start',
    opacity: 0,
    zIndex: -1,
  },
  measureLine: {
    flexDirection: 'row',
  },
  column: {
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    flexShrink: 1,
  },
  ornamentRow: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  wordCluster: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  word: {
    flexShrink: 0,
  },
  wordPressable: {
    flexShrink: 0,
  },
  loading: {
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
});