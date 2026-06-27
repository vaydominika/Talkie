"use client";

import { useEffect, useState } from "react";
import { KanaChecker } from "@/components/kana-checker";
import { KanaFlashcards } from "@/components/kana-flashcards";

export function JapaneseTabs() {
  const [tab, setTab] = useState<"kana" | "flashcards">("kana");
  const [tabReady, setTabReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("talkie-japanese-active-tab");
    if (stored === "kana" || stored === "flashcards") {
      setTab(stored);
    }
    setTabReady(true);
  }, []);

  const selectTab = (slug: "kana" | "flashcards") => {
    setTab(slug);
    localStorage.setItem("talkie-japanese-active-tab", slug);
  };

  return <div><div className="mb-6 border-b"><button onClick={() => selectTab("kana")} className={`mr-5 border-b-2 px-1 pb-3 text-sm font-medium ${tabReady && tab === "kana" ? "border-rose-600 text-rose-700" : "border-transparent text-muted-foreground"}`}>Kana learning</button><button onClick={() => selectTab("flashcards")} className={`border-b-2 px-1 pb-3 text-sm font-medium ${tabReady && tab === "flashcards" ? "border-rose-600 text-rose-700" : "border-transparent text-muted-foreground"}`}>Flashcards</button></div>{!tabReady ? null : tab === "kana" ? <KanaChecker /> : <KanaFlashcards />}</div>;
}
