/**
 * Book detail trailer — full-width frame with max-h so tall clips do not eat the fold.
 * Placeholder keeps min-h only (create still requires videoUrl; invalid/legacy URLs land here).
 * Parent: book detail media polish
 */
"use client";

import React from "react";
import { ImageKitProvider, Video as ImageKitVideo } from "@imagekit/next";
import config from "@/lib/config";
import { cn } from "@/lib/utils";

/** Laptop-friendly cap: half viewport or 28rem, whichever is smaller. */
const VIDEO_FRAME_MAX =
  "max-h-[min(50vh,28rem)]";

const BookVideo = ({ videoUrl }: { videoUrl: string }) => {
  const isVideoFile =
    Boolean(videoUrl) &&
    (videoUrl.endsWith(".mp4") ||
      videoUrl.endsWith(".webm") ||
      videoUrl.endsWith(".ogg") ||
      videoUrl.endsWith(".avi") ||
      videoUrl.endsWith(".mov") ||
      videoUrl.includes("/video/") ||
      (videoUrl.includes("imagekit.io") &&
        videoUrl.includes("/books/videos/")));

  // Empty / non-video URL — stable slot only (not used for playing clips).
  if (!isVideoFile) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center rounded-xl bg-dark-300/40",
          "min-h-48 sm:min-h-64",
        )}
      >
        <p className="text-sm text-light-200 sm:text-base">No video available</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center overflow-hidden rounded-xl bg-dark-300/40",
        VIDEO_FRAME_MAX,
      )}
    >
      <ImageKitProvider urlEndpoint={config.env.imagekit.urlEndpoint}>
        <ImageKitVideo
          src={videoUrl}
          controls
          className={cn(
            "h-full w-full max-w-full object-contain",
            VIDEO_FRAME_MAX,
          )}
        />
      </ImageKitProvider>
    </div>
  );
};

export default BookVideo;
