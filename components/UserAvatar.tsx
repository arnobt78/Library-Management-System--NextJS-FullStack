"use client";

/**
 * Circle user avatar:
 * university_card (local / remote / ImageKit) → Robohash(email) → initials.
 */

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

  // Prefer Tailwind size-full when parent already sizes the circle (header buttons)
  const useParentSize = className?.includes("size-full");
  const sizeStyle = useParentSize ? undefined : { width: size, height: size };
  const sizesAttr = `${size}px`;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-gray-700",
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
          className="object-cover"
          sizes={sizesAttr}
          onError={onPrimaryError}
        />
      ) : showPrimary && resolved.kind === "imagekit" ? (
        <ImageKitImage
          src={resolved.path}
          urlEndpoint={config.env.imagekit.urlEndpoint}
          alt={alt}
          fill
          className="rounded-full object-cover"
          onError={onPrimaryError}
        />
      ) : showRobohash ? (
        <SafeImage
          src={roboSrc}
          alt={alt}
          fill
          className="bg-dark-300 object-cover"
          sizes={sizesAttr}
          onError={onRoboError}
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
