import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

// ---------------------------------------------------------------------------
// Level curve helpers. Thresholds are CUMULATIVE: thresholds[0] === 0 is the
// XP needed to BE level 1; level n is reached once total XP >= thresholds[n-1].
// A mirror of these lives in src/lib/study.ts for the UI.
// ---------------------------------------------------------------------------

export const MAX_LEVELS = 60;

/** "Classic" curve matching the PRD sample: 0, 500, 1000, 1750, 2500, … */
export function classicCost(level: number): number {
  // XP required to go from `level` to `level + 1`
  return 500 + 250 * Math.floor((level - 1) / 2);
}

export function buildClassicThresholds(maxLevels = MAX_LEVELS): number[] {
  const out: number[] = [0];
  for (let lvl = 1; lvl < maxLevels; lvl++) {
    out.push(out[lvl - 1] + classicCost(lvl));
  }
  return out;
}

export const DEFAULT_THRESHOLDS = buildClassicThresholds();

/** Index of the highest level whose threshold is <= total (0-based). */
export function levelIndex(total: number, thresholds: number[]): number {
  let idx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (total >= thresholds[i]) idx = i;
  }
  return idx;
}

function sanitizeThresholds(input: number[]): number[] {
  const t = input
    .map((x) => Math.floor(Number(x)))
    .filter((x) => Number.isFinite(x) && x >= 0);
  if (t.length === 0 || t[0] !== 0) t.unshift(0);
  const sorted = [...new Set(t)].sort((a, b) => a - b);
  return sorted.slice(0, MAX_LEVELS);
}

async function getPrefsDoc(ctx: MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("prefs")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

async function getLevelTotals(
  ctx: MutationCtx,
  userId: Id<"users">,
  prefs?: Awaited<ReturnType<typeof getPrefsDoc>>,
) {
  const p = prefs ?? (await getPrefsDoc(ctx, userId));
  const thresholds = p?.thresholds?.length ? p.thresholds : DEFAULT_THRESHOLDS;
  const logs = await ctx.db
    .query("xpLog")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const total = logs.reduce((sum, l) => sum + l.amount, 0);
  return { thresholds, total };
}

// ---------------------------------------------------------------------------
// Cascading deletes keep the data model consistent.
// ---------------------------------------------------------------------------

async function deleteLogsForTask(
  ctx: MutationCtx,
  userId: Id<"users">,
  taskId: Id<"tasks">,
) {
  const logs = await ctx.db
    .query("xpLog")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  await Promise.all(
    logs
      .filter((l) => l.taskId === taskId)
      .map((l) => ctx.db.delete(l._id)),
  );
}

async function deleteTaskInner(
  ctx: MutationCtx,
  userId: Id<"users">,
  taskId: Id<"tasks">,
) {
  await deleteLogsForTask(ctx, userId, taskId);
  await ctx.db.delete(taskId);
}

async function deleteTopicInner(
  ctx: MutationCtx,
  userId: Id<"users">,
  topicId: Id<"topics">,
) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_topic", (q) => q.eq("userId", userId).eq("topicId", topicId))
    .collect();
  for (const t of tasks) await deleteTaskInner(ctx, userId, t._id);
  await ctx.db.delete(topicId);
}

async function deleteChapterInner(
  ctx: MutationCtx,
  userId: Id<"users">,
  chapterId: Id<"chapters">,
) {
  const topics = await ctx.db
    .query("topics")
    .withIndex("by_chapter", (q) =>
      q.eq("userId", userId).eq("chapterId", chapterId),
    )
    .collect();
  for (const t of topics) await deleteTopicInner(ctx, userId, t._id);
  await ctx.db.delete(chapterId);
}

