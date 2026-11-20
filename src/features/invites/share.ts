"use client";

import { toast } from "sonner";

/**
 * Open the phone's share sheet (Messenger, Viber, SMS…), or copy to the
 * clipboard where sharing isn't available (most desktops).
 */
export async function shareOrCopy({
  text,
  url,
  copiedMessage,
}: {
  text: string;
  url?: string;
  copiedMessage: string;
}) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text, url });
      return;
    } catch (error) {
      // Closing the share sheet isn't an error worth showing.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
    toast.success(copiedMessage);
  } catch {
    toast.error("Couldn't copy. Long-press to copy it instead.");
  }
}

export function inviteUrl(token: string) {
  return `${window.location.origin}/invite/${token}`;
}
