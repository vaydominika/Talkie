"use client";

import { useState } from "react";
import { KanaChecker } from "@/components/kana-checker";
import { KanaFlashcards } from "@/components/kana-flashcards";

export function JapaneseTabs() {
  const [tab, setTab] = useState<"kana" | "flashcards">("kana");
  return <div><div className="mb-6 border-b"><button onClick={() => setTab("kana")} className={`mr-5 border-b-2 px-1 pb-3 text-sm font-medium ${tab === "kana" ? "border-rose-600 text-rose-700" : "border-transparent text-muted-foreground"}`}>Kana learning</button><button onClick={() => setTab("flashcards")} className={`border-b-2 px-1 pb-3 text-sm font-medium ${tab === "flashcards" ? "border-rose-600 text-rose-700" : "border-transparent text-muted-foreground"}`}>Flashcards</button></div>{tab === "kana" ? <KanaChecker /> : <KanaFlashcards />}</div>;
}
