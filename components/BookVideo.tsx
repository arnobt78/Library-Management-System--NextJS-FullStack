"use client";

import React from "react";
import { IKVideo, ImageKitProvider } from "imagekitio-next";
import config from "@/lib/config";

const BookVideo = ({ videoUrl }: { videoUrl: string }) => {
  // Check if the URL is actually a video file or an ImageKit video URL
  const isVideoFile =
    videoUrl &&
    (videoUrl.endsWith(".mp4") ||
      videoUrl.endsWith(".webm") ||
      videoUrl.endsWith(".ogg") ||
      videoUrl.endsWith(".avi") ||
      videoUrl.endsWith(".mov") ||
      videoUrl.includes("/video/") ||
      (videoUrl.includes("imagekit.io") &&
        videoUrl.includes("/books/videos/")));

  // If it's not a video file, show a placeholder
  if (!isVideoFile) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-xl bg-gray-100 sm:h-64">
        <p className="text-sm text-gray-500 sm:text-base">No video available</p>
      </div>
    );
  }

  // For ImageKit URLs in videos folder, try to play them as videos
  // even if they have .png extension (they might be misnamed video files)
  if (videoUrl.includes("imagekit.io") && videoUrl.includes("/books/videos/")) {
    return (
      <ImageKitProvider
        publicKey={config.env.imagekit.publicKey}
        urlEndpoint={config.env.imagekit.urlEndpoint}
      >
        <IKVideo src={videoUrl} controls={true} className="h-auto w-full max-w-full rounded-xl" />
      </ImageKitProvider>
    );
  }

  return (
    <ImageKitProvider
      publicKey={config.env.imagekit.publicKey}
      urlEndpoint={config.env.imagekit.urlEndpoint}
    >
      <IKVideo src={videoUrl} controls={true} className="w-full rounded-xl" />
    </ImageKitProvider>
  );
};
export default BookVideo;
