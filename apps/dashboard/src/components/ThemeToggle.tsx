"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const options = [
  {
    value: "light",
    label: "Light",
    icon: Sun
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon
  },
  {
    value: "system",
    label: "System",
    icon: Laptop
  }
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/70 p-1 text-xs dark:border-slate-700 dark:bg-slate-900/70 light:border-slate-200 light:bg-white">
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition",
              active
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100 light:text-slate-500 light:hover:bg-slate-100 light:hover:text-slate-900"
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
