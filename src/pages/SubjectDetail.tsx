import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  Layers,
  ListChecks,
  Pencil,
  Pin,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ConfirmAction,
  ChapterDialog,
  TaskDialog,
  TopicDialog,
} from "@/components/editors";
import {
  CompletedTag,
  CompleteTaskButton,
  UndoTaskButton,
} from "@/components/task-actions";
import {
  fmtXp,
  isTopicMastered,
  levelInfo,
  pct,
  STAGE_META,
  sumLogs,
  tint,
  topicStageStatus,
  XP_GOLD,
  type Everything,
  type StageKey,
} from "@/lib/study";
import {
  CardShell,
  DifficultyTag,
  EmptyCard,
  MiniProgress,
  PageHeader,
  StagePill,
  SubjectGlyph,
  XpBadge,
} from "@/components/study-ui";
import type { Doc } from "@/convex/_generated/dataModel";

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Loading subject…
    </div>
  );
}

export default function SubjectDetail() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const data = useQuery(api.study.everything);
  const deleteSubject = useMutation(api.study.deleteSubject);
  const deleteChapter = useMutation(api.study.deleteChapter);
  const deleteTopic = useMutation(api.study.deleteTopic);
  const setPinned = useMutation(api.study.setPinnedTask);

  const [chapterOpen, setChapterOpen] = useState(false);
  const [chapterKey, setChapterKey] = useState(0);
  const [topicOpen, setTopicOpen] = useState(false);
  const [topicChapter, setTopicChapter] = useState<Doc<"chapters">["_id"] | null>(null);
  const [topicKey, setTopicKey] = useState(0);
  const [taskDraft, setTaskDraft] = useState<{
    topicId: Doc<"topics">["_id"];
    topicName: string;
    presetStage?: string;
  } | null>(null);
  const [taskKey, setTaskKey] = useState(0);
  const [editingTask, setEditingTask] = useState<Doc<"tasks"> | null>(null);

  const subject = useMemo(
    () => data?.subjects.find((s) => s._id === subjectId) ?? null,
    [data, subjectId],
  );

  if (!data) return <Loading />;
  if (!subject) {
    return (
      <EmptyCard
        icon="🔍"
        title="Subject not found"
        description="It may have been deleted. Head back to your subjects."
        action={
          <Button asChild>
            <Link to="/subjects">
              <ArrowLeft className="size-4" /> Back to subjects
            </Link>
          </Button>
        }
      />
    );
  }

  const color = subject.color;
  const chapters = data.chapters
    .filter((c) => c.subjectId === subject._id)
    .sort((a, b) => a.order - b.order || a._creationTime - b._creationTime);
  const thresholds = data.prefs?.thresholds?.length ? data.prefs.thresholds : [0];
  const totals = sumLogs(data.logs);
  const xp = totals.bySubject.get(subject._id) ?? 0;
  const totalXp = totals.total;
  const info = levelInfo(xp, thresholds);
  const subjectTasks = data.tasks.filter((t) => t.subjectId === subject._id);
  const done = subjectTasks.filter((t) => t.status === "completed").length;
  const doneChapters = chapters.filter((ch) => {
    const chTasks = data.tasks.filter((t) => t.chapterId === ch._id);
    return chTasks.length > 0 && chTasks.every((t) => t.status === "completed");
  }).length;
  const pinnedTaskId = data.prefs?.pinnedTaskId ?? null;
  const firstChapterId = chapters[0]?._id;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/subjects"
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> All subjects
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <SubjectGlyph name={subject.name} color={color} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {subject.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Chapter by chapter, topic by topic — five stages each. Study genuinely,
                then mark it done.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => { setChapterOpen(true); setChapterKey((k) => k + 1); }}>
              <Plus className="size-4" /> Add chapter
            </Button>
            <ConfirmAction
              title={`Delete ${subject.name} entirely?`}
              description="Deletes every chapter, topic, task and XP record inside this subject. This cannot be undone — export a backup first if unsure."
              confirmLabel="Delete subject"
              onConfirm={() => void deleteSubject({ subjectId: subject._id })}
            >
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Trash2 className="size-4" />
              </Button>
            </ConfirmAction>
          </div>
        </div>
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CardShell className="p-4">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Subject XP
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color }}>
            {fmtXp(xp)}
          </p>
        </CardShell>
        <CardShell className="p-4">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Subject level
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color }}>
            Lv {info.level}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {info.nextThreshold !== null ? `${fmtXp(info.xpForNext ?? 0)} XP to Lv ${info.level + 1}` : "Max level"}
          </p>
        </CardShell>
        <CardShell className="p-4">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Tasks
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color }}>
            {done}/{subjectTasks.length}
          </p>
          <div className="mt-2">
            <MiniProgress value={pct(done, subjectTasks.length)} color={color} />
          </div>
        </CardShell>
        <CardShell className="p-4">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Chapters
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color }}>
            {doneChapters}/{chapters.length}
          </p>
          <div className="mt-2">
            <MiniProgress value={pct(doneChapters, chapters.length)} color={color} />
          </div>
        </CardShell>
      </div>

      {/* chapters */}
      {chapters.length === 0 ? (
        <EmptyCard
          icon="🗂️"
          title="No chapters in this subject yet"
          description="Chapters are the big blocks of a subject — like “Functions” or “Thermodynamics”. Inside each chapter you’ll add topics, then break topics into stage tasks."
          action={
            <Button onClick={() => setChapterOpen(true)}>
              <Layers className="size-4" /> Create your first chapter
            </Button>
          }
        />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={firstChapterId ? [firstChapterId] : []}
          key={subject._id}
          className="space-y-3"
        >
          {chapters.map((chapter) => {
            const chapterTasks = data.tasks.filter((t) => t.chapterId === chapter._id);
            const chapterDone = chapterTasks.filter((t) => t.status === "completed").length;
            const topics = data.topics
              .filter((t) => t.chapterId === chapter._id)
              .sort((a, b) => a.order - b.order || a._creationTime - b._creationTime);
            const chapterComplete =
              chapterTasks.length > 0 && chapterTasks.every((t) => t.status === "completed");
            return (
              <AccordionItem
                key={chapter._id}
                value={chapter._id}
                className="rounded-2xl border border-border/70 bg-card/60 px-5"
              >
                <AccordionTrigger className="group py-4 hover:no-underline">
                  <div className="flex w-full items-center gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ background: tint(color, 0.9) }}
                    >
                      <BookOpenCheck className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-foreground">
                          {chapter.name}
                        </span>
                        {chapterComplete && (
                          <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                            Complete
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {topics.length} topics · {chapterTasks.length} tasks
                      </p>
                    </div>
                    <div className="hidden w-36 shrink-0 sm:block">
                      <MiniProgress value={pct(chapterDone, chapterTasks.length)} color={color} />
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: chapterDone ? color : undefined }}>
                      {pct(chapterDone, chapterTasks.length)}%
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-border/60 pt-4 pb-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        onClick={() => {
                          setTopicChapter(chapter._id);
                          setTopicOpen(true);
                          setTopicKey((k) => k + 1);
                        }}
                      >
                        <Plus className="size-3.5" /> Add topic
                      </Button>
                      {chapter.description && (
                        <p className="text-xs text-muted-foreground">{chapter.description}</p>
                      )}
                    </div>
                    <ConfirmAction
                      title={`Delete “${chapter.name}”?`}
                      description={`Deletes its ${topics.length} topics, ${chapterTasks.length} tasks and every XP record earned there.`}
                      confirmLabel="Delete chapter"
                      onConfirm={() => void deleteChapter({ chapterId: chapter._id })}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" /> Delete chapter
                      </Button>
                    </ConfirmAction>
                  </div>

                  {topics.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No topics yet. Add the first one — e.g. “Domain & Range” — then
                        break it into Foundation → Mastery tasks.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topics.map((topic) => {
                        const topicTasks = data.tasks
                          .filter((t) => t.topicId === topic._id)
                          .sort(
                            (a, b) =>
                              stageIdx(a.stage) - stageIdx(b.stage) ||
                              a.createdAt - b.createdAt,
                          );
                        const mastered = isTopicMastered(topicTasks);
                        const stageStatus = topicStageStatus(topicTasks);
                        return (
                          <div
                            key={topic._id}
                            className="rounded-xl border border-border/60 bg-muted/25 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-foreground">
                                    {topic.name}
                                  </h4>
                                  {mastered && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300 uppercase">
                                      <Check className="size-3" /> Mastered
                                    </span>
                                  )}
                                </div>
                                {topic.description && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {topic.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <ConfirmAction
                                  title={`Delete topic “${topic.name}”?`}
                                  description={`Deletes its ${topicTasks.length} tasks and the XP history earned there.`}
                                  confirmLabel="Delete topic"
                                  onConfirm={() => void deleteTopic({ topicId: topic._id })}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 text-muted-foreground hover:text-red-400"
                                  >
                                    <Trash2 className="size-3.5" /> Delete topic
                                  </Button>
                                </ConfirmAction>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setTaskKey((k) => k + 1);
                                    setTaskDraft({
                                      topicId: topic._id,
                                      topicName: topic.name,
                                    });
                                  }}
                                >
                                  <Plus className="size-3.5" /> Add task
                                </Button>
                              </div>
                            </div>

                            {/* stage map — click a stage to add a task there */}
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              {stageStatus.map((st) => (
                                <button
                                  key={st.stage}
                                  type="button"
                                  onClick={() => {
                                    setTaskKey((k) => k + 1);
                                    setTaskDraft({
                                      topicId: topic._id,
                                      topicName: topic.name,
                                      presetStage: st.stage,
                                    });
                                  }}
                                  title={`${STAGE_META[st.stage].label} — ${STAGE_META[st.stage].hint} (click to add a task here)`}
                                >
                                  <StagePill
                                    stage={st.stage}
                                    done={st.done}
                                    total={st.total}
                                    className="cursor-pointer transition hover:brightness-125"
                                  />
                                </button>
                              ))}
                              <span className="ml-auto hidden text-[11px] text-muted-foreground lg:inline">
                                Click a stage to add a task there
                              </span>
                            </div>

                            {topicTasks.length === 0 ? (
                              <p className="mt-3 text-xs text-muted-foreground">
                                No tasks yet — start with Foundation, e.g. “Read the
                                textbook section and write notes”.
                              </p>
                            ) : (
                              <ul className="mt-3 divide-y divide-border/50">
                                {topicTasks.map((task) => (
                                  <TaskRow
                                    key={task._id}
                                    task={task}
                                    data={data}
                                    thresholds={thresholds}
                                    totalXp={totalXp}
                                    color={color}
                                    isPinned={pinnedTaskId === task._id}
                                    onPin={() =>
                                      void setPinned({
                                        taskId: pinnedTaskId === task._id ? null : task._id,
                                      })
                                    }
                                    onEdit={() => setEditingTask(task)}
                                  />
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <ChapterDialog key={`chapter-${chapterKey}`} open={chapterOpen} onOpenChange={setChapterOpen} subjectId={subject._id} />
      {topicChapter && (
        <TopicDialog
          key={`topic-${topicKey}`}
          open={topicOpen}
          onOpenChange={setTopicOpen}
          chapterId={topicChapter}
        />
      )}
      {taskDraft && (
        <TaskDialog
          key={`create-${taskDraft.topicId}-${taskKey}`}
          open={!!taskDraft}
          onOpenChange={(o) => !o && setTaskDraft(null)}
          topicId={taskDraft.topicId}
          topicName={taskDraft.topicName}
          presetStage={taskDraft.presetStage}
        />
      )}
      {editingTask && (
        <TaskDialog
          key={`edit-${editingTask._id}`}
          open={!!editingTask}
          onOpenChange={(o) => !o && setEditingTask(null)}
          topicId={editingTask.topicId}
          existing={editingTask}
        />
      )}
    </div>
  );
}

function stageIdx(s: string): number {
  const order: string[] = ["foundation", "basic", "intermediate", "advanced", "mastery"];
  const i = order.indexOf(s);
  return i === -1 ? 99 : i;
}

function TaskRow({
  task,
  data,
  thresholds,
  totalXp,
  color,
  isPinned,
  onPin,
  onEdit,
}: {
  task: Doc<"tasks">;
  data: Everything;
  thresholds: number[];
  totalXp: number;
  color: string;
  isPinned: boolean;
  onPin: () => void;
  onEdit: () => void;
}) {
  const deleteTask = useMutation(api.study.deleteTask);
  const stageMeta = STAGE_META[task.stage as StageKey];
  const completed = task.status === "completed";
  return (
    <li className={cn("flex items-center gap-3 py-3", completed && "opacity-80")}>
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: completed ? "#34d399" : stageMeta.color }}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium text-foreground", completed && "line-through")}>
          {task.name}
          {isPinned && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 align-middle text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
              <Target className="size-2.5" style={{ color }} /> Next mission
            </span>
          )}
        </p>
        {task.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <StagePill stage={task.stage} />
          <DifficultyTag difficulty={task.difficulty} />
        </div>
      </div>
      <XpBadge xp={task.xp} className="hidden sm:inline-flex" />
      <div className="flex shrink-0 items-center gap-1.5">
        {completed ? (
          <>
            <CompletedTag task={task} />
            <UndoTaskButton task={task} />
          </>
        ) : (
          <CompleteTaskButton task={task} thresholds={thresholds} totalBefore={totalXp} />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" className="text-muted-foreground">
              <ListChecks className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!completed && (
              <DropdownMenuItem onClick={onPin} className="gap-2">
                <Pin className="size-4" style={{ color }} />
                {isPinned ? "Remove as next mission" : "Make next mission"}
              </DropdownMenuItem>
            )}
            {!completed && (
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Pencil className="size-4" /> Edit task
              </DropdownMenuItem>
            )}
            {completed && (
              <DropdownMenuItem disabled className="gap-2">
                <Pencil className="size-4" /> Undo first to edit
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <ConfirmAction
              title={`Delete “${task.name}”?`}
              description={
                completed
                  ? `This task earned ${fmtXp(task.xp)} XP — deleting it also removes those ledger records from your history.`
                  : "This removes the task. No XP was ever earned for it."
              }
              confirmLabel="Delete task"
              onConfirm={() => void deleteTask({ taskId: task._id })}
            >
              <span className="flex w-full items-center gap-2 text-destructive focus:text-destructive">
                <Trash2 className="size-4" /> Delete task…
              </span>
            </ConfirmAction>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
