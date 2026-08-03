"use client";

/**
 * CountdownTimer — remaining/overdue time until due date.
 * Sync-inits from dueDate so first paint is never a false red “days: 0” flash.
 */

import React, { useState, useEffect } from "react";
import { ClockAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  dueDate: Date;
  borrowDate: Date;
}

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
};

function computeTimeLeft(dueDateTimestamp: number, now = Date.now()): TimeLeft {
  const difference = dueDateTimestamp - now;

  if (difference > 0) {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      isOverdue: false,
    };
  }

  const abs = Math.abs(difference);
  return {
    days: Math.floor(abs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((abs % (1000 * 60)) / 1000),
    isOverdue: true,
  };
}

const CountdownTimer: React.FC<CountdownTimerProps> = React.memo(
  ({ dueDate, borrowDate: _borrowDate }) => {
    const dueDateTimestamp = dueDate.getTime();

    // Lazy init from real due date — avoids days:0 → destructive red flash
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
      computeTimeLeft(dueDateTimestamp),
    );

    useEffect(() => {
      let timer: ReturnType<typeof setInterval> | null = null;

      const tick = () => {
        try {
          setTimeLeft(computeTimeLeft(dueDateTimestamp));
        } catch (error) {
          console.warn("Error calculating time left:", error);
        }
      };

      tick();
      timer = setInterval(tick, 1000);

      return () => {
        if (timer) clearInterval(timer);
      };
    }, [dueDateTimestamp]);

    const isUrgent = timeLeft.isOverdue || timeLeft.days <= 1;
    const isSoon = !timeLeft.isOverdue && timeLeft.days <= 3;

    const label = timeLeft.isOverdue
      ? `Overdue: ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`
      : `Remaining: ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`;

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm sm:text-xs",
          isUrgent
            ? "border-red-400/40 bg-gradient-to-r from-red-500/30 via-red-500/15 to-red-500/5 text-red-100 shadow-[0_8px_20px_rgba(239,68,68,0.25)]"
            : isSoon
              ? "border-amber-400/40 bg-gradient-to-r from-amber-500/25 via-amber-500/10 to-amber-500/5 text-amber-100 shadow-[0_8px_20px_rgba(245,158,11,0.2)]"
              : "border-sky-400/30 bg-gradient-to-r from-sky-500/25 via-sky-500/10 to-sky-500/5 text-sky-100 shadow-[0_8px_20px_rgba(14,165,233,0.2)]",
        )}
      >
        <ClockAlert className="size-3 shrink-0 sm:size-3.5" />
        {label}
      </span>
    );
  },
  (prevProps, nextProps) =>
    prevProps.dueDate.getTime() === nextProps.dueDate.getTime(),
);

CountdownTimer.displayName = "CountdownTimer";

export default CountdownTimer;
