import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Flame,
  Layers,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  buildStructure,
  computeMilestones,
  computeStreak,
  fmtClock,
  fmtXp,
  isSameDay,
  levelInfo,
  nextMission,
  pct,
  stageIndex,
  sumLogs,
  tint,
  XP_GOLD,
  type Everything,
} from "@/lib/study";
import {
  CardShell,
  MiniProgress,
  PageHeader,
  StagePill,
  SubjectGlyph,
  XpBadge,
} from "@/components/study-ui";
import { CompleteTaskButton } from "@/components/task-actions";
import type { Doc } from "@/convex/_generated/dataModel";

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
      Loading your quest log…
    </div>
  );
}

function LevelRing({
  progress,
  size = 148,
  stroke = 11,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
          opacity={0.5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={XP_GOLD}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
          className="transition-[stroke-dashoffset] duration-1000"
          style={{ filter: `drop-shadow(0 0 6px ${tint(XP_GOLD, 0.55)})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function SubjectCard({ data, subjectId }: { data: Everything; subjectId: string }) {
  const { chaptersOf, subjectColor } = buildStructure(data);
  const subject = data.subjects.find((s) => s._id === subjectId);
  if (!subject) return null;
  const color = subjectColor(subject._id);
  const subjectTasks = data.tasks.filter((t) => t.subjectId === subject._id);
  const done = subjectTasks.filter((t) => t.status === "completed").length;
  const chapters = chaptersOf(subject._id);
  const doneChapters = chapters.filter((ch) => {
    const chTasks = data.tasks.filter((t) => t.chapterId === ch._id);
    return chTasks.length > 0 && chTasks.every((t) => t.status === "completed");
  }).length;
  const xp = sumLogs(data.logs).bySubject.get(subject._id) ?? 0;
  const thresholds = data.prefs?.thresholds?.length ? data.prefs.thresholds : [0];
  const info = levelInfo(xp, thresholds);
  const nextTask = subjectTasks
    .filter((t) => t.status === "pending")
    .sort((a, b) => {
      const ca = chapters.findIndex((c) => c._id === a.chapterId);
      const cb = chapters.findIndex((c) => c._id === b.chapterId);
      return (
        (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb) ||
        stageIndex(a.stage) - stageIndex(b.stage) ||
        a.createdAt - b.createdAt
      );
    })[0];
  const overall = pct(done, subjectTasks.length);

  return (
    <Link to={`/subjects/${subject._id}`} className="group block">
      <CardShell
        className="h-full p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/15"
        style={{
          background: `linear-gradient(180deg, ${tint(color, 0.07)}, transparent 40%), var(--card)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SubjectGlyph name={subject.name} color={color} />
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-foreground">
                {subject.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"} ·{" "}
                {subjectTasks.length} tasks
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-bold tracking-wide text-foreground uppercase">
              Lv {info.level}
            </span>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {fmtXp(xp)} XP
            </span>
          </div>
          <MiniProgress value={info.progress * 100} color={color} />
        </div>

        <p className="mt-4 min-h-10 text-xs leading-5 text-muted-foreground">
          {nextTask ? (
            <>
              Next: <span className="font-medium text-foreground/90">{nextTask.name}</span>
            </>
          ) : subjectTasks.length > 0 ? (
            <span className="text-emerald-300/90">All tasks complete — well done!</span>
          ) : (
            "No tasks yet — open this subject to add your first."
          )}
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          <MiniProgress value={overall} color={color} className="flex-1" />
          <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color }}>
            {overall}%
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-[11px] text-muted-foreground tabular-nums">
          <span>
            {done}/{subjectTasks.length} tasks
          </span>
          <span>
            {doneChapters}/{chapters.length} chapters
          </span>
        </div>
      </CardShell>
    </Link>
  );
}

function FeedRow({ log, data }: { log: Doc<"xpLog">; data: Everything }) {
  const subject = data.subjects.find((s) => s._id === log.subjectId);
  const gain = log.amount > 0;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums"
        style={
          gain
            ? { background: tint(XP_GOLD, 0.14), color: XP_GOLD }
            : { background: "rgba(251,113,133,0.12)", color: "#fb7185" }
        }
      >
        {gain ? "+" : "−"}
        {fmtXp(Math.abs(log.amount))}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{log.taskName}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ background: subject?.color ?? "#888" }}
          />
          {subject?.name ?? "Subject"}
          {log.type === "undo" && <span className="italic">· correction</span>}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {fmtClock(log.createdAt)}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const data = useQuery(api.study.everything);
  const { user } = useAuth();
  const navigate = useNavigate();
  const setPinned = useMutation(api.study.setPinnedTask);

  const derived = useMemo(() => {
    if (!data) return null;
    const thresholds = data.prefs?.thresholds?.length ? data.prefs.thresholds : [0];
    const totals = sumLogs(data.logs);
    const info = levelInfo(totals.total, thresholds);
    const streak = computeStreak(data.logs);
    const completed = data.tasks.filter((t) => t.status === "completed");
    const pinned =
      data.prefs?.pinnedTaskId != null
        ? (data.tasks.find((t) => t._id === data.prefs?.pinnedTaskId) ?? null)
        : null;
    const mission = nextMission(data, { prefer: pinned });
    const todayLogs = data.logs.filter((l) => isSameDay(l.createdAt, Date.now()));
    const todayNet = todayLogs.reduce((s, l) => s + l.amount, 0);
    const completedToday = completed.filter(
      (t) => t.completedAt && isSameDay(t.completedAt, Date.now()),
    );
    const pending = data.tasks
      .filter((t) => t.status === "pending")
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, 4);
    const recent = [...data.logs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 9);
    const milestones = computeMilestones(data);
    return {
      totals,
      info,
      streak,
      completed,
      mission,
      todayNet,
      completedToday,
      pending,
      recent,
      milestones,
      thresholds,
      pinnedTaskId: data.prefs?.pinnedTaskId ?? null,
    };
  }, [data]);

  if (!data || !derived) return <Loading />;
  const { info, streak } = derived;
  const firstName = (user?.name ?? "").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <span>
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </span>
        }
        description="Every point of XP below is something you genuinely completed. No shortcuts, no fake progress."
      >
        <Button onClick={() => navigate("/subjects")}>
          <Plus className="size-4" />
          Add chapter or task
        </Button>
      </PageHeader>

      {/* hero */}
      <CardShell className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full opacity-80 blur-3xl"
          style={{ background: tint("#6366f1", 0.16) }}
        />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.25em] text-muted-foreground uppercase">
              StudyQuest
            </p>
            <h2 className="mt-2 text-5xl font-black tracking-tight text-foreground sm:text-6xl">
              Level {info.level}
            </h2>
            {info.capped ? (
              <p className="mt-3 text-lg font-semibold text-foreground">
                Max level reached — {fmtXp(derived.totals.total)} XP and counting
              </p>
            ) : (
              <p className="mt-3 text-lg text-muted-foreground">
                <span className="font-bold tabular-nums text-foreground">
                  {fmtXp(derived.totals.total)} XP
                </span>{" "}
                · {fmtXp(info.xpForNext ?? 0)} XP to Level {info.level + 1}
              </p>
            )}
            <div className="mt-5 max-w-md">
              <div
                className="h-2.5 overflow-hidden rounded-full"
                style={{ background: tint(XP_GOLD, 0.14) }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-1000"
                  style={{
                    width: `${Math.min(100, info.progress * 100)}%`,
                    background: `linear-gradient(90deg, ${tint(XP_GOLD, 0.7)}, ${XP_GOLD})`,
                    boxShadow: `0 0 14px ${tint(XP_GOLD, 0.45)}`,
                  }}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={
                  streak.current > 0
                    ? {
                        color: "#fb923c",
                        borderColor: tint("#fb923c", 0.35),
                        background: tint("#fb923c", 0.1),
                      }
                    : { color: "var(--muted-foreground)", borderColor: "var(--border)" }
                }
              >
                <Flame className="size-3.5" />
                {streak.current}-day streak
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                {derived.completed.length} tasks completed
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <Sparkles className="size-3.5" style={{ color: XP_GOLD }} />
                {fmtXp(derived.todayNet)} XP today
              </span>
            </div>
          </div>

          <div className="hidden justify-center lg:flex">
            <LevelRing progress={info.progress}>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Level
              </p>
              <p className="text-4xl font-black text-foreground">{info.level}</p>
              {!info.capped && (
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {fmtXp(info.xpForNext ?? 0)} XP to go
                </p>
              )}
            </LevelRing>
          </div>
        </div>
      </CardShell>

      {/* next mission */}
      <NextMissionPanel data={data} derived={derived} onUnpin={() => void setPinned({ taskId: null })} />

      {/* subjects */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BookOpenText className="size-4 text-indigo-300" />
            Subjects
          </h2>
          <Link
            to="/subjects"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Manage subjects <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {buildStructure(data).subjects.map((s) => (
            <SubjectCard key={s._id} data={data} subjectId={s._id} />
          ))}
        </div>
      </section>

      {/* today + recent */}
      <section className="grid gap-6 lg:grid-cols-5">
        <CardShell className="p-6 lg:col-span-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Flame className="size-4" style={{ color: XP_GOLD }} />
            Recent activity
          </h2>
          {derived.recent.length === 0 ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Nothing here yet — complete a task and it will appear in your history.
            </div>
          ) : (
            <div className="mt-2 divide-y divide-border/60">
              {derived.recent.map((log) => (
                <FeedRow key={log._id} log={log} data={data} />
              ))}
            </div>
          )}
          {derived.recent.length > 0 && (
            <Link
              to="/history"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              Full history <ArrowRight className="size-3.5" />
            </Link>
          )}
        </CardShell>

        <div className="space-y-6 lg:col-span-2">
          <CardShell className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Today</h2>
              <span className="text-sm font-bold tabular-nums" style={{ color: XP_GOLD }}>
                {fmtXp(derived.todayNet)} XP
              </span>
            </div>
            {derived.completedToday.length > 0 ? (
              <div className="mt-3 space-y-2">
                {derived.completedToday.slice(0, 4).map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2"
                  >
                    <span className="line-clamp-1 text-xs font-medium text-foreground">
                      {t.name}
                    </span>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-300">
                      +{fmtXp(t.xp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                No completions recorded today. Head to your mission and earn your first XP.
              </p>
            )}
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Up next
              </p>
              {derived.pending.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No pending tasks — add more to keep going.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {derived.pending.map((t) => (
                    <li key={t._id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="line-clamp-1 text-muted-foreground">
                        <CircleDashed className="mr-1.5 inline size-3 text-muted-foreground/70" />
                        {t.name}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums" style={{ color: XP_GOLD }}>
                        +{fmtXp(t.xp)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardShell>

          <CardShell className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Milestones</h2>
              <Link to="/achievements" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                {derived.milestones.filter((m) => m.unlocked).length}/{derived.milestones.length} unlocked
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {derived.milestones.slice(0, 8).map((m) => (
                <div
                  key={m.id}
                  title={m.unlocked ? `${m.title} — ${m.detail}` : `Locked — ${m.detail}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl border text-xl transition",
                    m.unlocked
                      ? "border-amber-400/25 bg-amber-400/[0.07]"
                      : "border-border/60 bg-muted/20 opacity-40 grayscale",
                  )}
                >
                  {m.icon}
                </div>
              ))}
            </div>
          </CardShell>
        </div>
      </section>
    </div>
  );
}

function NextMissionPanel({
  data,
  derived,
  onUnpin,
}: {
  data: Everything;
  derived: {
    mission: Doc<"tasks"> | null;
    thresholds: number[];
    totals: { total: number; bySubject: Map<string, number> };
    pinnedTaskId: string | null;
  };
  onUnpin: () => void;
}) {
  const navigate = useNavigate();
  const { subjectName } = buildStructure(data);
  const allTasks = data.tasks.length;

  if (allTasks === 0) {
    return (
      <CardShell className="relative overflow-hidden p-8">
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full blur-3xl"
          style={{ background: tint("#34d399", 0.1) }}
        />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/50 text-2xl">
              🗺️
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Your journey starts here</h2>
              <p className="mt-0.5 max-w-xl text-sm leading-6 text-muted-foreground">
                No study progress yet — and that’s exactly how it should be. Build your first
                chapter, then break it into topics and tasks worth XP.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/subjects")} size="lg">
            Start building <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardShell>
    );
  }

  if (!derived.mission) {
    return (
      <CardShell className="p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-3xl">
          🎉
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">All missions complete</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Every task on your map is done. Add new chapters, topics and tasks to keep levelling up.
        </p>
        <Button className="mt-5" onClick={() => navigate("/subjects")}>
          <Layers className="size-4" /> Build something new
        </Button>
      </CardShell>
    );
  }

  const task = derived.mission;
  const subject = data.subjects.find((s) => s._id === task.subjectId);
  const chapter = data.chapters.find((c) => c._id === task.chapterId);
  const topic = data.topics.find((t) => t._id === task.topicId);
  const color = subject?.color ?? "#6366f1";
  const isPinned = derived.pinnedTaskId === task._id;

  return (
    <CardShell
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(120deg, ${tint(color, 0.07)}, transparent 40%), var(--card)`,
      }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: `linear-gradient(180deg, ${color}, transparent)` }}
      />
      <div className="flex flex-col gap-5 p-6 pl-8 sm:p-7 sm:pl-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              Next mission
            </p>
            {isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                <Target className="size-3" /> Pinned by you
              </span>
            )}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold" style={{ color }}>
              {subjectName(task.subjectId)}
            </span>
            <span className="opacity-50">/</span>
            <span>{chapter?.name ?? "…"}</span>
            <span className="opacity-50">/</span>
            <span className="font-medium text-foreground/90">{topic?.name ?? "…"}</span>
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {task.name}
          </h3>
          {task.description && (
            <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
              {task.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StagePill stage={task.stage} />
            <XpBadge xp={task.xp} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch">
          <CompleteTaskButton
            task={task}
            thresholds={derived.thresholds}
            totalBefore={derived.totals.total}
            variant="default"
            size="lg"
            className="px-6 font-semibold"
            style={{
              background: `linear-gradient(120deg, ${XP_GOLD}, #f59e0b)`,
              color: "#1c1917",
              boxShadow: `0 8px 24px -8px ${tint("#f59e0b", 0.5)}`,
            }}
          />
          {isPinned && (
            <Button variant="ghost" size="sm" onClick={onUnpin} className="text-muted-foreground">
              Unpin mission
            </Button>
          )}
        </div>
      </div>
    </CardShell>
  );
}
