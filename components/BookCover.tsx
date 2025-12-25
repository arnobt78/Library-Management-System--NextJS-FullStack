"use client";

import React from "react";
import { cn } from "@/lib/utils";
import BookCoverSvg from "@/components/BookCoverSvg";
import { IKImage } from "imagekitio-next";
import config from "@/lib/config";

type BookCoverVariant = "extraSmall" | "small" | "medium" | "regular" | "wide";

const variantStyles: Record<BookCoverVariant, string> = {
  extraSmall: "book-cover_extra_small",
  small: "book-cover_small",
  medium: "book-cover_medium",
  regular: "book-cover_regular",
  wide: "book-cover_wide",
};

interface Props {
  className?: string;
  variant?: BookCoverVariant;
  coverColor: string;
  coverImage: string;
}

/**
 * BookCover - Optimized component to prevent image flicker during React Query refetches
 *
 * CRITICAL: Uses React.memo with custom comparison to prevent unnecessary re-renders.
 * Only re-renders when coverImage or coverColor actually changes.
 *
 * The image will only reload if the coverImage URL actually changes,
 * not when the component re-renders due to query refetch.
 */
const BookCover = React.memo(
  ({ className, variant = "regular", coverColor, coverImage }: Props) => {
    return (
      <div
        className={cn(
          "relative transition-all duration-300",
          variantStyles[variant],
          className
        )}
      >
        <BookCoverSvg coverColor={coverColor} />

        <div
          className="absolute z-10"
          style={{ left: "12%", width: "87.5%", height: "88%" }}
        >
          {coverImage && coverImage.startsWith("http") ? (
            <img
              // CRITICAL: Removed key prop - it causes remounts and flickering
              // React.memo handles re-render prevention, key causes unnecessary remounts
              src={coverImage}
              alt="Book cover"
              className="size-full rounded-sm object-fill"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          ) : coverImage ? (
            <IKImage
              // CRITICAL: Removed key prop - it causes remounts and flickering
              // React.memo handles re-render prevention, key causes unnecessary remounts
              path={coverImage}
              urlEndpoint={config.env.imagekit.urlEndpoint}
              alt="Book cover"
              fill
              className="rounded-sm object-fill"
              lqip={{ active: true }}
            />
          ) : (
            <div className="flex size-full items-center justify-center rounded-sm bg-gray-200">
              <span className="text-xs text-gray-500 sm:text-sm">No Cover</span>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // CRITICAL: Only re-render if coverImage or coverColor actually changes
    // This prevents flicker when parent component re-renders but image data is the same
    return (
      prevProps.coverImage === nextProps.coverImage &&
      prevProps.coverColor === nextProps.coverColor &&
      prevProps.variant === nextProps.variant &&
      prevProps.className === nextProps.className
    );
  }
);

// Set display name for React DevTools
BookCover.displayName = "BookCover";

export default BookCover;
