import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Lock, Trophy } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CardShell, PageHeader } from "@/components/study-ui";
import { computeMilestones, fmtXp, sumLogs } from "@/lib/study";

export default function Achievements() {
  const data = useQuery(api.study.everything);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading achievements…
      </div>
    );
  }

  const milestones = computeMilestones(data);
  const unlocked = milestones.filter((m) => m.unlocked);
  const total = sumLogs(data.logs).total;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achievements"
        description="Badges are awarded only for recorded, verifiable progress — never for visiting or guessing."
      >
        <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-2 text-right">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Unlocked
          </p>
          <p className="text-lg font-black tabular-nums text-amber-300">
            {unlocked.length}/{milestones.length}
          </p>
        </div>
      </PageHeader>

      {total === 0 && (
        <CardShell className="p-6 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-300" />
            Your first completion unlocks “First Mission”. Earn XP by genuinely completing
            tasks — go to{" "}
            <Link to="/missions" className="text-indigo-300 underline">
              Missions
            </Link>
            .
          </p>
        </CardShell>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {milestones.map((m) => (
          <div
            key={m.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-5 transition",
              m.unlocked
                ? "border-amber-400/20 bg-gradient-to-br from-amber-400/[0.07] to-transparent"
                : "border-border/60 bg-card/40",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-2xl border text-xl",
                  m.unlocked
                    ? "border-amber-300/30 bg-amber-400/10 shadow-lg shadow-amber-500/10"
                    : "border-border/70 bg-muted/40 grayscale",
                )}
              >
                {m.unlocked ? m.icon : <Lock className="size-4 text-muted-foreground" />}
              </span>
              <div className="min-w-0">
                <h3
                  className={cn(
                    "text-sm font-bold text-foreground",
                    !m.unlocked && "opacity-70",
                  )}
                >
                  {m.title}
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{m.detail}</p>
              </div>
              {m.unlocked && (
                <span className="ml-auto shrink-0 rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300 uppercase">
                  Unlocked
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {unlocked.length === 0 ? (
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link to="/missions">Find your first mission</Link>
          </Button>
        </div>
      ) : null}
      <p className="text-center text-xs text-muted-foreground">
        {unlocked.length > 0
          ? `${unlocked.length} achievement${unlocked.length === 1 ? "" : "s"} earned from ${fmtXp(total)} XP of genuinely completed study.`
          : "Achievements unlock the moment your records genuinely support them."}
      </p>
    </div>
  );
}
