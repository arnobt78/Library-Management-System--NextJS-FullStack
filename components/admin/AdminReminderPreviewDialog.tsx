"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export type ReminderPreviewRow = {
  recordId: string;
  bookTitle: string;
  userName: string;
  userEmail: string;
  dueDate: string | Date | null;
  days: number;
  liveFine: string;
};

interface AdminReminderPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "due" | "overdue";
}

async function fetchReminderPreview(
  type: "due" | "overdue",
): Promise<ReminderPreviewRow[]> {
  const res = await fetch(`/api/admin/reminders/preview?type=${type}`);
  if (!res.ok) throw new Error("Preview unavailable");
  const data = await res.json();
  return Array.isArray(data.rows) ? data.rows : [];
}

export function AdminReminderPreviewDialog({
  open,
  onOpenChange,
  type,
}: AdminReminderPreviewDialogProps) {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "reminder-preview", type],
    queryFn: () => fetchReminderPreview(type),
    enabled: open,
    staleTime: 0,
  });

  const title =
    type === "due" ? "Due Soon Reminder Preview" : "Overdue Reminder Preview";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(80vh,32rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading preview…
          </div>
        ) : isError ? (
          <p className="py-4 text-sm text-rose-700">Could not load preview.</p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No recipients match today&apos;s send rules.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Book</th>
                  <th className="py-2 pr-2 font-medium">User</th>
                  <th className="py-2 pr-2 font-medium">Days</th>
                  {type === "overdue" ? (
                    <th className="py-2 font-medium">Live fine</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.recordId} className="border-border/60 border-b">
                    <td className="py-2 pr-2">{row.bookTitle}</td>
                    <td className="py-2 pr-2">
                      {row.userName}
                      <span className="block text-[10px] text-muted-foreground">
                        {row.userEmail}
                      </span>
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{row.days}</td>
                    {type === "overdue" ? (
                      <td className="py-2 tabular-nums">${row.liveFine}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
