"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export const CopyButton = ({ text, className }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={copyToClipboard}
      className={className}
    >
      {copied ? (
        <Check className="size-3 text-green-500 sm:size-4" />
      ) : (
        <Copy className="size-3 sm:size-4" />
      )}
    </Button>
  );
};
