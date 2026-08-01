"use client";

import { useState } from "react";

export function useSafeMedia(source: string) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return {
    loadFailed: failedSource === source,
    onLoadError: () => setFailedSource(source),
  };
}
