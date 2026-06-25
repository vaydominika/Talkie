import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { background: "hsl(var(--background))", foreground: "hsl(var(--foreground))", card: "hsl(var(--card))", "card-foreground": "hsl(var(--card-foreground))", primary: "hsl(var(--primary))", "primary-foreground": "hsl(var(--primary-foreground))", muted: "hsl(var(--muted))", "muted-foreground": "hsl(var(--muted-foreground))", border: "hsl(var(--border))", input: "hsl(var(--input))", ring: "hsl(var(--ring))" }, keyframes: { "answer-reveal": { "0%": { opacity: "0", transform: "translateY(0.35rem) scale(0.97)" }, "100%": { opacity: "1", transform: "translateY(0) scale(1)" } }, }, animation: { "answer-reveal": "answer-reveal 180ms ease-out both" } } },
  plugins: []
} satisfies Config;
