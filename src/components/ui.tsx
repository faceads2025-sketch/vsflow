import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between px-8 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: "gray" | "green" | "blue" | "yellow" | "red" | "purple";
}) {
  const map: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-brand-50 text-brand-600",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-600",
    purple: "bg-violet-100 text-violet-700",
  };
  return <span className={cn("pill", map[color])}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-6xl">👻</div>
      <p className="text-lg font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-faint">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
