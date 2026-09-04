import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { CheckCircle2, CircleDashed, Crosshair, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CardShell,
  EmptyCard,
  PageHeader,
  StagePill,
  XpBadge,
} from "@/components/study-ui";
import {
  CompletedTag,
  CompleteTaskButton,
  UndoTaskButton,
} from "@/components/task-actions";
import {
  fmtXp,
  isSameDay,
  levelInfo,
  stageIndex,
  sumLogs,
  tint,
  XP_GOLD,
  type Everything,
} from "@/lib/study";
import type { Doc } from "@/convex/_generated/dataModel";

const STAGE_FILTERS = [
  { id: "all", label: "All stages" },
  { id: "foundation", label: "Foundation" },
  { id: "basic", label: "Basic" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "mastery", label: "Mastery" },
];

export default function Missions() {
  const data = useQuery(api.study.everything);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const derived = useMemo(() => {
    if (!data) return null;
    const subjects = [...data.subjects].sort((a, b) => a.order - b.order);
    const thresholds = data.prefs?.thresholds?.length ? data.prefs.thresholds : [0];
    const pending = data.tasks.filter((t) => t.status === "pending");
    // structural order: subject → chapter → topic → stage → created
    const ordered = (list: Doc<"tasks">[]) =>
      [...list].sort((a, b) => {
        const sa = subjects.findIndex((s) => s._id === a.subjectId);
        const sb = subjects.findIndex((s) => s._id === b.subjectId);
        const ca = data.chapters.find((c) => c._id === a.chapterId)?.order ?? 0;
        const cb = data.chapters.find((c) => c._id === b.chapterId)?.order ?? 0;
        const ta = data.topics.find((t) => t._id === a.topicId)?.order ?? 0;
        const tb = data.topics.find((t) => t._id === b.topicId)?.order ?? 0;
        return (
          (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb) ||
          ca - cb ||
          ta - tb ||
          stageIndex(a.stage) - stageIndex(b.stage) ||
          a.createdAt - b.createdAt
        );
      });
    const filtered = ordered(pending).filter((t) => {
      if (subjectFilter !== "all" && t.subjectId !== subjectFilter) return false;
      if (stageFilter !== "all" && t.stage !== stageFilter) return false;
      const q = query.trim().toLowerCase();
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
    const completedToday = data.tasks.filter(
      (t) => t.status === "completed" && t.completedAt && isSameDay(t.completedAt, Date.now()),
    );
    const totalXp = sumLogs(data.logs).total;
    const missionXp = filtered.reduce((s, t) => s + t.xp, 0);
    const info = levelInfo(totalXp, thresholds);
    return { subjects, thresholds, pending, ordered, filtered, completedToday, totalXp, missionXp, info };
  }, [data, subjectFilter, stageFilter, query]);

  if (!data || !derived) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading missions…
      </div>
    );
  }

  const { subjects, pending, ordered, filtered, completedToday, thresholds, totalXp } = derived;

  if (data.tasks.length === 0) {
    return (
      <div>
        <PageHeader
          title="Missions"
          description="The tasks you study — every mission is completed only by you, with your own two hands (and brain)."
        />
        <EmptyCard
          icon="🎯"
          title="No missions yet"
          description="Create your first chapter and topic, then add tasks. Each task you complete earns exactly the XP you assigned it."
          action={
            <Button asChild>
              <Link to="/subjects">
                <Crosshair className="size-4" /> Go build your study map
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions"
        description="Pending tasks follow the order of your study map — foundation before advanced, chapter by chapter."
      >
        <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-2 text-right">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {filtered.length} mission{filtered.length === 1 ? "" : "s"} queued
          </p>
          <p className="text-lg font-black tabular-nums" style={{ color: XP_GOLD }}>
            {fmtXp(derived.missionXp)} XP
          </p>
        </div>
      </PageHeader>

      {/* filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSubjectFilter("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              subjectFilter === "all"
                ? "border-transparent bg-white/[0.08] text-foreground"
                : "border-border/70 text-muted-foreground hover:text-foreground",
            )}
          >
            All subjects
          </button>
          {subjects.map((s) => (
            <button
              key={s._id}
              onClick={() => setSubjectFilter(s._id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                subjectFilter === s._id
                  ? "border-transparent text-white"
                  : "border-border/70 text-muted-foreground hover:text-foreground",
              )}
              style={
                subjectFilter === s._id
                  ? { background: tint(s.color, 0.85) }
                  : undefined
              }
            >
              <span className="size-1.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="h-8 w-44 pl-8 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STAGE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setStageFilter(f.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                  stageFilter === f.id
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <EmptyCard
          icon="✨"
          title="Nothing matches"
          description={
            pending.length === 0
              ? "You’ve completed every pending task that matches. Add new missions to keep going."
              : "Try a different subject, stage or search."
          }
        />
      ) : (
        <CardShell className="divide-y divide-border/60">
          {filtered.map((task) => (
            <MissionRow key={task._id} task={task} data={data} thresholds={thresholds} totalXp={totalXp} />
          ))}
        </CardShell>
      )}

      {/* completed today */}
      {completedToday.length > 0 && (
        <CardShell className="p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CheckCircle2 className="size-4 text-emerald-400" /> Completed today
          </h2>
          <ul className="mt-3 divide-y divide-border/50">
            {completedToday.map((task) => (
              <li key={task._id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  <span className="truncate text-sm text-foreground/90">{task.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CompletedTag task={task} />
                  <UndoTaskButton task={task} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Made a mistake? Undo adds a −XP correction to history — nothing is silently erased.
          </p>
        </CardShell>
      )}

      {/* streak reminder */}
      {pending.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Sparkles className="size-3.5" style={{ color: XP_GOLD }} />
          Completing a mission is the only way to earn XP — opening this page never counts.
        </p>
      )}
    </div>
  );
}

function MissionRow({
  task,
  data,
  thresholds,
  totalXp,
}: {
  task: Doc<"tasks">;
  data: Everything;
  thresholds: number[];
  totalXp: number;
}) {
  const subject = data.subjects.find((s) => s._id === task.subjectId);
  const chapter = data.chapters.find((c) => c._id === task.chapterId);
  const topic = data.topics.find((t) => t._id === task.topicId);
  const color = subject?.color ?? "#888";
  return (
    <div className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.02]">
      <span className="hidden text-muted-foreground sm:block">
        <CircleDashed className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{task.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-medium" style={{ color }}>
            {subject?.name}
          </span>
          <span className="opacity-50">/</span>
          <span>{chapter?.name ?? "…"}</span>
          <span className="opacity-50">/</span>
          <span>{topic?.name ?? "…"}</span>
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <StagePill stage={task.stage} />
        </div>
      </div>
      <div className="shrink-0">
        <XpBadge xp={task.xp} />
      </div>
      <div className="shrink-0">
        <CompleteTaskButton task={task} thresholds={thresholds} totalBefore={totalXp} />
      </div>
    </div>
  );
}
