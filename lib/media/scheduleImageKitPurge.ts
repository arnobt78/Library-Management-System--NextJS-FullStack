/**
 * Schedule ImageKit orphan purge after the HTTP response.
 * Same after() pattern as reservation outbox — keeps mutations fast.
 * Parent: REQ-0033
 */
import "server-only";

import { after } from "next/server";
import {
  purgeImageKitMedia,
  type ImageKitPurgeOptions,
} from "@/lib/media/imagekitPurge";

export function scheduleImageKitPurge(
  urls: Array<string | null | undefined>,
  options?: ImageKitPurgeOptions,
): void {
  after(() => {
    void purgeImageKitMedia(urls, options);
  });
}
