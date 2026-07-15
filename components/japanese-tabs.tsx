"use client";

import { useEffect, useState } from "react";
import { KanaChecker } from "@/components/kana-checker";
import { KanaFlashcards } from "@/components/kana-flashcards";
import { Button } from "@/components/ui/button";

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
      <div className="mb-6 flex flex-wrap gap-1 border-b" role="tablist" aria-label="Japanese study sections">
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
    <Button
      type="button"
      role="tab"
      aria-selected={active}
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-10 rounded-none border-b-2 bg-transparent px-3 font-medium shadow-none hover:bg-muted/60 ${
        active ? "border-ring text-foreground hover:text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Button>
  );
}
