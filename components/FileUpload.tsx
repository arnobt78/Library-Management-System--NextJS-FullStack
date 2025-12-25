"use client";

import { IKImage, ImageKitProvider, IKUpload, IKVideo } from "imagekitio-next";
import config from "@/lib/config";
import { useRef, useState, useEffect } from "react";
// import Image from "next/image";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const {
  env: {
    imagekit: { publicKey, urlEndpoint },
  },
} = config;

const authenticator = async () => {
  try {
    const response = await fetch("/api/auth/imagekit");

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Request failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    const { signature, expire, token } = data;

    return { token, expire, signature };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Authentication request failed: ${error.message}`);
    } else {
      throw new Error("Authentication request failed: Unknown error");
    }
  }
};

interface Props {
  type: "image" | "video";
  accept: string;
  placeholder: string;
  folder: string;
  variant: "dark" | "light";
  onFileChange: (filePath: string) => void;
  value?: string;
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
  const ikUploadRef = useRef(null);
  const [file, setFile] = useState<{ filePath: string | null }>({
    filePath: value ?? null,
  });
  const [progress, setProgress] = useState(0);

  // CRITICAL: Sync value prop with internal state
  // This ensures the component updates when SSR data is provided (e.g., when editing a book)
  // The value prop comes from form fields (react-hook-form) which may be initialized with SSR data
  useEffect(() => {
    if (value !== undefined && value !== file.filePath) {
      setFile({ filePath: value ?? null });
    }
  }, [value, file.filePath]);

  const styles = {
    button:
      variant === "dark"
        ? "bg-dark-300"
        : "bg-light-600 border-gray-100 border",
    placeholder: variant === "dark" ? "text-light-100" : "text-slate-500",
    text: variant === "dark" ? "text-light-100" : "text-dark-400",
  };

  /**
   * Handle file upload errors
   *
   * @param error - Error object from ImageKit upload
   */
  const onError = (error: unknown): void => {
    console.log(error);

    showToast.error(
      `${type === "image" ? "Image" : "Video"} Upload Failed`,
      `Your ${type} could not be uploaded. Please try again.`
    );
  };

  /**
   * Upload success response type from ImageKit
   * Note: imagekitio-next types may not fully match, so we use a flexible interface
   */
  interface UploadSuccessResponse {
    filePath: string;
    [key: string]: unknown;
  }

  /**
   * Handle successful file upload
   *
   * @param res - Upload success response from ImageKit containing filePath
   * Note: Using type assertion because imagekitio-next's IKUploadResponse type
   * doesn't match the actual response structure at runtime
   */
  const onSuccess = (res: unknown): void => {
    // Type guard: Check if response has filePath property
    const response = res as UploadSuccessResponse;

    if (!response.filePath || typeof response.filePath !== "string") {
      console.error("Upload response missing filePath:", res);
      onError(new Error("Upload response missing filePath"));
      return;
    }

    // Construct full ImageKit URL from the relative filePath
    const fullUrl = `${urlEndpoint}${response.filePath}`;

    setFile({ filePath: fullUrl });
    onFileChange(fullUrl);

    showToast.success(
      `✅ ${type === "image" ? "Image" : "Video"} Uploaded Successfully!`,
      `${response.filePath} has been uploaded and is ready to use.`
    );
  };

  /**
   * Validate file before upload
   *
   * @param file - File to validate
   * @returns true if file is valid, false otherwise
   */
  const onValidate = (file: File): boolean => {
    if (type === "image") {
      if (file.size > 20 * 1024 * 1024) {
        showToast.error(
          "📁 File Too Large",
          "Image files must be smaller than 20MB. Please compress your image and try again."
        );

        return false;
      }
    } else if (type === "video") {
      if (file.size > 50 * 1024 * 1024) {
        showToast.error(
          "📁 File Too Large",
          "Video files must be smaller than 50MB. Please compress your video and try again."
        );
        return false;
      }
    }

    return true;
  };

  return (
    <ImageKitProvider
      publicKey={publicKey}
      urlEndpoint={urlEndpoint}
      authenticator={authenticator}
    >
      <IKUpload
        ref={ikUploadRef}
        onError={onError}
        onSuccess={onSuccess}
        useUniqueFileName={true}
        validateFile={onValidate}
        onUploadStart={() => setProgress(0)}
        onUploadProgress={({ loaded, total }) => {
          const percent = Math.round((loaded / total) * 100);
          setProgress(percent);
        }}
        folder={folder}
        accept={accept}
        className="hidden"
      />

      <button
        className={cn("upload-btn", styles.button)}
        onClick={(e) => {
          e.preventDefault();
          if (ikUploadRef.current) {
            // @ts-expect-error - IKUpload ref type doesn't expose click method, but it exists on the underlying input element
            ikUploadRef.current?.click();
          }
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <img
              src="/icons/upload.svg"
              alt="upload-icon"
              width={20}
              height={20}
              className="size-4 shrink-0 object-contain sm:size-5"
            />
            <p className={cn("text-sm sm:text-base", styles.placeholder)}>{placeholder}</p>
          </div>

          {file && (
            <p className={cn("upload-filename text-[10px] sm:text-xs break-all", styles.text)}>{file.filePath}</p>
          )}
        </div>
      </button>

      {progress > 0 && progress !== 100 && (
        <div className="w-full rounded-full bg-green-200">
          <div className="progress text-[7px] sm:text-[8px]" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
        </div>
      )}

      {file &&
        (type === "image" ? (
          // Check if filePath is already a full URL
          file.filePath?.startsWith("http") ? (
            <img
              src={file.filePath}
              alt="Uploaded image"
              width={500}
              height={300}
              className="h-auto w-full max-w-full rounded-xl"
            />
          ) : (
            <IKImage
              alt={file.filePath ?? ""}
              path={file.filePath ?? ""}
              width={500}
              height={300}
              className="h-auto w-full max-w-full"
            />
          )
        ) : type === "video" ? (
          // Check if filePath is already a full URL
          file.filePath?.startsWith("http") ? (
            <video
              src={file.filePath}
              controls={true}
              className="h-64 w-full rounded-xl sm:h-96"
            />
          ) : (
            <IKVideo
              path={file.filePath ?? ""}
              controls={true}
              className="h-64 w-full rounded-xl sm:h-96"
            />
          )
        ) : null)}
    </ImageKitProvider>
  );
};

export default FileUpload;
