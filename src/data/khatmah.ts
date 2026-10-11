/**
 * Smart Khatmah (ختمة) — pure reading-plan logic.
 *
 * A plan is a target number of days to finish the Mushaf (604 pages). The daily
 * wird is recomputed from the *remaining* pages and the *remaining* days, so a
 * missed day is automatically absorbed instead of piling up.
 *
 * Everything here is pure and synchronous; persistence lives in
 * `@/storage` (`khatmahStorage`).
 */

import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import type { KhatmahPlan, KhatmahProgress } from '@/types';

export const KHATMAH_TOTAL_PAGES = 604;

/** Canonical daily-page targets offered in the UI. */
export const KHATMAH_DURATIONS = [30, 60, 90] as const;

export function dateKey(timestamp: number): string {
  return format(timestamp, 'yyyy-MM-dd');
}

export function createPlan(durationDays: number, now: number = Date.now(), lastPage = 1): KhatmahPlan {
  return {
    active: true,
    durationDays,
    startedAt: now,
    completedPages: [],
    dailyLog: {},
    lastPage,
    lastActivityAt: now,
    completedAt: null,
  };
}

/**
 * Recomputes a plan's progress against the current time. The daily wird
 * (`pagesPerDay`) is derived from what is still left and how much time remains,
 * which is what makes missed days self-correcting.
 */
export function computeProgress(
  plan: KhatmahPlan | null,
  now: number = Date.now()
): KhatmahProgress {
  const totalPages = KHATMAH_TOTAL_PAGES;

  if (!plan) {
    return {
      plan: null,
      totalPages,
      completedCount: 0,
      remainingCount: totalPages,
      daysElapsed: 0,
      daysRemaining: 0,
      pagesPerDay: 0,
      todayTarget: 0,
      todayDone: 0,
      expectedByNow: 0,
      onTrack: true,
      percent: 0,
    };
  }

  const completedCount = plan.completedPages.length;
  const remainingCount = Math.max(totalPages - completedCount, 0);

  const daysElapsed = Math.max(0, differenceInCalendarDays(now, plan.startedAt));
  const daysRemaining = plan.durationDays - daysElapsed;
  const effectiveDays = Math.max(daysRemaining, 1);

  const pagesPerDay = remainingCount === 0 ? 0 : Math.ceil(remainingCount / effectiveDays);

  const todayDone = plan.dailyLog[dateKey(now)] ?? 0;

  // Straight-line pacing: how many pages *should* be done by the start of today.
  const expectedByNow = Math.min(
    totalPages,
    Math.floor((daysElapsed * totalPages) / plan.durationDays)
  );

  return {
    plan,
    totalPages,
    completedCount,
    remainingCount,
    daysElapsed,
    daysRemaining: Math.max(daysRemaining, 0),
    pagesPerDay,
    todayTarget: pagesPerDay,
    todayDone,
    expectedByNow,
    onTrack: completedCount >= expectedByNow,
    percent: Math.round((completedCount / totalPages) * 100),
  };
}

/** Marks a set of pages as read, logging new pages against today. */
export function markPagesRead(
  plan: KhatmahPlan,
  pages: number[],
  now: number = Date.now()
): KhatmahPlan {
  const existing = new Set(plan.completedPages);
  let added = 0;
  const lastPage = plan.lastPage;

  let maxPage = lastPage;
  for (const p of pages) {
    if (p < 1 || p > KHATMAH_TOTAL_PAGES) continue;
    if (!existing.has(p)) {
      existing.add(p);
      added += 1;
    }
    if (p > maxPage) maxPage = p;
  }

  const completedPages = [...existing].sort((a, b) => a - b);
  const key = dateKey(now);
  const dailyLog = { ...plan.dailyLog };
  if (added > 0) dailyLog[key] = (dailyLog[key] ?? 0) + added;

  const justCompleted = completedPages.length >= KHATMAH_TOTAL_PAGES;

  return {
    ...plan,
    completedPages,
    dailyLog,
    lastPage: maxPage,
    lastActivityAt: now,
    active: justCompleted ? false : plan.active,
    completedAt: justCompleted ? (plan.completedAt ?? now) : plan.completedAt,
  };
}

export function markPageRead(
  plan: KhatmahPlan,
  page: number,
  now: number = Date.now()
): KhatmahPlan {
  return markPagesRead(plan, [page], now);
}

export function setLastPage(plan: KhatmahPlan, page: number, now: number = Date.now()): KhatmahPlan {
  return { ...plan, lastPage: page, lastActivityAt: now };
}

/**
 * The pages the plan still needs, in order, up to `count`. Used to jump the
 * Mushaf to the start of today's wird.
 */
export function nextUnreadPages(plan: KhatmahPlan, count: number): number[] {
  const read = new Set(plan.completedPages);
  const out: number[] = [];
  for (let p = 1; p <= KHATMAH_TOTAL_PAGES && out.length < count; p++) {
    if (!read.has(p)) out.push(p);
  }
  return out;
}

/** Start of the current day, used for "today" buckets in the UI. */
export function todayStart(now: number = Date.now()): number {
  return startOfDay(now).getTime();
}

/** Human-friendly projected finish date. */
export function projectedFinish(plan: KhatmahPlan, now: number = Date.now()): number {
  const progress = computeProgress(plan, now);
  const daysToFinish = progress.pagesPerDay > 0 ? Math.ceil(progress.remainingCount / progress.pagesPerDay) : 0;
  return addDays(now, daysToFinish).getTime();
}