async function deleteSubjectInner(
  ctx: MutationCtx,
  userId: Id<"users">,
  subjectId: Id<"subjects">,
) {
  const chapters = await ctx.db
    .query("chapters")
    .withIndex("by_subject", (q) =>
      q.eq("userId", userId).eq("subjectId", subjectId),
    )
    .collect();
  for (const c of chapters) await deleteChapterInner(ctx, userId, c._id);
  // Clean any orphaned ledger rows for this subject.
  const logs = await ctx.db
    .query("xpLog")
    .withIndex("by_subject", (q) =>
      q.eq("userId", userId).eq("subjectId", subjectId),
    )
    .collect();
  for (const l of logs) await ctx.db.delete(l._id);
  await ctx.db.delete(subjectId);
}

// ---------------------------------------------------------------------------
// Everything: one reactive snapshot of the whole study universe.
// ---------------------------------------------------------------------------

export const everything = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const userId = user._id;
    const [subjects, chapters, topics, tasks, logs, prefs] =
      await Promise.all([
        ctx.db
          .query("subjects")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("chapters")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("topics")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("tasks")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("xpLog")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("prefs")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first(),
      ]);
    const thresholds = prefs?.thresholds?.length
      ? prefs.thresholds
      : DEFAULT_THRESHOLDS;
    const total = logs.reduce((sum, l) => sum + l.amount, 0);
    return {
      subjects,
      chapters,
      topics,
      tasks,
      logs,
      prefs: prefs ?? null,
      totalXp: total,
      level: levelIndex(total, thresholds) + 1,
      maxLevel: thresholds.length,
    };
  },
});

// ---------------------------------------------------------------------------
// First-run setup
// ---------------------------------------------------------------------------

const DEFAULT_SUBJECTS: Array<{ name: string; color: string }> = [
  { name: "Mathematics", color: "#6366f1" },
  { name: "Physics", color: "#38bdf8" },
  { name: "Chemistry", color: "#34d399" },
];

export const ensureInit = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const existingSubjects = await ctx.db
      .query("subjects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (existingSubjects.length === 0) {
      for (let i = 0; i < DEFAULT_SUBJECTS.length; i++) {
        await ctx.db.insert("subjects", {
          userId: user._id,
          name: DEFAULT_SUBJECTS[i].name,
          color: DEFAULT_SUBJECTS[i].color,
          order: i,
        });
      }
    }
    const prefs = await getPrefsDoc(ctx, user._id);
    if (!prefs) {
      await ctx.db.insert("prefs", {
        userId: user._id,
        thresholds: DEFAULT_THRESHOLDS,
        preset: "classic",
      });
    }
    return true;
  },
});

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export const createSubject = mutation({
  args: { name: v.string(), color: v.string() },
  handler: async (ctx, { name, color }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const clean = name.trim();
    if (!clean) throw new Error("Subject name is required");
    const existing = await ctx.db
      .query("subjects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return await ctx.db.insert("subjects", {
      userId: user._id,
      name: clean,
      color,
      order: existing.length,
    });
  },
});

