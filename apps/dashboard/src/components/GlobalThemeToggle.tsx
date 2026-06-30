"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

export function GlobalThemeToggle() {
  return (
    <div className="fixed right-6 top-6 z-50">
      <ThemeToggle />
    </div>
  );
}
