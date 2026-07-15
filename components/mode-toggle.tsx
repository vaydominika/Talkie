"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { accentThemes, type AccentTheme, useAccentTheme } from "@/components/accent-theme-provider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const { accentTheme, setAccentTheme } = useAccentTheme();
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Change color theme">
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-44">
      <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
        <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-muted-foreground">Accent</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={accentTheme} onValueChange={(value) => setAccentTheme(value as AccentTheme)}>
        {accentThemes.map((accent) => (
          <DropdownMenuRadioItem key={accent.value} value={accent.value}>
            <span className="accent-theme-swatch size-3.5 rounded-full border" data-accent-swatch={accent.value} aria-hidden />
            {accent.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
