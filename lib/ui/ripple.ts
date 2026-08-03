/**
 * Shared click ripple for Button, TabsTrigger, and glass CTAs.
 * Visual styles live in globals.css (.btn-ripple). See docs/RIPPLE_BUTTON_EFFECT.md.
 */

import type { MouseEvent, MouseEventHandler } from "react";

/** Spawn a client-only ripple at the pointer; removed after animation. */
export function spawnRipple(
  event: MouseEvent<HTMLElement>,
  host: HTMLElement,
): void {
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  const ripple = document.createElement("span");
  ripple.className = "btn-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.addEventListener("animationend", () => ripple.remove(), {
    once: true,
  });
  host.appendChild(ripple);
}

/**
 * Wrap an onClick so a ripple runs first (skipped when disabled).
 */
export function withRippleClick<T extends HTMLElement>(
  handler?: MouseEventHandler<T>,
  disabled?: boolean,
): MouseEventHandler<T> {
  return (event) => {
    if (!disabled) {
      spawnRipple(
        event as unknown as MouseEvent<HTMLElement>,
        event.currentTarget as unknown as HTMLElement,
      );
    }
    handler?.(event);
  };
}
