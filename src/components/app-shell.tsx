import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpenText,
  Crosshair,
  Flame,
  History,
  LayoutDashboard,
  LineChart,
  LogOut,
  Moon,
  Settings,
  Sun,
  Trophy,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { applyTheme, getTheme, toggleTheme } from "@/lib/theme";
import {
  computeStreak,
  fmtXp,
  levelInfo,
  sumLogs,
  XP_GOLD,
  tint,
} from "@/lib/study";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: BookOpenText },
  { to: "/missions", label: "Missions", icon: Crosshair },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-sky-500 text-sm font-black text-white shadow-md shadow-indigo-500/25">
        S
      </span>
      <span className="text-[15px] font-bold tracking-tight text-foreground">
        Study<span style={{ color: XP_GOLD }}>Quest</span>
      </span>
    </div>
  );
}

function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">(getTheme());
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("text-muted-foreground", className)}
      onClick={() => setTheme(toggleTheme())}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function HeaderStats() {
  const data = useQuery(api.study.everything);
  if (!data) return null;
  const { total } = sumLogs(data.logs);
  const streak = computeStreak(data.logs);
  const info = levelInfo(total, data.prefs?.thresholds ?? [0]);
  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold sm:inline-flex"
        style={{
          color: streak.current > 0 ? "#fb923c" : "var(--muted-foreground)",
          borderColor: streak.current > 0 ? tint("#fb923c", 0.35) : "var(--border)",
          background: streak.current > 0 ? tint("#fb923c", 0.08) : "transparent",
        }}
        title={`${streak.current}-day streak · ${streak.best}-day best`}
      >
        <Flame className="size-3.5" />
        {streak.current} {streak.current === 1 ? "day" : "days"}
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tabular-nums"
        style={{ color: XP_GOLD, borderColor: tint(XP_GOLD, 0.35), background: tint(XP_GOLD, 0.1) }}
        title={`Level ${info.level} · ${fmtXp(info.xpInto)} XP into this level`}
      >
        <span className="text-[10px] font-black text-black/70" style={{ background: XP_GOLD, borderRadius: 4, padding: "1px 5px" }}>
          LVL {info.level}
        </span>
        {fmtXp(total)} XP
      </span>
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || user?.email || "U")
    .split(/[\s@]+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none ring-ring/40 transition hover:ring-2 focus-visible:ring-2" aria-label="Account menu">
          <Avatar className="size-8 border border-border">
            <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-sky-500 text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{user?.name ?? "Guest adventurer"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email ?? "Anonymous session"}</p>
        </div>
        <DropdownMenuItem
          onClick={() => void handleSignOut()}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/dashboard"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              isActive
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SeedData() {
  const data = useQuery(api.study.everything);
  const ensureInit = useMutation(api.study.ensureInit);
  const ran = useRef(false);
  useEffect(() => {
    if (!data || ran.current) return;
    // A brand-new account has no prefs row — seed the three default subjects
    // and the level curve exactly once.
    if (!data.prefs) {
      ran.current = true;
      void ensureInit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  return null;
}

export default function AppShell() {
  const isMobile = useIsMobile();
  const [theme] = useState(getTheme);
  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeedData />
      <div className="flex">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col border-r border-border/70 bg-sidebar/60 px-4 py-5">
            <div className="px-2 pb-6">
              <Brand />
            </div>
            <div className="flex-1">
              <SideNav />
            </div>
            <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-3">
              <LevelMini />
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1 md:pl-[236px]">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
            <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
              {isMobile && <Brand />}
              <div className={cn("ml-auto flex items-center gap-1.5 sm:gap-2", !isMobile && "ml-0")}>
                <HeaderStats />
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
            {isMobile && (
              <div className="border-t border-border/50 px-2 py-1.5">
                <div className="flex gap-1 overflow-x-auto pb-0.5">
                  {NAV.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/dashboard"}
                      className={({ isActive }) =>
                        cn(
                          "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                          isActive
                            ? "bg-white/[0.08] text-foreground"
                            : "text-muted-foreground",
                        )
                      }
                    >
                      <item.icon className="size-3.5" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </header>

          <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function LevelMini() {
  const data = useQuery(api.study.everything);
  const { total } = sumLogs(data?.logs ?? []);
  const thresholds = data?.prefs?.thresholds ?? [0];
  const info = levelInfo(total, thresholds.length ? thresholds : [0]);
  const next = info.nextThreshold;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Current level
        </span>
        <span className="text-xs font-black text-foreground">Lv {info.level}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: tint(XP_GOLD, 0.15) }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${info.progress * 100}%`, background: XP_GOLD }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground tabular-nums">
        {fmtXp(info.xpInto)} XP {next !== null && <>· {fmtXp(info.xpForNext ?? 0)} to Lv {info.level + 1}</>}
      </p>
    </div>
  );
}
