"use client";

import { useState } from "react";
import { AppModal } from "@/components/app-modal";
import { Button } from "@/components/ui/button";
import { CreateGroupForm } from "@/components/create-group-form";
import { JoinGroupForm } from "@/components/join-group-form";

type GroupAction = (formData: FormData) => Promise<void>;
type PreviewAction = (formData: FormData) => Promise<GroupPreview>;
type Language = { id: string; code: string; name: string; nativeName: string };
type PersonalVocabulary = { id: string; displayForm: string; languageId: string; translations: { text: string }[] };
export type GroupPreview = {
  id: string;
  name: string;
  description: string | null;
  allowMemberImports: boolean;
  alreadyMember: boolean;
  languages: (Language & { wordCount: number })[];
};

export function GroupModalActions({
  createGroupAction,
  joinGroupAction,
  previewGroupInviteAction,
  languages,
  personalVocabulary,
}: {
  createGroupAction: GroupAction;
  joinGroupAction: GroupAction;
  previewGroupInviteAction: PreviewAction;
  languages: Language[];
  personalVocabulary: PersonalVocabulary[];
}) {
  const [modal, setModal] = useState<"create" | "join" | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setModal("create")} className="bg-rose-600 hover:bg-rose-700 text-white">
          Create group
        </Button>
        <Button onClick={() => setModal("join")} variant="outline">
          Join group
        </Button>
      </div>
      {modal && (
        <AppModal
          title={modal === "create" ? "Create group" : "Join group"}
          description={modal === "create" ? "Choose languages and what to share first." : "Preview the group before joining."}
          onClose={() => setModal(null)}
          maxWidth="max-w-xl"
        >
          {modal === "create" ? (
            <CreateGroupForm createGroupAction={createGroupAction} languages={languages} personalVocabulary={personalVocabulary} />
          ) : (
            <JoinGroupForm
              joinGroupAction={joinGroupAction}
              previewGroupInviteAction={previewGroupInviteAction}
              personalVocabulary={personalVocabulary}
            />
          )}
        </AppModal>
      )}
    </>
  );
}
