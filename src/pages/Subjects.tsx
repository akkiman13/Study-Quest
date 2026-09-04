import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { BookOpenText, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmAction, SubjectDialog } from "@/components/editors";
import {
  buildStructure,
  fmtXp,
  levelInfo,
  pct,
  sumLogs,
  tint,
} from "@/lib/study";
import {
  CardShell,
  EmptyCard,
  MiniProgress,
  PageHeader,
  SubjectGlyph,
} from "@/components/study-ui";
import type { Doc } from "@/convex/_generated/dataModel";

function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Loading subjects…
    </div>
  );
}

export default function Subjects() {
  const data = useQuery(api.study.everything);
  const deleteSubject = useMutation(api.study.deleteSubject);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"subjects"> | null>(null);

  const subjects = useMemo(
    () => (data ? buildStructure(data).subjects : []),
    [data],
  );

  if (!data) return <Loading />;

  const thresholds = data.prefs?.thresholds?.length ? data.prefs.thresholds : [0];
  const bySubject = sumLogs(data.logs).bySubject;

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Your whole study map lives under these subjects — each one has its own XP, level and chapters."
      >
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Add subject
        </Button>
      </PageHeader>

      {subjects.length === 0 ? (
        <EmptyCard
          icon="📖"
          title="No subjects yet"
          description="Add Mathematics, Physics, Chemistry — or any subject you study — and start building chapters."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Create your first subject
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const color = subject.color;
            const chapters = data.chapters
              .filter((c) => c.subjectId === subject._id)
              .sort((a, b) => a.order - b.order);
            const subjectTasks = data.tasks.filter((t) => t.subjectId === subject._id);
            const done = subjectTasks.filter((t) => t.status === "completed");
            const doneChapters = chapters.filter((ch) => {
              const chTasks = data.tasks.filter((t) => t.chapterId === ch._id);
              return chTasks.length > 0 && chTasks.every((t) => t.status === "completed");
            }).length;
            const xp = bySubject.get(subject._id) ?? 0;
            const info = levelInfo(xp, thresholds);
            const overall = pct(done.length, subjectTasks.length);

            return (
              <CardShell
                key={subject._id}
                className="group p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/15"
                style={{
                  background: `linear-gradient(180deg, ${tint(color, 0.06)}, transparent 45%), var(--card)`,
                }}
              >
                <div className="flex items-start gap-3">
                  <SubjectGlyph name={subject.name} color={color} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-semibold text-foreground">
                      {subject.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {chapters.length} chapters · {subjectTasks.length} tasks
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-white/[0.06] hover:text-foreground"
                        aria-label={`Manage ${subject.name}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditing(subject)}
                        className="gap-2"
                      >
                        <Pencil className="size-4" /> Rename / recolour
                      </DropdownMenuItem>
                      <ConfirmAction
                        title={`Delete ${subject.name}?`}
                        description={
                          <>
                            This permanently deletes the subject, its{" "}
                            <span className="font-semibold text-foreground">
                              {chapters.length} chapters
                            </span>
                            ,{" "}
                            <span className="font-semibold text-foreground">
                              {subjectTasks.length} tasks
                            </span>{" "}
                            and every XP record for it. Consider exporting a backup
                            first.
                          </>
                        }
                        confirmLabel="Delete subject"
                        onConfirm={() => void deleteSubject({ subjectId: subject._id })}
                      >
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="size-4" /> Delete subject
                        </DropdownMenuItem>
                      </ConfirmAction>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-sm font-bold tracking-wide uppercase">
                      Lv {info.level}
                    </span>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {fmtXp(xp)} XP
                    </span>
                  </div>
                  <MiniProgress value={info.progress * 100} color={color} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
                    <p className="text-base font-bold tabular-nums" style={{ color }}>
                      {done.length}/{subjectTasks.length}
                    </p>
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Tasks done
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
                    <p className="text-base font-bold tabular-nums" style={{ color }}>
                      {doneChapters}/{chapters.length}
                    </p>
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Chapters
                    </p>
                  </div>
                </div>

                <Link
                  to={`/subjects/${subject._id}`}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white/[0.02] py-2 text-sm font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <BookOpenText className="size-4" />
                  Open {subject.name}
                  <ChevronRight className="size-4 opacity-60" />
                </Link>
              </CardShell>
            );
          })}

          <button
            onClick={() => setAddOpen(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 text-muted-foreground transition hover:border-indigo-400/40 hover:bg-indigo-400/[0.04] hover:text-foreground"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl border border-border bg-muted/40">
              <Plus className="size-5" />
            </span>
            <span className="text-sm font-medium">Add another subject</span>
          </button>
        </div>
      )}

      <SubjectDialog open={addOpen} onOpenChange={setAddOpen} />
      {editing && (
        <SubjectDialog
          key={editing._id}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          existing={editing}
        />
      )}
    </div>
  );
}
