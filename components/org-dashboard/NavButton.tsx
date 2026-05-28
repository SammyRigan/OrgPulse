import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export default function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-(--accent) text-(--accent)"
          : "border-transparent text-(--text-subtle) hover:border-(--border-strong) hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

