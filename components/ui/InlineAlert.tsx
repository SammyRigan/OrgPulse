import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  info: "border-(--border) bg-[color-mix(in_oklab,var(--surface)_86%,var(--bg))] text-[var(--text)]",
  success:
    "border-[color-mix(in_oklab,var(--success)_35%,var(--border))] bg-[color-mix(in_oklab,var(--success)_10%,var(--surface))] text-[var(--text)]",
  warning:
    "border-[color-mix(in_oklab,var(--warning)_35%,var(--border))] bg-[color-mix(in_oklab,var(--warning)_12%,var(--surface))] text-[var(--text)]",
  danger:
    "border-[color-mix(in_oklab,var(--danger)_35%,var(--border))] bg-[color-mix(in_oklab,var(--danger)_10%,var(--surface))] text-[var(--text)]",
};

export function InlineAlert({
  className,
  tone = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-[14px] border px-4 py-3 text-sm shadow-(--shadow-sm)", tones[tone], className)}
      {...props}
    />
  );
}

