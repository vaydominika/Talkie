"use client";

import { useEffect, useState } from "react";
import { KanaChecker } from "@/components/kana-checker";
import { KanaFlashcards } from "@/components/kana-flashcards";

type JapaneseTab = "kana" | "flashcards";

const tabs: { id: JapaneseTab; label: string }[] = [
  { id: "kana", label: "Kana learning" },
  { id: "flashcards", label: "Flashcards" },
];

export function JapaneseTabs() {
  const [tab, setTab] = useState<JapaneseTab>("kana");
  const [tabReady, setTabReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("talkie-japanese-active-tab");
    if (stored === "kana" || stored === "flashcards") setTab(stored);
    setTabReady(true);
  }, []);

  const selectTab = (slug: JapaneseTab) => {
    setTab(slug);
    localStorage.setItem("talkie-japanese-active-tab", slug);
  };

  return (
    <div>
      <div className="mb-6 border-b">
        {tabs.map((item) => (
          <JapaneseTabButton
            key={item.id}
            active={tabReady && tab === item.id}
            label={item.label}
            onClick={() => selectTab(item.id)}
          />
        ))}
      </div>

      {!tabReady ? null : tab === "kana" ? <KanaChecker /> : <KanaFlashcards />}
    </div>
  );
}

function JapaneseTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`mr-5 border-b-2 px-1 pb-3 text-sm font-medium ${
        active ? "border-rose-600 text-rose-700" : "border-transparent text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}
