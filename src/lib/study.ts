import type { Doc } from "@/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type Everything = NonNullable<FunctionReturnType<typeof api.study.everything>>;
export type SubjectDoc = Doc<"subjects">;
export type ChapterDoc = Doc<"chapters">;
export type TopicDoc = Doc<"topics">;
export type TaskDoc = Doc<"tasks">;
export type LogDoc = Doc<"xpLog">;
export type PrefsDoc = Doc<"prefs"> | null;

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export const STAGE_ORDER = [
  "foundation",
  "basic",
  "intermediate",
  "advanced",
  "mastery",
] as const;
export type StageKey = (typeof STAGE_ORDER)[number];

export const STAGE_META: Record<
  StageKey,
  { label: string; hint: string; color: string }
> = {
  foundation: { label: "Foundation", hint: "Learn the core idea", color: "#38bdf8" },
  basic: { label: "Basic Practice", hint: "Simple questions on fundamentals", color: "#2dd4bf" },
  intermediate: { label: "Intermediate", hint: "Applied problems", color: "#fbbf24" },
  advanced: { label: "Advanced", hint: "Tough / JEE-level questions", color: "#fb923c" },
  mastery: { label: "Mastery", hint: "Mixed problems + final test", color: "#fb7185" },
};

export const stageIndex = (s: string) => {
  const i = STAGE_ORDER.indexOf(s as StageKey);
  return i === -1 ? 99 : i;
};

export const DEFAULT_XP_BY_STAGE: Record<StageKey, number> = {
  foundation: 30,
  basic: 60,
  intermediate: 120,
  advanced: 200,
  mastery: 300,
};

export const DEFAULT_DIFFICULTY_BY_STAGE: Record<StageKey, string> = {
  foundation: "easy",
  basic: "easy",
  intermediate: "medium",
  advanced: "hard",
  mastery: "hard",
};

export const DIFFICULTY_META: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "#4ade80" },
  medium: { label: "Medium", color: "#fbbf24" },
  hard: { label: "Hard", color: "#fb7185" },
};

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export const SUBJECT_COLOR_CHOICES = [
  "#6366f1", // indigo
  "#38bdf8", // sky
  "#34d399", // emerald
  "#fbbf24", // amber
  "#fb923c", // orange
  "#fb7185", // rose
  "#a78bfa", // violet
  "#2dd4bf", // teal
];

/** hex + alpha → rgba string for inline accents */
export function tint(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const XP_GOLD = "#fcd34d";

// ---------------------------------------------------------------------------
// Level curve (mirrors the server copy in src/convex/study.ts)
// ---------------------------------------------------------------------------

export const MAX_LEVELS = 60;

export interface LevelInfo {
  level: number; // 1-based
  threshold: number; // cumulative XP where this level began
  nextThreshold: number | null; // cumulative XP for the next level
  xpInto: number; // XP earned inside this level
  xpForNext: number | null; // XP still needed to level up
  progress: number; // 0..1 within the current level
  capped: boolean;
}

export function classicCost(level: number): number {
  return 500 + 250 * Math.floor((level - 1) / 2);
}

export function quickCost(level: number): number {
  return 500;
}

export function steadyCost(level: number): number {
  return 250 + 250 * level; // 500, 750, 1000, …
}

export function buildThresholds(
  preset: string,
  maxLevels = MAX_LEVELS,
): number[] {
  const cost = (lvl: number) =>
    preset === "quick"
      ? quickCost(lvl)
      : preset === "steady"
        ? steadyCost(lvl)
        : classicCost(lvl);
  const out: number[] = [0];
  for (let lvl = 1; lvl < maxLevels; lvl++) {
    out.push(out[lvl - 1] + cost(lvl));
  }
  return out;
}

export const LEVEL_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
}> = [
  { id: "quick", label: "Quick start", description: "500 XP per level" },
  {
    id: "classic",
    label: "Classic curve",
    description: "0 · 500 · 1,000 · 1,750 · 2,500 · …",
  },
  { id: "steady", label: "Long haul", description: "Grows 500 → 5,000+ per level" },
];

