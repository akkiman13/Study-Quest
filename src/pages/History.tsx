import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowDownLeft, ArrowUpRight, History as HistoryIcon, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardShell, EmptyCard, PageHeader, XpBadge } from "@/components/study-ui";
import { UndoTaskButton } from "@/components/task-actions";
import {
  dayKey,
  fmtClock,
  fmtXp,
  isSameDay,
  sumLogs,
  tint,
  XP_GOLD,
  type Everything,
  type LogDoc,
} from "@/lib/study";

const RANGES = [
  { id: "all", label: "All time" },
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
];
const TYPES = [
  { id: "all", label: "All entries" },
  { id: "complete", label: "Completions" },
  { id: "undo", label: "Corrections (undo)" },
];

function dayLabel(key: string): string {
  const ts = new Date(`${key}T12:00:00`).getTime();
  const now = Date.now();
  if (isSameDay(ts, now)) return "Today";
  if (isSameDay(ts, now - 86_400_000)) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: new Date(ts).getFullYear() !== new Date(now).getFullYear() ? "numeric" : undefined,
  });
}

export default function History() {
  const data = useQuery(api.study.everything);
  const [range, setRange] = useState("all");
  const [type, setType] = useState("all");
  const [subjectId, setSubjectId] = useState("all");

  const derived = useMemo(() => {
    if (!data) return null;
    const since =
      range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;
    const filtered = data.logs
      .filter((l) => l.createdAt >= since)
      .filter((l) => (type === "all" ? true : l.type === type))
      .filter((l) => (subjectId === "all" ? true : l.subjectId === subjectId))
      .sort((a, b) => b.createdAt - a.createdAt);
    const groups = new Map<string, LogDoc[]>();
    for (const l of filtered) {
      const k = dayKey(l.createdAt);
      groups.set(k, [...(groups.get(k) ?? []), l]);
    }
    const keys = [...groups.keys()].sort((a, b) => (a < b ? 1 : -1));
    const net = filtered.reduce((s, l) => s + l.amount, 0);
    return { filtered, groups, keys, net };
  }, [data, range, type, subjectId]);

  if (!data || !derived) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading history…
      </div>
    );
  }

  const subjects = [...data.subjects].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        description="Your auditable XP ledger. Every point is traceable to a task, and undos are recorded as corrections rather than deletions."
      >
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:block">
            Net shown:
          </span>
          <span
            className="rounded-full border px-3 py-1.5 text-sm font-bold tabular-nums"
            style={{
              color: derived.net >= 0 ? XP_GOLD : "#fb7185",
              borderColor: tint(derived.net >= 0 ? XP_GOLD : "#fb7185", 0.3),
              background: tint(derived.net >= 0 ? XP_GOLD : "#fb7185", 0.08),
            }}
          >
            {derived.net >= 0 ? "+" : "−"}
            {fmtXp(Math.abs(derived.net))} XP
          </span>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s._id} value={s._id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {derived.filtered.length === 0 ? (
        <EmptyCard
          icon="📜"
          title="No history to show"
          description={
            data.logs.length === 0
              ? "Complete your first task and its +XP entry will appear here — along with every future correction."
              : "Try widening the filters."
          }
          action={
            data.logs.length === 0 ? (
              <Button asChild>
                <Link to="/missions">
                  <RotateCcw className="size-4" /> Go to missions
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {derived.keys.map((key) => {
            const entries = derived.groups.get(key) ?? [];
            const dayNet = entries.reduce((s, l) => s + l.amount, 0);
            return (
              <section key={key}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
                    {dayLabel(key)}
                  </h2>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: dayNet >= 0 ? XP_GOLD : "#fb7185" }}
                  >
                    {dayNet >= 0 ? "+" : "−"}
                    {fmtXp(Math.abs(dayNet))} XP
                  </span>
                </div>
                <CardShell className="divide-y divide-border/60 px-5">
                  {entries.map((log) => (
                    <HistoryRow key={log._id} log={log} data={data} />
                  ))}
                </CardShell>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Total ledger entries: {data.logs.length} · Verified total:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {fmtXp(sumLogs(data.logs).total)} XP
        </span>
      </p>
    </div>
  );
}

function HistoryRow({ log, data }: { log: LogDoc; data: Everything }) {
  const subject = data.subjects.find((s) => s._id === log.subjectId);
  const task = data.tasks.find((t) => t._id === log.taskId);
  const gain = log.amount > 0;
  const canUndo =
    log.type === "complete" && !!task && task.status === "completed";

  return (
    <div className="flex items-center gap-3 py-3.5">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl border",
          gain
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : "border-rose-400/20 bg-rose-400/10 text-rose-300",
        )}
      >
        {gain ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <p className="truncate text-sm font-semibold text-foreground">{log.taskName}</p>
          {log.type === "undo" && (
            <span className="rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              Correction
            </span>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span
            className="inline-flex items-center gap-1.5"
            style={{ color: subject?.color }}
          >
            <span className="size-1.5 rounded-full" style={{ background: subject?.color ?? "#888" }} />
            {subject?.name ?? "Deleted subject"}
          </span>
          <span className="opacity-50">·</span>
          <span>{log.reason}</span>
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-black tabular-nums",
          gain ? "" : "text-rose-300",
        )}
        style={gain ? { color: XP_GOLD } : undefined}
      >
        {gain ? "+" : "−"}
        {fmtXp(Math.abs(log.amount))} XP
      </span>
      <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:block">
        {fmtClock(log.createdAt)}
      </span>
      {canUndo && task && (
        <div className="shrink-0">
          <UndoTaskButton task={task} />
        </div>
      )}
    </div>
  );
}
