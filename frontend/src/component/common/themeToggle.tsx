import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/hooks/common/useTheme";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100 text-neutral-600"
    >
      {theme === "dark" ? (
        <SunIcon className="w-4 h-4" />
      ) : (
        <MoonIcon className="w-4 h-4" />
      )}
    </button>
  );
};

export default ThemeToggle;
