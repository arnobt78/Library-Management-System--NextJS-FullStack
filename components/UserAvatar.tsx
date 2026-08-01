"use client";

/**
 * Circle user avatar that supports local /images paths, remote http(s) URLs,
 * and ImageKit relative paths via resolveUniversityCard.
 */

import Image from "next/image";
import { Image as ImageKitImage } from "@imagekit/next";
import config from "@/lib/config";
import { resolveUniversityCard } from "@/lib/media/universityCard";
import { cn, getInitials } from "@/lib/utils";

interface UserAvatarProps {
  universityCard: string | null | undefined;
  fullName: string;
  /** Pixel size of the circle (width = height). Default 40. */
  size?: number;
  className?: string;
  alt?: string;
}

const UserAvatar = ({
  universityCard,
  fullName,
  size = 40,
  className,
  alt = "Profile",
}: UserAvatarProps) => {
  const resolved = resolveUniversityCard(universityCard);
  // Prefer Tailwind size-full when parent already sizes the circle (header buttons)
  const useParentSize = className?.includes("size-full");
  const sizeStyle = useParentSize ? undefined : { width: size, height: size };
  const sizesAttr = `${size}px`;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-gray-700",
        !useParentSize && "size-10",
        className
      )}
      style={sizeStyle}
    >
      {resolved.kind === "local" || resolved.kind === "remote" ? (
        <Image
          src={resolved.src}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizesAttr}
        />
      ) : resolved.kind === "imagekit" ? (
        <ImageKitImage
          src={resolved.path}
          urlEndpoint={config.env.imagekit.urlEndpoint}
          alt={alt}
          fill
          className="rounded-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-light-100">
          <span className="text-[10px] font-semibold sm:text-xs">
            {getInitials(fullName || "U")}
          </span>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
