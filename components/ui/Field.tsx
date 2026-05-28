import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1 block text-sm font-medium text-(--text-muted)", className)}
      {...props}
    />
  );
}

const controlBase =
  "w-full rounded-[12px] border border-(--border) bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[var(--shadow-sm)] placeholder:text-(--text-subtle) focus:border-[color-mix(in_oklab,var(--accent)_55%,var(--border))] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:bg-[color-mix(in_oklab,var(--surface)_70%,var(--bg))] disabled:text-(--text-subtle)";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, "min-h-24 resize-none", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlBase, className)} {...props} />;
}

export function HelpText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-xs text-(--text-subtle)", className)} {...props} />;
}

