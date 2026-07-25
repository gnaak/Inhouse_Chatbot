import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useThemeRouteSync = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    const root = document.documentElement;

    if (isAdmin) {
      root.classList.remove("dark");
      return;
    }

    const saved = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)",
    ).matches;
    const wantsDark = saved === "dark" || (!saved && prefersDark);

    if (wantsDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [pathname]);
};
