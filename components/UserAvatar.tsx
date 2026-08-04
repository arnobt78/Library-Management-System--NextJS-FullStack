"use client";

/**
 * Circle user avatar:
 * university_card (local / remote / ImageKit) → Robohash(email) → initials.
 * Circle chrome is always `bg-light-100` so load gaps never flash black.
 */

import { useState } from "react";
import { Image as ImageKitImage } from "@imagekit/next";
import config from "@/lib/config";
import { SafeImage } from "@/components/ui/safe-image";
import { robohashUrl } from "@/lib/media/avatarFallback";
import { resolveUniversityCard } from "@/lib/media/universityCard";
import { cn, getInitials } from "@/lib/utils";
import { useSafeMedia } from "@/hooks/useSafeMedia";

interface UserAvatarProps {
  universityCard: string | null | undefined;
  fullName: string;
  /** Used for Robohash when university_card is empty or fails to load */
  email?: string | null;
  /** Pixel size of the circle (width = height). Default 40. */
  size?: number;
  className?: string;
  alt?: string;
}

const UserAvatar = ({
  universityCard,
  fullName,
  email,
  size = 40,
  className,
  alt = "Profile",
}: UserAvatarProps) => {
  const resolved = resolveUniversityCard(universityCard);
  const sourceKey =
    resolved.kind === "imagekit"
      ? resolved.path
      : resolved.kind === "empty"
        ? ""
        : resolved.src;
  const { loadFailed: primaryFailed, onLoadError: onPrimaryError } =
    useSafeMedia(sourceKey);

  const emailTrimmed = email?.trim() ?? "";
  const roboSrc = emailTrimmed ? robohashUrl(emailTrimmed, size) : "";
  const { loadFailed: roboFailed, onLoadError: onRoboError } =
    useSafeMedia(roboSrc);

  const showPrimary =
    !primaryFailed &&
    (resolved.kind === "local" ||
      resolved.kind === "remote" ||
      resolved.kind === "imagekit");
  const showRobohash = !showPrimary && Boolean(roboSrc) && !roboFailed;

  // Hide decoded pixels until load so only bg-light-100 shows (no black flash).
  const [primaryReady, setPrimaryReady] = useState(false);
  const [roboReady, setRoboReady] = useState(false);

  // Prefer Tailwind size-full when parent already sizes the circle (header buttons)
  const useParentSize = className?.includes("size-full");
  const sizeStyle = useParentSize ? undefined : { width: size, height: size };
  const sizesAttr = `${size}px`;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-light-100",
        !useParentSize && "size-10",
        className,
      )}
      style={sizeStyle}
    >
      {showPrimary &&
      (resolved.kind === "local" || resolved.kind === "remote") ? (
        <SafeImage
          src={resolved.src}
          alt={alt}
          fill
          className={cn(
            "object-cover transition-opacity duration-150",
            primaryReady ? "opacity-100" : "opacity-0",
          )}
          sizes={sizesAttr}
          onError={onPrimaryError}
          onLoad={() => setPrimaryReady(true)}
        />
      ) : showPrimary && resolved.kind === "imagekit" ? (
        <ImageKitImage
          src={resolved.path}
          urlEndpoint={config.env.imagekit.urlEndpoint}
          alt={alt}
          fill
          className={cn(
            "rounded-full object-cover transition-opacity duration-150",
            primaryReady ? "opacity-100" : "opacity-0",
          )}
          onError={onPrimaryError}
          onLoad={() => setPrimaryReady(true)}
        />
      ) : showRobohash ? (
        <SafeImage
          src={roboSrc}
          alt={alt}
          fill
          className={cn(
            "bg-light-100 object-cover transition-opacity duration-150",
            roboReady ? "opacity-100" : "opacity-0",
          )}
          sizes={sizesAttr}
          onError={onRoboError}
          onLoad={() => setRoboReady(true)}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-light-100 text-dark-100">
          <span className="text-[10px] font-semibold sm:text-xs">
            {getInitials(fullName || "U")}
          </span>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
