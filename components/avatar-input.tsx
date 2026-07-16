"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";

export function AvatarInput({ initialImage, name, email }: { initialImage?: string | null; name?: string | null; email: string }) {
  const [image, setImage] = useState(initialImage ?? "");

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 160;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const scale = Math.max(size / img.width, size / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
        setImage(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={name} email={email} image={image} size="lg" />
      <div className="flex flex-col items-start gap-3">
        <input type="hidden" name="image" value={image} />
        <Button asChild variant="outline"><label className="cursor-pointer">
          Upload avatar
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label></Button>
        {image && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setImage("")}
            className="h-auto bg-transparent! px-0 py-0 text-xs text-muted-foreground hover:bg-transparent! hover:text-foreground"
          >
            Remove avatar
          </Button>
        )}
      </div>
    </div>
  );
}
