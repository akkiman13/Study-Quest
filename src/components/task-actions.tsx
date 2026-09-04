import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtXp, levelInfo, XP_GOLD, tint, type StageKey, STAGE_META } from "@/lib/study";

type CompleteResult = {
  ok: boolean;
  gained?: number;
  totalAfter?: number;
  levelBefore?: number;
  levelAfter?: number;
};

interface Celebration {
  gained: number;
  totalAfter: number;
  levelBefore: number;
  levelAfter: number;
  name: string;
}

export function XP_CelebrationOverlay({
  celeb,
  onClose,
}: {
  celeb: Celebration | null;
  onClose: () => void;
}) {
  const levelUp = !!celeb && celeb.levelAfter > celeb.levelBefore;
  useEffect(() => {
    if (!celeb) return;
    const t = setTimeout(onClose, 5200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celeb]);

  return (
    <AnimatePresence>
      {celeb && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-card p-8 text-center shadow-2xl"
            initial={{ scale: 0.85, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>

            {levelUp && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 12 }}
              >
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/30">
                  <Trophy className="size-8" />
                </div>
                <p className="mt-4 text-xs font-bold tracking-[0.3em] text-amber-300 uppercase">
                  Level up
                </p>
                <p className="text-4xl font-black tracking-tight text-foreground">
                  Level {celeb.levelAfter}
                </p>
              </motion.div>
            )}

            {!levelUp && (
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border text-black shadow-lg"
                style={{ background: XP_GOLD, boxShadow: `0 10px 30px -8px ${tint(XP_GOLD, 0.5)}` }}
              >
                <Sparkles className="size-7" />
              </div>
            )}

            <p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Task completed
            </p>
            <p className="mt-1 line-clamp-2 text-base font-semibold text-foreground">
              {celeb.name}
            </p>

            <p className="mt-4 text-3xl font-black tabular-nums" style={{ color: XP_GOLD }}>
              +{fmtXp(celeb.gained)} XP
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Total XP{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {fmtXp(celeb.totalAfter - celeb.gained)} → {fmtXp(celeb.totalAfter)}
              </span>
            </p>

            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={onClose}
            >
              Nice work
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The ONLY way to earn XP in the UI. Confirms first, then calls
 * study.completeTask (which guards against double-awarding server-side).
 */
export function CompleteTaskButton({
  task,
  thresholds,
  totalBefore,
  variant = "outline",
  size = "sm",
  className,
  onCompleted,
  compact,
  style,
}: {
  task: Doc<"tasks">;
  thresholds: number[];
  totalBefore: number;
  variant?: "outline" | "secondary" | "default";
  size?: "sm" | "default" | "lg";
  className?: string;
  onCompleted?: (res: CompleteResult) => void;
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  const completeTask = useMutation(api.study.completeTask);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celeb, setCeleb] = useState<Celebration | null>(null);

  const after = totalBefore + task.xp;
  const afterInfo = levelInfo(after, thresholds.length ? thresholds : [0]);
  const beforeLevel = levelInfo(totalBefore, thresholds.length ? thresholds : [0]).level;
  const willLevelUp = afterInfo.level > beforeLevel;
  const stageMeta = STAGE_META[task.stage as StageKey];

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await completeTask({ taskId: task._id });
      setOpen(false);
      if (res.ok) {
        const r = res as { ok: true; gained: number; totalAfter: number; levelBefore: number; levelAfter: number };
        setCeleb({
          gained: r.gained,
          totalAfter: r.totalAfter,
          levelBefore: r.levelBefore,
          levelAfter: r.levelAfter,
          name: task.name,
        });
        onCompleted?.(r);
      } else {
        setError("This task was already completed — XP can only be earned once.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn("gap-1.5", className)}
        onClick={() => setOpen(true)}
        disabled={busy}
        style={style}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {compact ? "Complete" : `Complete · +${fmtXp(task.xp)} XP`}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark task complete?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to record real study progress. This adds XP exactly once
              and writes it to your history.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-sm font-semibold text-foreground">{task.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[11px] uppercase tracking-wide"
                style={{ color: stageMeta?.color, borderColor: tint(stageMeta?.color ?? "#888", 0.3), background: tint(stageMeta?.color ?? "#888", 0.08) }}
              >
                {stageMeta?.label}
              </Badge>
              <span className="ml-auto text-sm font-bold tabular-nums" style={{ color: XP_GOLD }}>
                +{fmtXp(task.xp)} XP
              </span>
            </div>
            <div className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
              <p className="flex justify-between">
                <span>Total XP after</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {fmtXp(totalBefore)} → {fmtXp(after)}
                </span>
              </p>
              {willLevelUp && afterInfo.nextThreshold !== null && (
                <p className="flex justify-between" style={{ color: XP_GOLD }}>
                  <span>Level up!</span>
                  <span className="font-semibold tabular-nums">
                    Level {beforeLevel} → Level {afterInfo.level}
                  </span>
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void run();
              }}
              disabled={busy}
              className="font-semibold"
              style={{ background: XP_GOLD, color: "#1c1917" }}
            >
              {busy ? "Recording…" : `Complete · +${fmtXp(task.xp)} XP`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <XP_CelebrationOverlay celeb={celeb} onClose={() => setCeleb(null)} />
    </>
  );
}

export function UndoTaskButton({
  task,
  variant = "ghost",
  size = "sm",
  className,
  onUndone,
}: {
  task: Doc<"tasks">;
  variant?: "ghost" | "outline";
  size?: "sm" | "default";
  className?: string;
  onUndone?: () => void;
}) {
  const undoTask = useMutation(api.study.undoTask);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await undoTask({ taskId: task._id });
      setOpen(false);
      if (!res.ok) setError("This task is not completed anymore.");
      else onUndone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn("gap-1.5 text-muted-foreground", className)}
        onClick={() => setOpen(true)}
        disabled={busy}
        title="Undo completion"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
        Undo
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo this completion?</AlertDialogTitle>
            <AlertDialogDescription>
              This was completed by mistake? A correction entry of{" "}
              <span className="font-semibold text-foreground">−{fmtXp(task.xp)} XP</span>{" "}
              will be recorded — your history is never silently erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void run();
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30 dark:bg-destructive/70"
            >
              {busy ? "Undoing…" : "Undo · −XP"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Small "completed" tag shown instead of the complete button. */
export function CompletedTag({ task }: { task: Doc<"tasks"> }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
      <Check className="size-3.5" />
      Completed
      <span className="font-medium opacity-80">· {fmtXp(task.xp)} XP earned</span>
    </span>
  );
}
