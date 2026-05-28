import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-8 w-8 animate-spin rounded-full border-2 border-(--accent) border-t-transparent",
        className
      )}
      aria-hidden="true"
    />
  );
}

