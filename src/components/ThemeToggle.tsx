"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const isLightStored = localStorage.getItem("theme") === "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLight(isLightStored);
    if (isLightStored) {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextLight = !isLight;
    setIsLight(nextLight);
    if (nextLight) {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      style={{
        backgroundColor: "var(--bg-hover)",
        borderColor: "var(--card-border)",
        color: "var(--text-secondary)",
      }}
      className="w-10 h-10 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0 border hover:opacity-80"
      title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
    </button>
  );
}
