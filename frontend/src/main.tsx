import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const savedTheme = window.localStorage.getItem("theme");
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