export const updateSubject = mutation({
  args: {
    subjectId: v.id("subjects"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, { subjectId, name, color }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const subj = await ctx.db.get(subjectId);
    if (!subj || subj.userId !== user._id) throw new Error("Subject not found");
    await ctx.db.patch(subjectId, {
      name: name.trim() || subj.name,
      color,
    });
    return true;
  },
});

export const deleteSubject = mutation({
  args: { subjectId: v.id("subjects") },
  handler: async (ctx, { subjectId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const subj = await ctx.db.get(subjectId);
    if (!subj || subj.userId !== user._id) throw new Error("Subject not found");
    await deleteSubjectInner(ctx, user._id, subjectId);
    return true;
  },
});

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

export const createChapter = mutation({
  args: {
    subjectId: v.id("subjects"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { subjectId, name, description }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const subj = await ctx.db.get(subjectId);
    if (!subj || subj.userId !== user._id) throw new Error("Subject not found");
    const clean = name.trim();
    if (!clean) throw new Error("Chapter name is required");
    const existing = await ctx.db
      .query("chapters")
      .withIndex("by_subject", (q) =>
        q.eq("userId", user._id).eq("subjectId", subjectId),
      )
      .collect();
    return await ctx.db.insert("chapters", {
      userId: user._id,
      subjectId,
      name: clean,
      description: description?.trim() || undefined,
      order: existing.length,
    });
  },
});

export const deleteChapter = mutation({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, { chapterId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const ch = await ctx.db.get(chapterId);
    if (!ch || ch.userId !== user._id) throw new Error("Chapter not found");
    await deleteChapterInner(ctx, user._id, chapterId);
    return true;
  },
});

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export const createTopic = mutation({
  args: {
    chapterId: v.id("chapters"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { chapterId, name, description }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const ch = await ctx.db.get(chapterId);
    if (!ch || ch.userId !== user._id) throw new Error("Chapter not found");
    const clean = name.trim();
    if (!clean) throw new Error("Topic name is required");
    const existing = await ctx.db
      .query("topics")
      .withIndex("by_chapter", (q) =>
        q.eq("userId", user._id).eq("chapterId", chapterId),
      )
      .collect();
    return await ctx.db.insert("topics", {
      userId: user._id,
      subjectId: ch.subjectId,
      chapterId,
      name: clean,
      description: description?.trim() || undefined,
      order: existing.length,
    });
  },
});

export const deleteTopic = mutation({
  args: { topicId: v.id("topics") },
  handler: async (ctx, { topicId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const t = await ctx.db.get(topicId);
    if (!t || t.userId !== user._id) throw new Error("Topic not found");
    await deleteTopicInner(ctx, user._id, topicId);
    return true;
  },
});

// ---------------------------------------------------------------------------
// Tasks — the heart of StudyQuest. XP is never awarded outside completeTask.
// ---------------------------------------------------------------------------

export const createTask = mutation({
  args: {
    topicId: v.id("topics"),
    name: v.string(),
    description: v.optional(v.string()),
    stage: v.union(
      v.literal("foundation"),
      v.literal("basic"),
      v.literal("intermediate"),
      v.literal("advanced"),
      v.literal("mastery"),
    ),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    xp: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const topic = await ctx.db.get(args.topicId);
    if (!topic || topic.userId !== user._id) throw new Error("Topic not found");
    const chapter = await ctx.db.get(topic.chapterId);
    if (!chapter) throw new Error("Chapter not found");
    const clean = args.name.trim();
    if (!clean) throw new Error("Task name is required");
    const xp = Math.max(1, Math.min(1_000_000, Math.round(args.xp)));
    return await ctx.db.insert("tasks", {
      userId: user._id,
      subjectId: chapter.subjectId,
      chapterId: topic.chapterId,
      topicId: topic._id,
      name: clean,
      description: args.description?.trim() || undefined,
      stage: args.stage,
      difficulty: args.difficulty,
      xp,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    name: v.string(),
    description: v.optional(v.string()),
    stage: v.union(
      v.literal("foundation"),
      v.literal("basic"),
      v.literal("intermediate"),
      v.literal("advanced"),
      v.literal("mastery"),
    ),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    xp: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) throw new Error("Task not found");
    if (task.status === "completed") {
      throw new Error("Undo the task before editing it — XP was already earned");
    }
    const clean = args.name.trim();
    if (!clean) throw new Error("Task name is required");
    await ctx.db.patch(args.taskId, {
      name: clean,
      description: args.description?.trim() || undefined,
      stage: args.stage,
      difficulty: args.difficulty,
      xp: Math.max(1, Math.min(1_000_000, Math.round(args.xp))),
    });
    return true;
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== user._id) throw new Error("Task not found");
    // Its XP ledger rows are removed along with the task, so totals stay exact.
    await deleteTaskInner(ctx, user._id, taskId);
    return true;
  },
});

/**
 * Completes a task: flips its status and appends ONE positive ledger entry.
 * Guarded so a completed task can never award XP a second time.
 */
export const completeTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== user._id) throw new Error("Task not found");
    if (task.status === "completed") {
      return { ok: false, reason: "already-completed" };
    }
    const prefs = await getPrefsDoc(ctx, user._id);
    const { total, thresholds } = await getLevelTotals(ctx, user._id, prefs);
    const now = Date.now();
    await ctx.db.patch(taskId, { status: "completed", completedAt: now });
    await ctx.db.insert("xpLog", {
      userId: user._id,
      taskId,
      subjectId: task.subjectId,
      taskName: task.name,
      amount: task.xp,
      type: "complete",
      reason: "Task completed",
      createdAt: now,
    });
    if (prefs?.pinnedTaskId === taskId) {
      await ctx.db.patch(prefs._id, { pinnedTaskId: undefined });
    }
    const after = total + task.xp;
    return {
      ok: true,
      gained: task.xp,
      totalAfter: after,
      levelBefore: levelIndex(total, thresholds) + 1,
      levelAfter: levelIndex(after, thresholds) + 1,
    };
  },
});

/**
 * Undoes a mistaken completion. History is never erased: a negative
 * "correction" entry keeps the audit trail intact.
 */
export const undoTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== user._id) throw new Error("Task not found");
    if (task.status !== "completed") {
      return { ok: false, reason: "not-completed" };
    }
    const prefs = await getPrefsDoc(ctx, user._id);
    const { total, thresholds } = await getLevelTotals(ctx, user._id, prefs);
    const now = Date.now();
    await ctx.db.patch(taskId, {
      status: "pending",
      completedAt: undefined,
    });
    await ctx.db.insert("xpLog", {
      userId: user._id,
      taskId,
      subjectId: task.subjectId,
      taskName: task.name,
      amount: -task.xp,
      type: "undo",
      reason: "Task accidentally marked complete",
      createdAt: now,
    });
    const after = total - task.xp;
    return {
      ok: true,
      reverted: task.xp,
      totalAfter: after,
      levelBefore: levelIndex(total, thresholds) + 1,
      levelAfter: levelIndex(after, thresholds) + 1,
    };
  },
});

