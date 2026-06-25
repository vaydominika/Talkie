"use client";

import { KanaReview } from "@/components/kana-review";
import { VocabularyReview } from "@/components/vocabulary-review";

export function ReviewTabs() {
  return (
    <div className="space-y-6">
      <KanaReview />
      <VocabularyReview />
    </div>
  );
}
