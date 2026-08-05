/**
 * Fixed-size circular book cover — layout-stable during densify/refetch.
 * Shared by My Reviews cards and ReviewFormDialog identity header.
 * Parent: CR-0003 / REQ-0035 polish
 */

import { SafeImage } from "@/components/ui/safe-image";
import { Image as ImageKitImage } from "@imagekit/next";
import config from "@/lib/config";
import { cn } from "@/lib/utils";

type CircleBookCoverProps = {
  coverUrl: string | null | undefined;
  coverColor: string | null | undefined;
  title: string;
  /** Default size-12 / sm:size-14 */
  className?: string;
  size?: number;
};

export default function CircleBookCover({
  coverUrl,
  coverColor,
  title,
  className,
  size = 56,
}: CircleBookCoverProps) {
  const isRemote = Boolean(coverUrl?.startsWith("http"));
  return (
    <div
      className={cn(
        "relative size-12 shrink-0 overflow-hidden rounded-full border-2 sm:size-14",
        className,
      )}
      style={{
        borderColor: coverColor || "rgba(255,255,255,0.2)",
        backgroundColor: coverColor || "rgba(255,255,255,0.08)",
      }}
      aria-hidden={!coverUrl}
    >
      {coverUrl && isRemote ? (
        <SafeImage
          src={coverUrl}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
        />
      ) : coverUrl ? (
        <ImageKitImage
          src={coverUrl}
          urlEndpoint={config.env.imagekit.urlEndpoint}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-[10px] font-medium text-light-200">
          {title.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
