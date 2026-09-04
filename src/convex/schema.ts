import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// ---- StudyQuest data model ------------------------------------------------

/** Learning stages every topic is built from (ordered foundation → mastery). */
export const STAGES = [
  "foundation",
  "basic",
  "intermediate",
  "advanced",
  "mastery",
] as const;
export type Stage = (typeof STAGES)[number];
export const stageValidator = v.union(...STAGES.map((s) => v.literal(s)));

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const difficultyValidator = v.union(
  ...DIFFICULTIES.map((d) => v.literal(d)),
);

export const TASK_STATUSES = ["pending", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const taskStatusValidator = v.union(
  ...TASK_STATUSES.map((s) => v.literal(s)),
);

export const LOG_TYPES = ["complete", "undo"] as const;
export type LogType = (typeof LOG_TYPES)[number];
export const logTypeValidator = v.union(...LOG_TYPES.map((t) => v.literal(t)));

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // StudyQuest: a single-owner, auditable study tracker. Every table is
    // scoped to the owning user (the signed-in account).
    subjects: defineTable({
      userId: v.id("users"),
      name: v.string(),
      color: v.string(), // hex accent used across the UI
      order: v.number(),
    }).index("by_user", ["userId"]),

    chapters: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      name: v.string(),
      description: v.optional(v.string()),
      order: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_subject", ["userId", "subjectId"]),

    topics: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      chapterId: v.id("chapters"),
      name: v.string(),
      description: v.optional(v.string()),
      order: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_chapter", ["userId", "chapterId"]),

    tasks: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      chapterId: v.id("chapters"),
      topicId: v.id("topics"),
      name: v.string(),
      description: v.optional(v.string()),
      stage: stageValidator,
      difficulty: difficultyValidator,
      xp: v.number(), // user-chosen XP for completing this task
      status: taskStatusValidator,
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_topic", ["userId", "topicId"])
      .index("by_subject", ["userId", "subjectId"]),

    // Auditable XP ledger: XP totals are always derived from this table,
    // never stored as a bare counter. Undos append negative entries.
    xpLog: defineTable({
      userId: v.id("users"),
      taskId: v.id("tasks"),
      subjectId: v.id("subjects"),
      taskName: v.string(), // snapshot so history survives task deletion
      amount: v.number(), // positive for completion, negative for undo
      type: logTypeValidator,
      reason: v.string(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_subject", ["userId", "subjectId"]),

    // Per-user preferences: level curve (cumulative thresholds per level),
    // pinned "next mission" override, and the preset name that generated it.
    prefs: defineTable({
      userId: v.id("users"),
      thresholds: v.array(v.number()), // thresholds[0] === 0; level n reached at thresholds[n-1]
      preset: v.string(), // preset id used to generate thresholds
      pinnedTaskId: v.optional(v.id("tasks")),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
