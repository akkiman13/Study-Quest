import { cn } from "@/lib/utils";
import { tint, XP_GOLD, type StageKey, STAGE_META, DIFFICULTY_META } from "@/lib/study";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function XpBadge({ xp, className }: { xp: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums",
        className,
      )}
      style={{
        color: XP_GOLD,
        borderColor: tint(XP_GOLD, 0.35),
        background: tint(XP_GOLD, 0.1),
      }}
    >
      <SparkIcon className="size-3" />
      {Math.round(xp).toLocaleString("en-US")} XP
    </span>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l1.9 5.7a2 2 0 001.3 1.3L21 11l-5.8 2a2 2 0 00-1.3 1.3L12 20l-1.9-5.7a2 2 0 00-1.3-1.3L3 11l5.8-2a2 2 0 001.3-1.3L12 2z" />
    </svg>
  );
}

export function SubjectGlyph({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims =
    size === "sm" ? "size-8 rounded-lg text-sm" : size === "lg" ? "size-14 rounded-2xl text-2xl" : "size-10 rounded-xl text-base";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bold text-white shadow-sm",
        dims,
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${color}, ${tint(color, 0.55)})` }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function StagePill({
  stage,
  done,
  total,
  className,
}: {
  stage: string;
  done?: number;
  total?: number;
  className?: string;
}) {
  const meta = STAGE_META[stage as StageKey] ?? {
    label: stage,
    hint: "",
    color: "#94a3b8",
  };
  const complete = typeof done === "number" && typeof total === "number" && total > 0 && done === total;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        complete ? "line-through opacity-80" : "",
        className,
      )}
      style={{
        color: meta.color,
        borderColor: tint(meta.color, 0.3),
        background: tint(meta.color, 0.08),
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: complete ? meta.color : tint(meta.color, 0.4) }}
      />
      {meta.label}
      {typeof done === "number" && (
        <span className="font-medium tabular-nums opacity-90">
          {done}
          {typeof total === "number" ? `/${total}` : ""}
        </span>
      )}
    </span>
  );
}

export function DifficultyTag({ difficulty }: { difficulty: string }) {
  const meta = DIFFICULTY_META[difficulty] ?? { label: difficulty, color: "#94a3b8" };
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ color: meta.color, background: tint(meta.color, 0.09) }}
    >
      {meta.label}
    </span>
  );
}

export function MiniProgress({
  value,
  color,
  className,
  trackClassName,
}: {
  value: number; // 0..100
  color?: string;
  className?: string;
  trackClassName?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full", className)}
      style={{ background: color ? tint(color, 0.14) : "var(--muted)" }}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", trackClassName)}
        style={{
          width: `${v}%`,
          background: color ?? "var(--primary)",
        }}
      />
    </div>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ background: color }}
    />
  );
}

export function CardShell({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_10px_30px_-18px_rgba(0,0,0,0.5)]",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function StatLine({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-lg font-semibold tabular-nums text-foreground"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function EmptyCard({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <CardShell className={cn("p-10 text-center", className)}>
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        {icon && (
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-muted/50 text-xl">
            {icon}
          </div>
        )}
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </CardShell>
  );
}

/** Faithful progress bar with the level text baked in, used on subject cards. */
export function LevelBar({
  color,
  info,
  totalXp,
  compact,
}: {
  color: string;
  info: { level: number; progress: number; xpForNext: number | null; capped: boolean };
  totalXp: number;
  compact?: boolean;
}) {
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold tracking-wide text-foreground uppercase">
          Lv {info.level}
        </span>
        {info.capped ? (
          <span className="text-xs font-medium text-muted-foreground">Max level</span>
        ) : (
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {Math.round(totalXp).toLocaleString("en-US")} XP
            {!compact && info.xpForNext !== null && (
              <span className="text-muted-foreground/70"> · {info.xpForNext.toLocaleString("en-US")} to next</span>
            )}
          </span>
        )}
      </div>
      <MiniProgress value={info.progress * 100} color={color} />
    </div>
  );
}