export function levelInfo(total: number, thresholds: number[]): LevelInfo {
  const t = thresholds.length ? thresholds : [0];
  let idx = 0;
  for (let i = 0; i < t.length; i++) if (total >= t[i]) idx = i;
  const next = idx + 1 < t.length ? t[idx + 1] : null;
  const threshold = t[idx];
  if (next === null) {
    return {
      level: idx + 1,
      threshold,
      nextThreshold: null,
      xpInto: Math.max(0, total - threshold),
      xpForNext: null,
      progress: 1,
      capped: true,
    };
  }
  const xpInto = Math.max(0, total - threshold);
  const span = Math.max(1, next - threshold);
  return {
    level: idx + 1,
    threshold,
    nextThreshold: next,
    xpInto,
    xpForNext: Math.max(0, next - total),
    progress: Math.min(1, xpInto / span),
    capped: false,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function fmtXp(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtDay(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtLongDay(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function todayKey(): string {
  return dayKey(Date.now());
}

export function isSameDay(a: number, b: number): boolean {
  return dayKey(a) === dayKey(b);
}

// ---------------------------------------------------------------------------
// Deriving progress from raw records (never from timers or guesses)
// ---------------------------------------------------------------------------

export function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export interface StreakInfo {
  current: number;
  best: number;
  studiedToday: boolean;
}

export function computeStreak(logs: LogDoc[]): StreakInfo {
  const days = new Set<string>();
  for (const l of logs) {
    // Only real completions count toward streaks.
    if (l.type === "complete" && l.amount > 0) days.add(dayKey(l.createdAt));
  }
  const keys = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    if (prev !== null) {
      const gap =
        (new Date(k).getTime() - new Date(prev).getTime()) / 86_400_000;
      run = gap <= 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = k;
  }
  const today = todayKey();
  const yesterday = dayKey(Date.now() - 86_400_000);
  let current = 0;
  let probe = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  const dayBefore = (k: string) => dayKey(new Date(k).getTime() - 86_400_000);
  while (probe && days.has(probe)) {
    current++;
    probe = dayBefore(probe);
  }
  return { current, best, studiedToday: days.has(today) };
}

export interface LogTotals {
  total: number;
  bySubject: Map<string, number>;
}

export function sumLogs(logs: LogDoc[]): LogTotals {
  const bySubject = new Map<string, number>();
  let total = 0;
  for (const l of logs) {
    total += l.amount;
    bySubject.set(l.subjectId, (bySubject.get(l.subjectId) ?? 0) + l.amount);
  }
  return { total, bySubject };
}

/** Tasks grouped per subject/chapter/topic for quick joins. */
export function buildStructure(data: Everything) {
  const subjects = [...data.subjects].sort(
    (a, b) => a.order - b.order || a._creationTime - b._creationTime,
  );
  const chaptersOf = (subjectId: string) =>
    data.chapters
      .filter((c) => c.subjectId === subjectId)
      .sort((a, b) => a.order - b.order || a._creationTime - b._creationTime);
  const topicsOf = (chapterId: string) =>
    data.topics
      .filter((t) => t.chapterId === chapterId)
      .sort((a, b) => a.order - b.order || a._creationTime - b._creationTime);
  const tasksOf = (topicId: string) =>
    data.tasks
      .filter((t) => t.topicId === topicId)
      .sort(
        (a, b) =>
          stageIndex(a.stage) - stageIndex(b.stage) ||
          a.createdAt - b.createdAt,
      );
  const subjectName = (subjectId: string) =>
    data.subjects.find((s) => s._id === subjectId)?.name ?? "Unknown";
  const subjectColor = (subjectId: string) =>
    data.subjects.find((s) => s._id === subjectId)?.color ?? "#6366f1";
  return { subjects, chaptersOf, topicsOf, tasksOf, subjectName, subjectColor };
}

export function taskLocation(data: Everything, task: TaskDoc) {
  const chapter = data.chapters.find((c) => c._id === task.chapterId);
  const topic = data.topics.find((t) => t._id === task.topicId);
  return { chapter: chapter?.name ?? "", topic: topic?.name ?? "" };
}

/**
 * Next mission: the earliest incomplete task following the learning
 * structure (subject → chapter → topic → stage order), unless the user has
 * pinned a specific pending task.
 */
export function nextMission(
  data: Everything,
  opts?: { prefer: TaskDoc | null },
): TaskDoc | null {
  const pending = data.tasks.filter((t) => t.status === "pending");
  if (pending.length === 0) return null;
  if (opts?.prefer && pending.some((t) => t._id === opts.prefer!._id)) {
    return opts.prefer;
  }
  const { subjects, chaptersOf, topicsOf, tasksOf } = buildStructure(data);
  for (const subject of subjects) {
    for (const chapter of chaptersOf(subject._id)) {
      for (const topic of topicsOf(chapter._id)) {
        const list = tasksOf(topic._id).filter((t) => t.status === "pending");
        if (list.length > 0) return list[0];
      }
    }
  }
  return pending.sort((a, b) => a.createdAt - b.createdAt)[0];
}

export interface TopicStageStatus {
  stage: StageKey;
  done: number;
  total: number;
  complete: boolean;
}

/** Completion status of each stage inside a topic. */
export function topicStageStatus(tasks: TaskDoc[]): TopicStageStatus[] {
  return STAGE_ORDER.map((stage) => {
    const inStage = tasks.filter((t) => t.stage === stage);
    const done = inStage.filter((t) => t.status === "completed").length;
    return {
      stage,
      done,
      total: inStage.length,
      complete: inStage.length > 0 && done === inStage.length,
    };
  });
}

/** A topic is mastered only when every defined stage has its tasks complete. */
export function isTopicMastered(tasks: TaskDoc[]): boolean {
  const statuses = topicStageStatus(tasks);
  return (
    statuses.some((s) => s.total > 0) &&
    statuses.every((s) => s.total === 0 || s.complete)
  );
}

export interface Milestone {
  id: string;
  title: string;
  detail: string;
  icon: string;
  unlocked: boolean;
}

/** Achievements computed exclusively from recorded data. */
export function computeMilestones(data: Everything): Milestone[] {
  const { total, bySubject } = sumLogs(data.logs);
  const completed = data.tasks.filter((t) => t.status === "completed");
  const distinctDays = new Set(
    data.logs.filter((l) => l.type === "complete").map((l) => dayKey(l.createdAt)),
  ).size;
  const foundationsDone = completed.filter(
    (t) => t.stage === "foundation",
  ).length;
  const anySubjectLevel5 = [...bySubject.values()].some(
    (xp) => levelInfo(xp, data.prefs?.thresholds ?? [0]).level >= 5,
  );
  const chaptersWithTasks = data.chapters.filter((c) =>
    data.tasks.some((t) => t.chapterId === c._id),
  );
  const chapterComplete = chaptersWithTasks.some((c) => {
    const list = data.tasks.filter((t) => t.chapterId === c._id);
    return list.length > 0 && list.every((t) => t.status === "completed");
  });
  const masteredTopics = data.topics.filter((topic) =>
    isTopicMastered(data.tasks.filter((t) => t.topicId === topic._id)),
  ).length;
  const streak = computeStreak(data.logs);
  const level = levelInfo(total, data.prefs?.thresholds ?? [0]).level;

  return [
    {
      id: "first",
      title: "First Mission",
      detail: "Complete your first task",
      icon: "🎯",
      unlocked: completed.length >= 1,
    },
    {
      id: "xp-1000",
      title: "1,000 XP",
      detail: "Earn 1,000 total XP",
      icon: "⚡",
      unlocked: total >= 1_000,
    },
    {
      id: "xp-5000",
      title: "5,000 XP",
      detail: "Earn 5,000 total XP",
      icon: "🌱",
      unlocked: total >= 5_000,
    },
    {
      id: "xp-10000",
      title: "10,000 XP",
      detail: "Earn 10,000 total XP",
      icon: "💎",
      unlocked: total >= 10_000,
    },
    {
      id: "level-5",
      title: "Level 5 Hero",
      detail: "Reach overall Level 5",
      icon: "⭐",
      unlocked: level >= 5,
    },
    {
      id: "subject-5",
      title: "Subject Specialist",
      detail: "Reach Level 5 in any subject",
      icon: "📚",
      unlocked: anySubjectLevel5,
    },
    {
      id: "chapter",
      title: "Chapter Complete",
      detail: "Complete every task in a chapter",
      icon: "🏁",
      unlocked: chapterComplete,
    },
    {
      id: "foundation-10",
      title: "Foundation Builder",
      detail: "Complete 10 Foundation tasks",
      icon: "🧱",
      unlocked: foundationsDone >= 10,
    },
    {
      id: "task-25",
      title: "Task Machine",
      detail: "Complete 25 tasks",
      icon: "✅",
      unlocked: completed.length >= 25,
    },
    {
      id: "master-3",
      title: "Master of Topics",
      detail: "Fully master 3 topics",
      icon: "🏆",
      unlocked: masteredTopics >= 3,
    },
    {
      id: "days-7",
      title: "Week of Focus",
      detail: "Study on 7 different days",
      icon: "🔥",
      unlocked: distinctDays >= 7,
    },
    {
      id: "streak-7",
      title: "7-Day Streak",
      detail: "Keep a 7-day streak alive",
      icon: "⚔️",
      unlocked: streak.best >= 7,
    },
  ];
}
