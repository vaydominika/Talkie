import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
};

const imageSizes = {
  sm: 32,
  md: 40,
  lg: 64,
};

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserAvatar({
  name,
  email,
  image,
  size = "md",
  className,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name || email || "User avatar"}
        width={imageSizes[size]}
        height={imageSizes[size]}
        unoptimized
        className={cn("rounded-full border object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center justify-center rounded-full border bg-muted font-semibold", sizes[size], className)}>
      {initials(name, email)}
    </span>
  );
}