// ---------------------------------------------------------------------------
// Next-mission pin & preferences
// ---------------------------------------------------------------------------

export const setPinnedTask = mutation({
  args: { taskId: v.union(v.id("tasks"), v.null()) },
  handler: async (ctx, { taskId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const prefs = await getPrefsDoc(ctx, user._id);
    if (prefs) {
      await ctx.db.patch(prefs._id, {
        pinnedTaskId: taskId ?? undefined,
      });
    }
    return true;
  },
});

export const savePrefs = mutation({
  args: {
    thresholds: v.array(v.number()),
    preset: v.string(),
  },
  handler: async (ctx, { thresholds, preset }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const clean = sanitizeThresholds(thresholds);
    if (clean.length < 3) throw new Error("Level curve needs at least 3 levels");
    const prefs = await getPrefsDoc(ctx, user._id);
    if (prefs) {
      await ctx.db.patch(prefs._id, { thresholds: clean, preset });
    } else {
      await ctx.db.insert("prefs", {
        userId: user._id,
        thresholds: clean,
        preset,
      });
    }
    return true;
  },
});

/** Wipes earned progress (tasks back to pending, ledger cleared) but keeps the structure. */
export const resetProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const t of tasks) {
      await ctx.db.patch(t._id, { status: "pending", completedAt: undefined });
    }
    const logs = await ctx.db
      .query("xpLog")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const l of logs) await ctx.db.delete(l._id);
    const prefs = await getPrefsDoc(ctx, user._id);
    if (prefs?.pinnedTaskId) {
      await ctx.db.patch(prefs._id, { pinnedTaskId: undefined });
    }
    return true;
  },
});

