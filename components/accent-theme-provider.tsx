"use client";

import * as React from "react";

export const accentThemes = [
  { value: "pink", label: "Baby pink" },
  { value: "sage", label: "Sage green" },
  { value: "blue", label: "Pale blue" },
  { value: "yellow", label: "Yellow" },
] as const;

export type AccentTheme = (typeof accentThemes)[number]["value"];

const STORAGE_KEY = "talkie-accent-theme";
const accentThemeValues = new Set<AccentTheme>(accentThemes.map((theme) => theme.value));

type AccentThemeContextValue = {
  accentTheme: AccentTheme;
  setAccentTheme: (theme: AccentTheme) => void;
};

const AccentThemeContext = React.createContext<AccentThemeContextValue | null>(null);

function isAccentTheme(value: string | undefined | null): value is AccentTheme {
  return Boolean(value && accentThemeValues.has(value as AccentTheme));
}

export function AccentThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentTheme, setAccentThemeState] = React.useState<AccentTheme>("pink");

  React.useEffect(() => {
    const activeTheme = document.documentElement.dataset.accentTheme;
    if (isAccentTheme(activeTheme)) setAccentThemeState(activeTheme);
  }, []);

  const setAccentTheme = React.useCallback((theme: AccentTheme) => {
    document.documentElement.dataset.accentTheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    setAccentThemeState(theme);
  }, []);

  return (
    <AccentThemeContext.Provider value={{ accentTheme, setAccentTheme }}>
      {children}
    </AccentThemeContext.Provider>
  );
}

export function useAccentTheme() {
  const context = React.useContext(AccentThemeContext);
  if (!context) throw new Error("useAccentTheme must be used inside AccentThemeProvider");
  return context;
}
