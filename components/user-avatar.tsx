"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sizes={sm:"size-8 text-xs",md:"size-10 text-sm",lg:"size-16 text-xl"};

function initials(name?:string|null,email?:string|null){
  const cleaned=name?.trim();
  const source=cleaned&&cleaned!=="?"?cleaned:email?.split("@")[0]||"?";
  return source.split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join("");
}

export function UserAvatar({name,email,image,size="md",className}:{name?:string|null;email?:string|null;image?:string|null;size?:keyof typeof sizes;className?:string}){
  return <Avatar className={cn("border",sizes[size],className)}>
    {image?<AvatarImage src={image} alt={name||email||"User avatar"} className="object-cover"/>:null}
    <AvatarFallback className="font-semibold text-foreground">{initials(name,email)}</AvatarFallback>
  </Avatar>;
}
