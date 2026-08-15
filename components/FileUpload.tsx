/**
 * ImageKit media upload — button (Auth) or dashed dropzone (admin book media trio).
 * Clear is parent-owned (RHF); controlled `value` (incl. "") drives preview.
 * Upload toasts use showToast.file (folder-aware copy; single status emoji).
 * Size caps from uploadLimits (1MB image / 20MB video) — UI hint + validate + server.
 * Parent: REQ-0021, REQ-0026; dropzone/cap: REQ-0033 media trio polish
 */
"use client";

import {
  Image as ImageKitImage,
  ImageKitProvider,
  Video as ImageKitVideo,
  upload,
  type UploadResponse,
} from "@imagekit/next";
import { useRef, useState, type DragEvent } from "react";
import config from "@/lib/config";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  mediaUploadMaxBytes,
  mediaUploadMaxHint,
  mediaUploadMaxLabel,
} from "@/lib/media/uploadLimits";
import { validateMediaSignature } from "@/lib/media/validation";
import { Upload } from "lucide-react";

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
  /**
   * button = AuthForm compact CTA (default).
   * dropzone = admin book media card: dashed fill, drag/drop, capped previews.
   */
  layout?: "button" | "dropzone";
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
    // Sliding window (5 / 10m) — surface 429 distinctly so retries wait the window.
    if (response.status === 429) {
      const err = new Error("UPLOAD_AUTH_RATE_LIMITED");
      err.name = "UploadAuthRateLimited";
      throw err;
    }
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
  layout = "button",
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Controlled when `value` is passed (BookForm Clear → ""); AuthForm stays local-only.
  const isControlled = value !== undefined;
  const filePath = isControlled
    ? value && value.length > 0
      ? value
      : null
    : uploadedFilePath;
  const isDropzone = layout === "dropzone";
  // Shared with server assertPersistedMediaUrl — do not hardcode MB here.
  const sizeHint = mediaUploadMaxHint(type);

  const styles = {
    button:
      variant === "dark"
        ? "bg-dark-300"
        : "border border-gray-100 bg-light-600",
    placeholder: variant === "dark" ? "text-light-100" : "text-slate-500",
    text: variant === "dark" ? "text-light-100" : "text-dark-400",
    dropzone:
      variant === "dark"
        ? "border-gray-600 bg-dark-300/40 text-light-100"
        : "border-gray-300 bg-gray-50/80 text-dark-400",
    dropzoneActive:
      variant === "dark"
        ? "border-primary/60 bg-dark-300"
        : "border-primary-admin/50 bg-primary-admin/5",
  };

  const validateFile = async (file: File): Promise<boolean> => {
    const allowedTypes =
      type === "image"
        ? new Set(["image/jpeg", "image/png", "image/webp"])
        : new Set(["video/mp4", "video/webm"]);
    if (!allowedTypes.has(file.type)) {
      showToast.file.unsupportedType(type);
      return false;
    }

    const maxBytes = mediaUploadMaxBytes(type);
    if (file.size > maxBytes) {
      showToast.file.fileTooLarge(type, mediaUploadMaxLabel(type));
      return false;
    }
    if (await validateMediaSignature(file)) return true;
    showToast.file.invalidSignature();
    return false;
  };

  const handleUpload = async (selectedFile: File): Promise<void> => {
    if (!(await validateFile(selectedFile))) return;

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
      // showToast.file owns the single ✅ — do not pass emoji titles here.
      showToast.file.uploadSuccess({
        type,
        folder,
        fileName: selectedFile.name,
        filePath: result.filePath,
      });
    } catch (error) {
      // REQ-0026: 5 upload-auth grants / 10m — expected after cover+video+retries.
      if (
        error instanceof Error &&
        (error.name === "UploadAuthRateLimited" ||
          error.message === "UPLOAD_AUTH_RATE_LIMITED")
      ) {
        showToast.file.uploadRateLimited(type);
      } else {
        showToast.file.uploadError(type);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const openPicker = () => {
    if (!isUploading) inputRef.current?.click();
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;
    const selectedFile = event.dataTransfer.files?.[0];
    if (selectedFile) void handleUpload(selectedFile);
  };

  const previewClass = "max-h-56 w-full rounded-xl bg-gray-50 object-contain";

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

      {isDropzone ? (
        <div className="flex size-full min-h-0 flex-col gap-2">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openPicker();
              }
            }}
            onClick={openPicker}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            aria-disabled={isUploading}
            className={cn(
              "flex size-full min-h-40 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-4 transition-colors",
              styles.dropzone,
              isDragging && styles.dropzoneActive,
              isUploading && "pointer-events-none opacity-60",
            )}
          >
            {!filePath ? (
              <>
                <Upload className="size-6 shrink-0 text-gray-400" aria-hidden />
                <p
                  className={cn(
                    "text-center text-sm font-medium sm:text-base",
                    styles.placeholder,
                  )}
                >
                  {isUploading ? "Uploading…" : placeholder}
                </p>
                <p className="text-center text-xs text-gray-400">
                  Click or drag and drop
                </p>
                <p className="text-center text-xs font-medium text-gray-400">
                  {sizeHint}
                </p>
              </>
            ) : (
              <div className="flex w-full flex-col items-center gap-2">
                {type === "image" ? (
                  filePath.startsWith("http") ? (
                    <img
                      src={filePath}
                      alt="Uploaded preview"
                      className={previewClass}
                    />
                  ) : (
                    <ImageKitImage
                      src={filePath}
                      alt="Uploaded preview"
                      width={500}
                      height={300}
                      className={previewClass}
                    />
                  )
                ) : (
                  <ImageKitVideo
                    src={filePath}
                    controls
                    className={cn(previewClass, "max-h-56")}
                  />
                )}
                <p
                  className={cn(
                    "line-clamp-2 w-full break-all text-center text-[10px] sm:text-xs",
                    styles.text,
                  )}
                >
                  {filePath}
                </p>
                <p className="text-xs font-medium text-primary-admin">
                  {isUploading ? "Uploading…" : "Click or drop to replace"}
                </p>
              </div>
            )}
          </div>

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
        </div>
      ) : (
        <>
          <button
            type="button"
            className={cn("upload-btn", styles.button)}
            disabled={isUploading}
            onClick={openPicker}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <Upload
                  className="size-4 shrink-0 sm:size-5"
                  aria-hidden
                />
                <p className={cn("text-sm sm:text-base", styles.placeholder)}>
                  {isUploading ? "Uploading…" : placeholder}
                </p>
              </div>
              {filePath ? (
                <p
                  className={cn(
                    "upload-filename break-all text-[10px] sm:text-xs",
                    styles.text,
                  )}
                >
                  {filePath}
                </p>
              ) : (
                <p
                  className={cn(
                    "text-[10px] sm:text-xs",
                    variant === "dark" ? "text-light-100/70" : "text-slate-400",
                  )}
                >
                  {sizeHint}
                </p>
              )}
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
        </>
      )}
    </ImageKitProvider>
  );
};

export default FileUpload;
