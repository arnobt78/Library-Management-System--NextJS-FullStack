"use client";

// Parent: REQ-0021
import {
  Image as ImageKitImage,
  ImageKitProvider,
  Video as ImageKitVideo,
  upload,
  type UploadResponse,
} from "@imagekit/next";
import { useRef, useState } from "react";
import config from "@/lib/config";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const {
  env: {
    imagekit: { urlEndpoint },
  },
} = config;

interface UploadAuthentication {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
}

interface Props {
  type: "image" | "video";
  accept: string;
  placeholder: string;
  folder: string;
  variant: "dark" | "light";
  onFileChange: (filePath: string) => void;
  value?: string;
}

function isUploadAuthentication(value: unknown): value is UploadAuthentication {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<UploadAuthentication>;
  return (
    typeof candidate.token === "string" &&
    typeof candidate.expire === "number" &&
    typeof candidate.signature === "string" &&
    typeof candidate.publicKey === "string"
  );
}

async function getUploadAuthentication(): Promise<UploadAuthentication> {
  const response = await fetch("/api/auth/imagekit", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Upload authorization failed with status ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isUploadAuthentication(data)) {
    throw new Error("Upload authorization returned an invalid response");
  }

  return data;
}

const FileUpload = ({
  type,
  accept,
  placeholder,
  folder,
  variant,
  onFileChange,
  value,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const filePath = uploadedFilePath ?? value ?? null;

  const styles = {
    button:
      variant === "dark"
        ? "bg-dark-300"
        : "border border-gray-100 bg-light-600",
    placeholder: variant === "dark" ? "text-light-100" : "text-slate-500",
    text: variant === "dark" ? "text-light-100" : "text-dark-400",
  };

  const validateFile = (file: File): boolean => {
    const maxBytes = type === "image" ? 20 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size <= maxBytes) return true;

    showToast.error(
      "📁 File Too Large",
      `${type === "image" ? "Image" : "Video"} files must be smaller than ${type === "image" ? "20MB" : "50MB"}.`
    );
    return false;
  };

  const handleUpload = async (selectedFile: File): Promise<void> => {
    if (!validateFile(selectedFile)) return;

    setIsUploading(true);
    setProgress(0);

    try {
      const authentication = await getUploadAuthentication();
      const result: UploadResponse = await upload({
        file: selectedFile,
        fileName: selectedFile.name,
        folder,
        useUniqueFileName: true,
        ...authentication,
        onProgress: ({
          loaded,
          total,
        }: {
          loaded: number;
          total: number;
        }) => {
          setProgress(total > 0 ? Math.round((loaded / total) * 100) : 0);
        },
      });

      if (!result.filePath) {
        throw new Error("Upload completed without a file path");
      }

      const uploadedUrl = `${urlEndpoint}${result.filePath}`;
      setUploadedFilePath(uploadedUrl);
      onFileChange(uploadedUrl);
      showToast.success(
        `✅ ${type === "image" ? "Image" : "Video"} Uploaded Successfully!`,
        `${result.filePath} is ready to use.`
      );
    } catch (error: unknown) {
      console.error("ImageKit upload failed", error);
      showToast.error(
        `${type === "image" ? "Image" : "Video"} Upload Failed`,
        "The file could not be uploaded. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ImageKitProvider urlEndpoint={urlEndpoint}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];
          if (selectedFile) void handleUpload(selectedFile);
          event.target.value = "";
        }}
      />

      <button
        type="button"
        className={cn("upload-btn", styles.button)}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <img
              src="/icons/upload.svg"
              alt=""
              width={20}
              height={20}
              className="size-4 shrink-0 object-contain sm:size-5"
            />
            <p className={cn("text-sm sm:text-base", styles.placeholder)}>
              {isUploading ? "Uploading…" : placeholder}
            </p>
          </div>
          {filePath ? (
            <p
              className={cn(
                "upload-filename break-all text-[10px] sm:text-xs",
                styles.text
              )}
            >
              {filePath}
            </p>
          ) : null}
        </div>
      </button>

      {progress > 0 && progress < 100 ? (
        <div className="w-full rounded-full bg-green-200">
          <div
            className="progress text-[7px] sm:text-[8px]"
            style={{ width: `${progress}%` }}
          >
            {progress}%
          </div>
        </div>
      ) : null}

      {filePath && type === "image" ? (
        filePath.startsWith("http") ? (
          <img
            src={filePath}
            alt="Uploaded preview"
            width={500}
            height={300}
            className="h-auto w-full max-w-full rounded-xl"
          />
        ) : (
          <ImageKitImage
            src={filePath}
            alt="Uploaded preview"
            width={500}
            height={300}
            className="h-auto w-full max-w-full rounded-xl"
          />
        )
      ) : null}

      {filePath && type === "video" ? (
        <ImageKitVideo
          src={filePath}
          controls
          className="h-64 w-full rounded-xl sm:h-96"
        />
      ) : null}
    </ImageKitProvider>
  );
};

export default FileUpload;
