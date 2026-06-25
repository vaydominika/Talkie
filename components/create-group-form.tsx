"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type CreateGroupAction = (formData: FormData) => Promise<void>;

export function CreateGroupForm({ createGroupAction }: { createGroupAction: CreateGroupAction }) {
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
    <form action={createGroupAction} className="space-y-4">
      <input type="hidden" name="importedVocabIds" value={JSON.stringify(vocabIds)} />
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
          Group Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          placeholder="e.g. Spanish Beginners"
          className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Describe your study group..."
          className="mt-1 w-full rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-rose-400 resize-none"
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
                Copy your currently selected vocabulary words into this new group.
              </p>
            </div>
          </label>
        </div>
      )}

      <Button type="submit" className="w-full">
        Create Group
      </Button>
    </form>
  );
}
