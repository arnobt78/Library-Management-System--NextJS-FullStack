/**
 * Hex color picker for book cover color.
 * `fill` expands picker to media-card width/height (Cover | Color | Trailer trio).
 * Parent: REQ-0033 book form media trio polish
 */
"use client";

import { HexColorInput, HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onPickerChange: (color: string) => void;
  /** Stretch picker to fill the media card (admin book form). */
  fill?: boolean;
}

const ColorPicker = ({ value, onPickerChange, fill = false }: Props) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2",
        fill ? "h-full min-h-0 items-stretch justify-center" : "items-center",
      )}
    >
      <div
        className={cn(
          "flex flex-row items-center gap-1 sm:gap-2",
          fill ? "w-full" : "w-full max-w-[200px]",
        )}
      >
        <p className="text-sm font-medium text-dark-400 sm:text-base">#</p>
        <HexColorInput
          color={value}
          onChange={onPickerChange}
          className="hex-input"
        />
      </div>
      <div
        className={cn(
          "w-full",
          fill ? "min-h-40 flex-1" : "max-w-[180px] sm:max-w-[200px]",
        )}
      >
        <HexColorPicker
          color={value}
          onChange={onPickerChange}
          style={{ width: "100%", height: fill ? "100%" : undefined }}
          className={cn(!fill && "!h-[120px] sm:!h-[130px]")}
        />
      </div>
    </div>
  );
};

export default ColorPicker;
