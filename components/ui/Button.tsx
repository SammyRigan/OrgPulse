import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]",
  secondary:
    "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-sm)] hover:bg-[color-mix(in_oklab,var(--surface)_88%,var(--bg))] active:bg-[color-mix(in_oklab,var(--surface)_78%,var(--bg))]",
  outline:
    "border border-(--border) bg-transparent text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--surface)_65%,transparent)]",
  ghost:
    "bg-transparent text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--surface)_65%,transparent)]",
  destructive:
    "bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:bg-[color-mix(in_oklab,var(--danger)_92%,black)] active:bg-[color-mix(in_oklab,var(--danger)_84%,black)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
      {isLoading && (
        <span
          className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

