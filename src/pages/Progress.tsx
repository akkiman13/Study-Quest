import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Link } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  CardShell,
  MiniProgress,
  PageHeader,
  StagePill,
  SubjectGlyph,
} from "@/components/study-ui";
import {
  buildStructure,
  dayKey,
  fmtDay,
  fmtXp,
  levelInfo,
  pct,
  stageIndex,
  STAGE_ORDER,
  sumLogs,
  XP_GOLD,
  type Everything,
} from "@/lib/study";

const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" };

function ChartCard({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <CardShell className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </CardShell>
  );
}

export default function Progress() {
  const data = useQuery(api.study.everything);

  const charts = useMemo(() => {
    if (!data) return null;
    const thresholds = data.prefs?.thresholds?.length ? data.prefs.thresholds : [0];
    const totals = sumLogs(data.logs);
    const info = levelInfo(totals.total, thresholds);

    // --- XP per day (net) for the last 42 days ---
    const dayBuckets = new Map<string, number>();
    for (const l of data.logs) {
      const k = dayKey(l.createdAt);
      dayBuckets.set(k, (dayBuckets.get(k) ?? 0) + l.amount);
    }
    const days: { label: string; xp: number }[] = [];
    const now = Date.now();
    for (let i = 41; i >= 0; i--) {
      const ts = now - i * 86_400_000;
      const k = dayKey(ts);
      days.push({
        label: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        xp: dayBuckets.get(k) ?? 0,
      });
    }

    // --- cumulative XP over time (last completion each day) ---
    const sorted = [...data.logs].sort((a, b) => a.createdAt - b.createdAt);
    const perDayCum: { label: string; total: number }[] = [];
    let running = 0;
    let lastDay = "";
    for (const l of sorted) {
      const k = dayKey(l.createdAt);
      running += l.amount;
      if (k !== lastDay) {
        perDayCum.push({
          label: new Date(l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          total: running,
        });
        lastDay = k;
      } else if (perDayCum.length > 0) {
        perDayCum[perDayCum.length - 1].total = running;
      }
    }
    if (perDayCum.length === 0 && totals.total !== 0) {
      perDayCum.push({ label: fmtDay(Date.now()), total: totals.total });
    }

    // --- XP share by subject ---
    const subjects = buildStructure(data).subjects;
    const pie = subjects
      .filter((s) => (totals.bySubject.get(s._id) ?? 0) > 0)
      .map((s) => ({
        name: s.name,
        value: totals.bySubject.get(s._id) ?? 0,
        color: s.color,
      }));
    const pieTotal = pie.reduce((s, p) => s + p.value, 0);

    // --- completions per day ---
    const compBuckets = new Map<string, number>();
    for (const l of data.logs) {
      if (l.type === "complete") {
        const k = dayKey(l.createdAt);
        compBuckets.set(k, (compBuckets.get(k) ?? 0) + 1);
      }
    }
    const compDays = days.map((d, i) => {
      const ts = Date.now() - (41 - i) * 86_400_000;
      return { ...d, count: compBuckets.get(dayKey(ts)) ?? 0 };
    });

    return { thresholds, totals, info, days, perDayCum, pie, pieTotal, compDays, subjects };
  }, [data]);

  if (!data || !charts) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Crunching your numbers…
      </div>
    );
  }

  const { info, totals, days, perDayCum, pie, pieTotal, compDays, subjects } = charts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        description="Every chart is computed from recorded completions and your XP ledger — never from guesses or time-on-page."
      />

      {/* headline stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CardShell className="p-5">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Total XP</p>
          <p className="mt-1 text-2xl font-black tabular-nums" style={{ color: XP_GOLD }}>
            {fmtXp(totals.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {totals.total === 0 ? "Nothing earned yet" : `${info.xpForNext !== null ? fmtXp(info.xpForNext) : "—"} XP to Level ${info.level + 1}`}
          </p>
        </CardShell>
        <CardShell className="p-5">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Tasks completed</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-foreground">
            {data.tasks.filter((t) => t.status === "completed").length}
          </p>
          <p className="text-xs text-muted-foreground">
            of {data.tasks.length} tasks on your map
          </p>
        </CardShell>
        <CardShell className="p-5">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Level</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-foreground">Lv {info.level}</p>
          <p className="text-xs text-muted-foreground">
            {Math.round(info.progress * 100)}% through this level
          </p>
        </CardShell>
        <CardShell className="p-5">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">XP earned today</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-foreground">
            {fmtXp(days[days.length - 1]?.xp ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">net, after any corrections</p>
        </CardShell>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="XP earned per day" subtitle="Net XP from your ledger, last 42 days">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(value) => [`${value} XP`, "Net XP"]}
                />
                <Bar dataKey="xp" radius={[4, 4, 0, 0]}>
                  {days.map((d, i) => (
                    <Cell key={i} fill={d.xp >= 0 ? "#6366f1" : "#fb7185"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Cumulative XP" subtitle="Total XP at the end of each study day">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perDayCum} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumXp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={XP_GOLD} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={XP_GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={46} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(value) => [`${value} XP`, "Total XP"]}
                />
                <Area type="monotone" dataKey="total" stroke={XP_GOLD} strokeWidth={2} fill="url(#cumXp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="XP by subject" subtitle="Where your XP came from">
          {pie.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Complete tasks in a subject to see its share.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {pie.map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                      formatter={(value, name) => [`${fmtXp(Number(value))} XP`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-2.5">
                {pie.map((p) => (
                  <li key={p.name} className="flex items-center gap-2.5 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                    <span className="truncate text-muted-foreground">{p.name}</span>
                    <span className="ml-auto shrink-0 font-semibold tabular-nums text-foreground">
                      {fmtXp(p.value)}
                    </span>
                    <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {pieTotal > 0 ? Math.round((p.value / pieTotal) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Completions per day" subtitle="Recorded task completions, last 42 days">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compDays} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(value) => [`${value}`, "Completed"]}
                />
                <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* per-subject + stages */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SubjectBreakdown data={data} />
        <StageBreakdown data={data} />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Data is derived from {data.logs.length} ledger entr{data.logs.length === 1 ? "y" : "ies"} and{" "}
        {data.tasks.length} task record{data.tasks.length === 1 ? "" : "s"}.
      </p>
    </div>
  );
}

