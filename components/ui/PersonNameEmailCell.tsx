/**
 * Compact name · email stack used in admin list tables (ticket requester,
 * review author, activity actor). Name font-normal; email text-xs under name.
 * Parent: CR-0003 / REQ-0034 + table typography polish
 */
import { cn } from "@/lib/utils";

export function PersonNameEmailCell({
  name,
  email,
  className,
}: {
  name: string;
  email?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 max-w-48", className)}>
      <p className="truncate text-sm font-normal text-dark-400">{name}</p>
      {email ? (
        <p className="truncate text-xs text-gray-500">{email}</p>
      ) : null}
    </div>
  );
}
