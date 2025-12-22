import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * FormSkeleton Component
 *
 * A skeleton loader that matches the exact dimensions and layout of form components.
 * Used to show loading states while form data is being fetched or forms are being initialized.
 *
 * Features:
 * - Exact size matching to prevent layout shift
 * - Supports different form layouts (standard, card-based)
 * - Matches form field dimensions (input, textarea, select, etc.)
 * - Includes label and button skeletons
 * - Responsive layout matching
 *
 * Usage:
 * ```tsx
 * // Standard form skeleton
 * <FormSkeleton />
 *
 * // Card-based form skeleton
 * <FormSkeleton variant="card" />
 *
 * // Custom number of fields
 * <FormSkeleton fieldCount={5} />
 * ```
 *
 * Dimensions matched:
 * - Form container: space-y-4 or space-y-6
 * - Input fields: h-10 w-full
 * - Textarea: h-24 w-full
 * - Select: h-10 w-full
 * - Button: h-10 w-full or w-auto
 */
interface FormSkeletonProps {
  /**
   * Display variant: "standard" for regular form, "card" for Card-based form
   * Default: "standard"
   */
  variant?: "standard" | "card";
  /**
   * Number of form fields to display
   * Default: 4
   */
  fieldCount?: number;
  /**
   * Whether to include a textarea field
   * Default: false
   */
  includeTextarea?: boolean;
  /**
   * Whether to include a select field
   * Default: false
   */
  includeSelect?: boolean;
  /**
   * Whether to include action buttons
   * Default: true
   */
  includeButtons?: boolean;
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

const FormSkeleton: React.FC<FormSkeletonProps> = ({
  variant = "standard",
  fieldCount = 4,
  includeTextarea = false,
  includeSelect = false,
  includeButtons = true,
  className,
}) => {
  const formContent = (
    <div className={cn("space-y-4", className)}>
      {/* Form Fields */}
      {Array.from({ length: fieldCount }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-2">
          {/* Label */}
          <Skeleton className="h-4 w-24" />
          {/* Input */}
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      {/* Textarea Field (if requested) */}
      {includeTextarea && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {/* Select Field (if requested) */}
      {includeSelect && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {/* Action Buttons */}
      {includeButtons && (
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    );
  }

  return formContent;
};

export default FormSkeleton;

