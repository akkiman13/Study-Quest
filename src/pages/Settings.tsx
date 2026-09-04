import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Download,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { applyTheme, getTheme } from "@/lib/theme";
import {
  LEVEL_PRESETS,
  buildThresholds,
  fmtXp,
  levelInfo,
  MAX_LEVELS,
  sumLogs,
  tint,
} from "@/lib/study";
import { CardShell, PageHeader, SubjectGlyph } from "@/components/study-ui";
import { ConfirmAction, SubjectDialog } from "@/components/editors";

function Section({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <CardShell className="p-6">
      <div className="mb-5 flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </CardShell>
  );
}

export default function Settings() {
  const data = useQuery(api.study.everything);
  const { user } = useAuth();
  const savePrefs = useMutation(api.study.savePrefs);
  const resetProgress = useMutation(api.study.resetProgress);
  const deleteSubject = useMutation(api.study.deleteSubject);
  const eraseAll = useMutation(api.study.eraseAll);
  const importBackup = useMutation(api.study.importBackup);

  const [theme, setTheme] = useState<"dark" | "light">(getTheme());
  const [customRows, setCustomRows] = useState<number[]>([]);
  const [customTouched, setCustomTouched] = useState(false);
  const [busyPrefs, setBusyPrefs] = useState(false);
  const [dataMsg, setDataMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [subjectAdd, setSubjectAdd] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Doc<"subjects"> | null>(
    null,
  );

  const thresholds =
    data?.prefs?.thresholds?.length && data.prefs
      ? data.prefs.thresholds
      : [0];
  const preset = data?.prefs?.preset ?? "classic";
  const total = sumLogs(data?.logs ?? []).total;

  // Load the current curve into the custom editor once per prefs change.
  useEffect(() => {
    if (!data?.prefs || customTouched) return;
    setCustomRows(data.prefs.thresholds.slice(0, 12));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.prefs]);

  const customCurve = useMemo(() => {
    const rows = customRows.filter((n) => Number.isFinite(n) && n >= 0);
    if (rows.length < 2) return [0, 500];
    const base = [...rows];
    while (base.length < MAX_LEVELS) {
      const last = base[base.length - 1];
      const prev = base[base.length - 2];
      const step = Math.max(100, last - prev);
      base.push(last + step);
    }
    return base;
  }, [customRows]);

  const applyPreset = async (id: string) => {
    setBusyPrefs(true);
    try {
      await savePrefs({ thresholds: buildThresholds(id), preset: id });
      setCustomRows(buildThresholds(id).slice(0, 12));
      setCustomTouched(false);
    } finally {
      setBusyPrefs(false);
    }
  };

  const saveCustom = async () => {
    setBusyPrefs(true);
    try {
      await savePrefs({ thresholds: customCurve, preset: "custom" });
      setCustomTouched(false);
      setDataMsg("Custom level curve saved.");
      setTimeout(() => setDataMsg(null), 2500);
    } finally {
      setBusyPrefs(false);
    }
  };

  const exportData = () => {
    if (!data) return;
    const payload = {
      app: "StudyQuest",
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: data.subjects.map((s) => ({
        key: s._id,
        name: s.name,
        color: s.color,
        order: s.order,
      })),
      chapters: data.chapters.map((c) => ({
        key: c._id,
        subjectKey: c.subjectId,
        name: c.name,
        description: c.description,
        order: c.order,
      })),
      topics: data.topics.map((t) => ({
        key: t._id,
        chapterKey: t.chapterId,
        name: t.name,
        description: t.description,
        order: t.order,
      })),
      tasks: data.tasks.map((t) => ({
        key: t._id,
        topicKey: t.topicId,
        name: t.name,
        description: t.description,
        stage: t.stage,
        difficulty: t.difficulty,
        xp: t.xp,
        status: t.status,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
      logs: data.logs.map((l) => ({
        subjectKey: l.subjectId,
        taskKey: l.taskId,
        taskName: l.taskName,
        amount: l.amount,
        type: l.type,
        reason: l.reason,
        createdAt: l.createdAt,
      })),
      thresholds: thresholds,
      preset,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studyquest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDataMsg("Backup downloaded.");
    setTimeout(() => setDataMsg(null), 2500);
  };

  const restoreFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        subjects?: unknown[];
        chapters?: unknown[];
        topics?: unknown[];
        tasks?: unknown[];
        logs?: unknown[];
        thresholds?: unknown;
        preset?: unknown;
      };
      if (!parsed.subjects || !parsed.thresholds) {
        throw new Error("Not a StudyQuest backup file");
      }
      await importBackup({
        subjects: parsed.subjects as never,
        chapters: (parsed.chapters ?? []) as never,
        topics: (parsed.topics ?? []) as never,
        tasks: (parsed.tasks ?? []) as never,
        logs: (parsed.logs ?? []) as never,
        thresholds: (parsed.thresholds ?? [0]) as number[],
        preset: (parsed.preset ?? "classic") as string,
      });
      setDataMsg("Backup restored — welcome back!");
    } catch (e) {
      setDataMsg(
        e instanceof Error ? `Restore failed: ${e.message}` : "Restore failed.",
      );
    }
    setTimeout(() => setDataMsg(null), 4000);
  };

  const onRestorePicked = async (file: File | undefined) => {
    if (!file) return;
    await restoreFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading settings…
      </div>
    );
  }

  const info = levelInfo(total, thresholds);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Make the game yours — levels, subjects, appearance and your data. Nothing here can fake progress."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* appearance */}
        <Section
          title="Appearance"
          description="StudyQuest is designed dark-first with quiet neutrals. Light mode is available."
          icon={theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        >
          <div className="grid grid-cols-2 gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  applyTheme(t);
                  setTheme(t);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition",
                  theme === t
                    ? "border-transparent text-white"
                    : "border-border/70 text-muted-foreground hover:text-foreground",
                )}
                style={
                  theme === t
                    ? { background: "linear-gradient(120deg, #6366f1, #8b5cf6)" }
                    : undefined
                }
              >
                {t === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                {t === "dark" ? "Dark (default)" : "Light"}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {user?.email ?? "anonymous guest"}
            </span>
            {user?.name ? ` (${user.name})` : ""}. StudyQuest is a private,
            single-owner workspace.
          </p>
        </Section>

        {/* level system */}
        <Section
          title="Level system"
          description={`You are Level ${info.level} with ${fmtXp(total)} XP. Levels only move when your ledger does.`}
          icon={<span className="text-sm font-black">LVL</span>}
        >
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {LEVEL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void applyPreset(p.id)}
                  disabled={busyPrefs}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    preset === p.id && p.id !== "custom"
                      ? "border-indigo-400/50 bg-indigo-400/[0.07]"
                      : "border-border/70 hover:border-white/20",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{p.label}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    {p.description}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Thresholds are cumulative XP per level. Changing them never rewrites
              your history — it only changes the level numbers you see.
            </p>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Custom curve — cumulative XP at each level
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i}>
                    <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                      Level {i + 1}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={customRows[i] ?? customCurve[i] ?? 0}
                      onChange={(e) => {
                        setCustomTouched(true);
                        const next = [...customCurve.slice(0, 12)];
                        next[i] = Number(e.target.value);
                        setCustomRows(next);
                      }}
                      className="h-8 text-xs tabular-nums"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => void saveCustom()} disabled={busyPrefs}>
                  {busyPrefs && <Loader2 className="size-3.5 animate-spin" />}
                  Save custom curve
                </Button>
                {customTouched && (
                  <span className="text-[11px] text-muted-foreground">
                    Levels beyond 12 continue with the same step size.
                  </span>
                )}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* subjects */}
      <Section
        title="Subjects"
        description="Add, rename or remove subjects. Everything you study is your own content."
        icon={<Pencil className="size-4" />}
      >
        <ul className="space-y-2">
          {[...data.subjects]
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <li
                key={s._id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
              >
                <SubjectGlyph name={s.name} color={s.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {s.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setEditingSubject(s)}
                >
                  <Pencil className="size-3.5" /> Rename
                </Button>
                <ConfirmAction
                  title={`Delete ${s.name}?`}
                  description="Deletes this subject, its chapters, topics, tasks and every XP record inside it. Export a backup first."
                  confirmLabel="Delete subject"
                  onConfirm={() => void deleteSubject({ subjectId: s._id })}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </ConfirmAction>
              </li>
            ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setSubjectAdd(true)}
        >
          <Plus className="size-3.5" /> Add subject
        </Button>
      </Section>

      {/* data */}
      <Section
        title="Your data"
        description="Personal progress is precious. Export JSON backups often — they restore everything, including XP history."
        icon={<Download className="size-4" />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Export / backup</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Downloads one JSON file with subjects, chapters, topics, tasks, the
              full XP ledger and your level curve.
            </p>
            <Button size="sm" className="mt-3" onClick={exportData}>
              <Download className="size-3.5" /> Export my data
            </Button>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Restore backup</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Replaces everything with a backup file. Current data is overwritten,
              so pick the file you actually want.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void onRestorePicked(e.target.files?.[0])}
            />
            <ConfirmAction
              title="Restore a backup?"
              description="This replaces ALL current subjects, tasks, XP and history with the contents of the file you pick."
              confirmLabel="Choose backup file"
              onConfirm={() => fileRef.current?.click()}
            >
              <Button size="sm" variant="outline" className="mt-3">
                <Upload className="size-3.5" /> Restore from backup…
              </Button>
            </ConfirmAction>
          </div>
        </div>
        {dataMsg && (
          <p className="mt-3 text-xs font-medium text-foreground">{dataMsg}</p>
        )}
        <div className="mt-6 border-t border-border/60 pt-5">
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Danger zone
          </p>
          <div className="flex flex-wrap gap-3">
            <ConfirmAction
              title="Reset progress and XP?"
              description={
                <>
                  Every task returns to <span className="font-semibold text-foreground">pending</span>{" "}
                  and the XP ledger is cleared — your total becomes 0 XP and you drop
                  back to Level 1. Chapters, topics and tasks stay so you can study
                  them again. Create a backup first.
                </>
              }
              confirmLabel="Reset progress"
              onConfirm={() => void resetProgress()}
            >
              <Button
                variant="outline"
                className="border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
              >
                Reset progress and XP
              </Button>
            </ConfirmAction>
            <ConfirmAction
              title="Erase everything?"
              description={
                <>
                  Warning — this permanently deletes every subject, chapter, topic,
                  task and XP record you created. StudyQuest returns to a fresh
                  start with the three default subjects. There is no undo — export a
                  backup first.
                </>
              }
              confirmLabel="Erase everything"
              onConfirm={() => void eraseAll()}
            >
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                Erase everything
              </Button>
            </ConfirmAction>
          </div>
        </div>
      </Section>

      <SubjectDialog open={subjectAdd} onOpenChange={setSubjectAdd} />
      {editingSubject && (
        <SubjectDialog
          key={editingSubject._id}
          open={!!editingSubject}
          onOpenChange={(o) => !o && setEditingSubject(null)}
          existing={editingSubject}
        />
      )}
    </div>
  );
}


