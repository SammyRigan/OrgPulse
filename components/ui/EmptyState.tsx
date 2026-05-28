import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  className,
  title,
  description,
  action,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[18px] border border-dashed border-(--border) bg-(--surface) px-6 py-12 text-center shadow-(--shadow-sm)",
        className
      )}
      {...props}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-(--text-subtle)">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