/** Nukes every StudyQuest table for this user (used by import + full reset). */
async function wipeAll(ctx: MutationCtx, userId: Id<"users">) {
  const subjects = await ctx.db
    .query("subjects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const s of subjects) await deleteSubjectInner(ctx, userId, s._id);
  const prefs = await getPrefsDoc(ctx, userId);
  if (prefs) await ctx.db.delete(prefs._id);
}

const backupSubjectValidator = v.object({
  key: v.string(),
  name: v.string(),
  color: v.string(),
  order: v.number(),
});
const backupChapterValidator = v.object({
  key: v.string(),
  subjectKey: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  order: v.number(),
});
const backupTopicValidator = v.object({
  key: v.string(),
  chapterKey: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  order: v.number(),
});
const backupTaskValidator = v.object({
  key: v.string(),
  topicKey: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  stage: v.union(
    v.literal("foundation"),
    v.literal("basic"),
    v.literal("intermediate"),
    v.literal("advanced"),
    v.literal("mastery"),
  ),
  difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  xp: v.number(),
  status: v.union(v.literal("pending"), v.literal("completed")),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});
const backupLogValidator = v.object({
  subjectKey: v.string(),
  taskKey: v.string(),
  taskName: v.string(),
  amount: v.number(),
  type: v.union(v.literal("complete"), v.literal("undo")),
  reason: v.string(),
  createdAt: v.number(),
});

/** Restores a full backup (see Settings → Export my data). Replaces all content. */
export const importBackup = mutation({
  args: {
    subjects: v.array(backupSubjectValidator),
    chapters: v.array(backupChapterValidator),
    topics: v.array(backupTopicValidator),
    tasks: v.array(backupTaskValidator),
    logs: v.array(backupLogValidator),
    thresholds: v.array(v.number()),
    preset: v.string(),
  },
  handler: async (ctx, payload) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    await wipeAll(ctx, user._id);

    const subjectMap = new Map<string, Id<"subjects">>();
    for (const s of payload.subjects) {
      subjectMap.set(
        s.key,
        await ctx.db.insert("subjects", {
          userId: user._id,
          name: s.name,
          color: s.color,
          order: s.order,
        }),
      );
    }
    const chapterMap = new Map<string, Id<"chapters">>();
    for (const c of payload.chapters) {
      const subjectId = subjectMap.get(c.subjectKey);
      if (!subjectId) continue;
      chapterMap.set(
        c.key,
        await ctx.db.insert("chapters", {
          userId: user._id,
          subjectId,
          name: c.name,
          description: c.description,
          order: c.order,
        }),
      );
    }
    const topicMap = new Map<string, Id<"topics">>();
    for (const t of payload.topics) {
      const chapterId = chapterMap.get(t.chapterKey);
      if (!chapterId) continue;
      const chapter = await ctx.db.get(chapterId);
      if (!chapter) continue;
      topicMap.set(
        t.key,
        await ctx.db.insert("topics", {
          userId: user._id,
          subjectId: chapter.subjectId,
          chapterId,
          name: t.name,
          description: t.description,
          order: t.order,
        }),
      );
    }
    const taskMap = new Map<string, Id<"tasks">>();
    for (const t of payload.tasks) {
      const topicId = topicMap.get(t.topicKey);
      if (!topicId) continue;
      const topic = await ctx.db.get(topicId);
      if (!topic) continue;
      taskMap.set(
        t.key,
        await ctx.db.insert("tasks", {
          userId: user._id,
          subjectId: topic.subjectId,
          chapterId: topic.chapterId,
          topicId,
          name: t.name,
          description: t.description,
          stage: t.stage,
          difficulty: t.difficulty,
          xp: Math.max(1, Math.min(1_000_000, Math.round(t.xp))),
          status: t.status,
          createdAt: t.createdAt,
          completedAt: t.completedAt,
        }),
      );
    }
    for (const l of payload.logs) {
      const taskId = taskMap.get(l.taskKey);
      const subjectId = subjectMap.get(l.subjectKey);
      if (!taskId || !subjectId) continue;
      await ctx.db.insert("xpLog", {
        userId: user._id,
        taskId,
        subjectId,
        taskName: l.taskName,
        amount: l.amount,
        type: l.type,
        reason: l.reason,
        createdAt: l.createdAt,
      });
    }
    await ctx.db.insert("prefs", {
      userId: user._id,
      thresholds: sanitizeThresholds(payload.thresholds),
      preset: payload.preset,
    });
    return true;
  },
});
