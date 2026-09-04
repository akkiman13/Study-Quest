import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  Check,
  Feather,
  Flag,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { tint, XP_GOLD } from "@/lib/study";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-sky-500 text-sm font-black text-white shadow-md shadow-indigo-500/25">
        S
      </span>
      <span className="text-[15px] font-bold tracking-tight text-foreground">
        Study<span style={{ color: XP_GOLD }}>Quest</span>
      </span>
    </span>
  );
}

function StageChip({ label, done }: { label: string; done?: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase " +
        (done ? "opacity-90" : "opacity-45")
      }
      style={{
        color: done ? "#2dd4bf" : "#a3a3a3",
        borderColor: done ? tint("#2dd4bf", 0.35) : "rgba(255,255,255,0.12)",
        background: done ? tint("#2dd4bf", 0.08) : "transparent",
      }}
    >
      {done && <Check className="size-3" />}
      {label}
    </span>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* backdrop glow — restrained, mostly hidden on small screens */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute -top-44 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.16), transparent)" }}
        />
      </div>

      {/* top bar */}
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Brand />
        <Button asChild variant="ghost" className="gap-1.5">
          <Link to="/auth">
            Open the app <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* hero */}
        <section className="grid items-center gap-12 pt-14 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <motion.div {...fadeUp}>
            <p
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{
                color: "#a5b4fc",
                borderColor: tint("#818cf8", 0.3),
                background: tint("#818cf8", 0.08),
              }}
            >
              <ShieldCheck className="size-3.5" />
              Private by design — built for one adventurer: you
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Studying,
              <br />
              turned into a{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(100deg, #fcd34d, #fbbf24 55%, #f59e0b)",
                }}
              >
                game.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              StudyQuest is a quiet, personal dashboard that rewards real study.
              You author every subject, chapter and mission yourself — set the XP,
              study, mark it complete, and level up. No timers, no guesses, no
              fake progress.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="px-7 font-semibold shadow-lg shadow-indigo-500/20">
                <Link to="/auth">
                  Start your quest <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5" style={{ color: XP_GOLD }} />
              Everything on your dashboard is content you created yourself.
            </p>
          </motion.div>

          {/* product glimpse */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="mx-auto w-full max-w-md"
          >
            <div className="relative">
              <div
                className="absolute -inset-6 rounded-3xl blur-2xl"
                style={{ background: tint("#6366f1", 0.14) }}
                aria-hidden
              />
              <div className="relative rounded-2xl border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                    Dashboard
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      color: "#fb923c",
                      borderColor: tint("#fb923c", 0.35),
                      background: tint("#fb923c", 0.1),
                    }}
                  >
                    🔥 3-day streak
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Level
                    </p>
                    <p className="text-4xl font-black text-foreground">7</p>
                  </div>
                  <p className="text-lg font-black tabular-nums" style={{ color: XP_GOLD }}>
                    2,140 XP
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: tint(XP_GOLD, 0.14) }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "68%",
                      background: `linear-gradient(90deg, ${tint(XP_GOLD, 0.7)}, ${XP_GOLD})`,
                    }}
                  />
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-xl border border-border/70 bg-muted/25 p-3">
                  <span
                    className="flex size-9 items-center justify-center rounded-lg text-white"
                    style={{ background: "#6366f1" }}
                  >
                    M
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted-foreground">
                      Mathematics / Functions
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      Solve 15 domain & range problems
                    </p>
                  </div>
                  <span className="text-xs font-black tabular-nums" style={{ color: XP_GOLD }}>
                    +100
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <StageChip label="Foundation" done />
                  <StageChip label="Basic" done />
                  <StageChip label="Intermediate" />
                  <StageChip label="Advanced" />
                  <StageChip label="Mastery" />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* principles */}
        <section className="grid gap-4 border-t border-border/60 py-14 sm:grid-cols-3">
          {[
            {
              icon: <Feather className="size-4" />,
              title: "You own the content",
              body: "Subjects, chapters, topics and missions are all yours. There are no pre-made decks pretending to know your syllabus.",
            },
            {
              icon: <Target className="size-4" />,
              title: "You set every XP value",
              body: "A quick read can be worth 30 XP; a hard problem set, 200. Your rewards match the effort you decide they took.",
            },
            {
              icon: <Check className="size-4" />,
              title: "No progress is ever faked",
              body: "XP only moves when you mark a task complete. Every point is recorded with a reason, and every level is earned.",
            },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-muted/40 text-indigo-300">
                {p.icon}
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </section>

        {/* how it works */}
        <section id="how-it-works" className="scroll-mt-8 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.25em] text-indigo-300 uppercase">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Build your map, then earn your way through it
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              StudyQuest gives studying the shape of a game — chapters as zones,
              topics as quests, and tasks as the small battles you win with real work.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Author your study plan",
                body: "Create a subject, add chapters, then break each topic into Foundation, Basic, Intermediate, Advanced and Mastery tasks with the XP you choose.",
                icon: <BookOpenText className="size-5" />,
              },
              {
                n: "02",
                title: "Study, then mark complete",
                body: "You do the learning first — the app never assumes it. When a task is genuinely done, complete it and the XP is recorded in your history.",
                icon: <Flag className="size-5" />,
              },
              {
                n: "03",
                title: "Level up for real",
                body: "Watch progress bars fill and levels climb — every one of them backed by completed tasks you can audit any time.",
                icon: <Sparkles className="size-5" />,
              },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                className="relative rounded-2xl border border-border/60 bg-card/50 p-6"
              >
                <span className="text-[11px] font-black text-muted-foreground/50">{s.n}</span>
                <span className="mt-6 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/10 text-indigo-300">
                  {s.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* final CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/60 px-6 py-16 text-center sm:px-12">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-60"
            style={{
              background:
                "radial-gradient(closest-side at 50% 100%, rgba(99,102,241,0.14), transparent)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              The only way to level up is to actually learn.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Start with 0 XP and an empty map — then make it yours, one genuinely
              completed task at a time.
            </p>
            <Button asChild size="lg" className="mt-7 px-8 font-semibold shadow-lg shadow-indigo-500/20">
              <Link to="/auth">
                Begin at Level 1 <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-10 text-xs text-muted-foreground sm:px-8">
        <Brand />
        <p>A personal study tool. No leaderboards, no feeds — just your progress.</p>
      </footer>
    </div>
  );
}
