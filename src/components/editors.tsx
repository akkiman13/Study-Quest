import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DEFAULT_DIFFICULTY_BY_STAGE,
  DEFAULT_XP_BY_STAGE,
  STAGE_META,
  SUBJECT_COLOR_CHOICES,
  tint,
  XP_GOLD,
  type StageKey,
} from "@/lib/study";

export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold tracking-wide text-foreground uppercase">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic destructive confirm trigger wrapper
// ---------------------------------------------------------------------------

export function ConfirmAction({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  children,
  triggerClassName,
  disabled,
}: {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
  triggerClassName?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void run();
            }}
            disabled={busy}
            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30 dark:bg-destructive/70"
          >
            {busy ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Subject (create / edit)
// ---------------------------------------------------------------------------

export function SubjectDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: Doc<"subjects">;
}) {
  const create = useMutation(api.study.createSubject);
  const update = useMutation(api.study.updateSubject);
  const [color, setColor] = useState(existing?.color ?? SUBJECT_COLOR_CHOICES[0]);
  const [name, setName] = useState(existing?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (existing) {
        await update({ subjectId: existing._id, name, color });
      } else {
        await create({ name, color });
      }
      setColor(SUBJECT_COLOR_CHOICES[0]);
      setName("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit subject" : "Add subject"}</DialogTitle>
          <DialogDescription>
            {existing
              ? "Rename it or pick a new accent colour."
              : "Subjects are the top level of your study map."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <FormField label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Biology"
              required
              autoFocus
            />
          </FormField>
          <FormField label="Accent colour">
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-8 rounded-full border-2 transition",
                    color === c ? "scale-110 border-white" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                  style={{ background: c }}
                  aria-label={`Colour ${c}`}
                />
              ))}
            </div>
          </FormField>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {existing ? "Save changes" : "Add subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Chapter
// ---------------------------------------------------------------------------

export function ChapterDialog({
  open,
  onOpenChange,
  subjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: Id<"subjects">;
}) {
  const create = useMutation(api.study.createChapter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    try {
      await create({
        subjectId,
        name: String(fd.get("name") ?? ""),
        description: String(fd.get("description") ?? "") || undefined,
      });
      (e.currentTarget as HTMLFormElement).reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add chapter</DialogTitle>
          <DialogDescription>
            A chapter groups related topics, e.g. “Functions” or “Thermodynamics”.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <FormField label="Chapter name">
            <Input name="name" placeholder="e.g. Functions" required autoFocus />
          </FormField>
          <FormField label="Description" hint="Optional — what this chapter covers">
            <Textarea name="description" rows={2} placeholder="Study from fundamentals to advanced problems…" />
          </FormField>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Create chapter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Topic
// ---------------------------------------------------------------------------

export function TopicDialog({
  open,
  onOpenChange,
  chapterId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: Id<"chapters">;
}) {
  const create = useMutation(api.study.createTopic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    try {
      await create({
        chapterId,
        name: String(fd.get("name") ?? ""),
        description: String(fd.get("description") ?? "") || undefined,
      });
      (e.currentTarget as HTMLFormElement).reset();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create topic:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add topic</DialogTitle>
          <DialogDescription>
            A topic is one idea inside the chapter — every topic is studied through the five stages.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <FormField label="Topic name">
            <Input name="name" placeholder="e.g. Domain & Range" required autoFocus />
          </FormField>
          <FormField label="Description" hint="Optional">
            <Textarea name="description" rows={2} placeholder="What this topic is about…" />
          </FormField>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Create topic
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Task — the core of the game. XP value always chosen by the user.
// ---------------------------------------------------------------------------

export function TaskDialog({
  open,
  onOpenChange,
  topicId,
  topicName,
  existing,
  presetStage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: Id<"topics">;
  topicName?: string;
  existing?: Doc<"tasks">;
  presetStage?: string;
}) {
  const create = useMutation(api.study.createTask);
  const update = useMutation(api.study.updateTask);
  const initialStage =
    existing?.stage ?? (presetStage as StageKey) ?? "foundation";
  const [stage, setStage] = useState<string>(initialStage);
  const [difficulty, setDifficulty] = useState<string>(
    existing?.difficulty ?? DEFAULT_DIFFICULTY_BY_STAGE[initialStage as StageKey] ?? "easy",
  );
  const [xp, setXp] = useState<number>(
    existing?.xp ?? DEFAULT_XP_BY_STAGE[initialStage as StageKey] ?? 30,
  );
  const [xpTouched, setXpTouched] = useState(!!existing);
  const [diffTouched, setDiffTouched] = useState(!!existing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStageChange = (s: string) => {
    setStage(s);
    if (!xpTouched) setXp(DEFAULT_XP_BY_STAGE[s as StageKey] ?? 30);
    if (!diffTouched) setDifficulty(DEFAULT_DIFFICULTY_BY_STAGE[s as StageKey] ?? "easy");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? "") || undefined,
      stage: stage as StageKey,
      difficulty: difficulty as "easy" | "medium" | "hard",
      xp,
    };
    try {
      if (existing) {
        await update({ taskId: existing._id, ...payload });
      } else {
        await create({ topicId, ...payload });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const stageMeta = STAGE_META[stage as StageKey];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit task" : "Add task"}</DialogTitle>
          <DialogDescription>
            {topicName ? `Inside ${topicName}. ` : ""}
            You decide exactly how much XP completing it is worth.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <FormField label="Task name">
            <Input name="name" defaultValue={existing?.name} placeholder="e.g. Solve 15 domain & range questions" required autoFocus />
          </FormField>
          <FormField label="Description" hint="Optional — what you will actually do">
            <Textarea name="description" rows={2} defaultValue={existing?.description} placeholder="e.g. Work through the practice set and check answers…" />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase">Stage</Label>
              <Select value={stage} onValueChange={onStageChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STAGE_META) as StageKey[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      <span style={{ color: STAGE_META[s].color }}>●</span> {STAGE_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stageMeta && (
                <p className="text-[11px] text-muted-foreground">{stageMeta.hint}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase">Difficulty</Label>
              <Select value={difficulty} onValueChange={(d) => { setDifficulty(d); setDiffTouched(true); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["easy", "medium", "hard"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase">XP reward</Label>
              <Input
                type="number"
                min={1}
                step={5}
                value={xp}
                onChange={(e) => {
                  setXp(Number(e.target.value));
                  setXpTouched(true);
                }}
                className="font-semibold tabular-nums"
                style={xp > 0 ? { borderColor: tint(XP_GOLD, 0.4), color: XP_GOLD } : undefined}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !xp || xp < 1}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              <Plus className="size-4" />
              {existing ? "Save task" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
