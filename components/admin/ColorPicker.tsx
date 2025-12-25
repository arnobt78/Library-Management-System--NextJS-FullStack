"use client";

import { HexColorInput, HexColorPicker } from "react-colorful";
// import { useState } from "react";

interface Props {
  value?: string;
  onPickerChange: (color: string) => void;
}

const ColorPicker = ({ value, onPickerChange }: Props) => {
  return (
    <div className="relative">
      <div className="flex flex-row items-center gap-1 sm:gap-2">
        <p className="text-base font-semibold text-dark-400">#</p>
        <HexColorInput
          color={value}
          onChange={onPickerChange}
          className="hex-input"
        />
      </div>
      <div className="mt-3 w-full max-w-[180px] sm:max-w-[200px]">
        <HexColorPicker
          color={value}
          onChange={onPickerChange}
          style={{
            width: "100%",
          }}
          className="h-[140px] sm:h-[150px]"
        />
      </div>
    </div>
  );
};

export default ColorPicker;