function SubjectBreakdown({ data }: { data: Everything }) {
  const { subjects, subjectColor } = buildStructure(data);
  const totals = sumLogs(data.logs);
  const thresholds = data.prefs?.thresholds?.length ? data.prefs.thresholds : [0];
  return (
    <ChartCard title="Subjects at a glance" subtitle="Completion and level per subject">
      <ul className="space-y-4">
        {subjects.map((s) => {
          const tasks = data.tasks.filter((t) => t.subjectId === s._id);
          const done = tasks.filter((t) => t.status === "completed").length;
          const xp = totals.bySubject.get(s._id) ?? 0;
          const info = levelInfo(xp, thresholds);
          return (
            <li key={s._id} className="flex items-center gap-3">
              <SubjectGlyph name={s.name} color={s.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    Lv {info.level} · {fmtXp(xp)} XP
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <MiniProgress value={pct(done, tasks.length)} color={s.color} className="flex-1" />
                  <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    {done}/{tasks.length}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
        {subjects.length === 0 && (
          <li className="text-sm text-muted-foreground">
            No subjects —{" "}
            <Link to="/subjects" className="text-indigo-300 underline">
              add one
            </Link>
            .
          </li>
        )}
      </ul>
    </ChartCard>
  );
}

function StageBreakdown({ data }: { data: Everything }) {
  const all = data.tasks;
  return (
    <ChartCard title="Learning stages" subtitle="Across every subject — tasks by stage">
      <ul className="space-y-4">
        {STAGE_ORDER.map((stage) => {
          const inStage = all.filter((t) => t.stage === stage);
          const done = inStage.filter((t) => t.status === "completed").length;
          const meta = stageColor(stage);
          return (
            <li key={stage} className="flex items-center gap-3">
              <StagePill stage={stage} className="w-36 justify-start" />
              <MiniProgress value={pct(done, inStage.length)} color={meta} className="flex-1" />
              <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {done}/{inStage.length}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">
        Topics are studied Foundation → Basic → Intermediate → Advanced → Mastery. A topic is
        only “mastered” once every stage with tasks is fully complete.
      </p>
    </ChartCard>
  );
}

function stageColor(stage: string): string {
  return stageIndex(stage) <= 0
    ? "#38bdf8"
    : stageIndex(stage) === 1
      ? "#2dd4bf"
      : stageIndex(stage) === 2
        ? "#fbbf24"
        : stageIndex(stage) === 3
          ? "#fb923c"
          : "#fb7185";
}
