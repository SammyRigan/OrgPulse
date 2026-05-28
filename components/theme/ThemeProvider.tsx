 "use client";
 
 import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
 
 type ThemePreference = "system" | "light" | "dark";
type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};
 
 type ThemeContextValue = {
   preference: ThemePreference;
   setPreference: (value: ThemePreference) => void;
   resolvedTheme: "light" | "dark";
 };
 
 const ThemeContext = createContext<ThemeContextValue | null>(null);
 
 const STORAGE_KEY = "orgpulse.theme";
 
 function getInitialPreference(): ThemePreference {
   try {
     const raw = window.localStorage.getItem(STORAGE_KEY);
     if (raw === "light" || raw === "dark" || raw === "system") return raw;
   } catch {
     // ignore
   }
   return "system";
 }
 
 function getInitialSystemDark(): boolean {
   return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
 }
 
 function resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
   if (preference === "light") return "light";
   if (preference === "dark") return "dark";
   return systemDark ? "dark" : "light";
 }
 
 function applyThemeToDom(theme: "light" | "dark") {
   if (typeof document === "undefined") return;
   document.documentElement.dataset.theme = theme;
 }
 
 export function ThemeProvider({ children }: { children: React.ReactNode }) {
   const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
   const [systemDark, setSystemDark] = useState<boolean>(getInitialSystemDark);
 
   useEffect(() => {
     if (!window.matchMedia) return;
     const media = window.matchMedia("(prefers-color-scheme: dark)");
    const legacyMedia = media as LegacyMediaQueryList;
    const handler = (event: MediaQueryListEvent) => setSystemDark(event.matches);

    if (typeof media.addEventListener === "function") media.addEventListener("change", handler);
    else legacyMedia.addListener?.(handler);
 
     return () => {
      if (typeof media.removeEventListener === "function") media.removeEventListener("change", handler);
      else legacyMedia.removeListener?.(handler);
     };
   }, []);
 
   const resolvedTheme = useMemo(() => resolveTheme(preference, systemDark), [preference, systemDark]);
 
   useEffect(() => {
     applyThemeToDom(resolvedTheme);
   }, [resolvedTheme]);
 
   const setPreference = useCallback((value: ThemePreference) => {
     setPreferenceState(value);
     try {
       window.localStorage.setItem(STORAGE_KEY, value);
     } catch {
       // ignore
     }
   }, []);
 
   const value = useMemo<ThemeContextValue>(
     () => ({ preference, setPreference, resolvedTheme }),
     [preference, resolvedTheme, setPreference]
   );
 
   return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
 }
 
 export function useTheme() {
   const value = useContext(ThemeContext);
   if (!value) throw new Error("useTheme must be used within ThemeProvider");
   return value;
 }
 
