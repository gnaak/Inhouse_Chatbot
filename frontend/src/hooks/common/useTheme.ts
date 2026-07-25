import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const listeners = new Set<() => void>();

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.add("theme-instant");
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  void root.offsetHeight;
  requestAnimationFrame(() => {
    root.classList.remove("theme-instant");
  });
  window.localStorage.setItem(STORAGE_KEY, theme);
  listeners.forEach((l) => l());
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const getSnapshot = (): Theme => {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

const getServerSnapshot = (): Theme => "light";

if (typeof window !== "undefined") {
  applyTheme(getInitialTheme());
}

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = (next: Theme) => applyTheme(next);
  const toggleTheme = () => applyTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggleTheme, setTheme };
};
