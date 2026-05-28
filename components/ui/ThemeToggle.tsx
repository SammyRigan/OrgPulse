 "use client";
 
 import { Laptop, Moon, Sun } from "lucide-react";
 import { useTheme } from "@/components/theme/ThemeProvider";
 
 function ToggleButton({
   active,
   onClick,
   label,
   children,
 }: {
   active: boolean;
   onClick: () => void;
   label: string;
   children: React.ReactNode;
 }) {
   return (
     <button
       type="button"
       onClick={onClick}
       aria-pressed={active}
       className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border text-sm transition-colors ${
         active
           ? "border-(--border-strong) bg-(--surface) text-foreground shadow-(--shadow-sm)"
           : "border-(--border) bg-transparent text-(--text-subtle) hover:bg-[color-mix(in_oklab,var(--surface)_65%,transparent)] hover:text-foreground"
       }`}
     >
       <span className="sr-only">{label}</span>
       {children}
     </button>
   );
 }
 
 export default function ThemeToggle() {
   const { preference, setPreference } = useTheme();
 
   return (
     <div
      className="inline-flex items-center gap-1 rounded-[12px] border border-(--border) bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] p-1"
       role="group"
       aria-label="Theme"
     >
       <ToggleButton
         active={preference === "light"}
         onClick={() => setPreference("light")}
         label="Light theme"
       >
         <Sun className="h-4 w-4" />
       </ToggleButton>
       <ToggleButton
         active={preference === "system"}
         onClick={() => setPreference("system")}
         label="System theme"
       >
         <Laptop className="h-4 w-4" />
       </ToggleButton>
       <ToggleButton
         active={preference === "dark"}
         onClick={() => setPreference("dark")}
         label="Dark theme"
       >
         <Moon className="h-4 w-4" />
       </ToggleButton>
     </div>
   );
 }
 
