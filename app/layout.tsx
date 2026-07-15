import type { Metadata } from "next";
import "./globals.css";
import { AccentThemeProvider } from "@/components/accent-theme-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
export const metadata: Metadata = { title: "Talkie", description: "Language learning for Japanese and German" };
const accentThemeScript = `try{const theme=localStorage.getItem("talkie-accent-theme");if(["pink","sage","blue","yellow"].includes(theme))document.documentElement.dataset.accentTheme=theme}catch{}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: accentThemeScript }} /></head><body><ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange><AccentThemeProvider><TooltipProvider>{children}<Toaster richColors closeButton /></TooltipProvider></AccentThemeProvider></ThemeProvider></body></html>; }
