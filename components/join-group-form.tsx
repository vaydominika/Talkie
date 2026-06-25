"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type JoinGroupAction = (formData: FormData) => Promise<void>;

export function JoinGroupForm({ joinGroupAction }: { joinGroupAction: JoinGroupAction }) {
  const [vocabIds, setVocabIds] = useState<string[]>([]);
  const [importVocab, setImportVocab] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("talkie-vocabulary-flashcards");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setVocabIds(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to read vocabulary flashcards from localStorage", e);
    }
  }, []);

  return (
    <form action={joinGroupAction} className="space-y-4">
      <input type="hidden" name="importedVocabIds" value={JSON.stringify(vocabIds)} />

      <div>
        <label htmlFor="inviteCode" className="block text-sm font-medium text-muted-foreground">
          Invite Code
        </label>
        <input
          type="text"
          id="inviteCode"
          name="inviteCode"
          placeholder="e.g. AB12XY"
          required
          maxLength={10}
          className="mt-1 h-10 w-full rounded-md border bg-background px-3 font-mono text-center text-lg uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      {vocabIds.length > 0 && (
        <div className="rounded-lg border border-rose-100 bg-rose-50/30 p-3 dark:border-rose-950/20 dark:bg-rose-950/5">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="importVocab"
              name="importVocab"
              checked={importVocab}
              onChange={(e) => setImportVocab(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-rose-900 dark:text-rose-400">
                Import active flashcards ({vocabIds.length} word{vocabIds.length > 1 ? "s" : ""})
              </span>
              <p className="text-xs text-muted-foreground">
                Copy non-duplicate vocabulary into the group after joining (if group owner allows).
              </p>
            </div>
          </label>
        </div>
      )}

      <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white">
        Join Group
      </Button>
    </form>
  );
}
