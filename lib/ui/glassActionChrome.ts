/**
 * Shared kebab dropdown + destructive alert chrome.
 * Dark tokens match ReviewsSection (glass Edit/Delete/Cancel + delete dialog).
 * Light tokens match admin white panels without the dark-page white hover flash.
 * Parent: CR-0003 / REQ-0034 — UI parity
 */

/** Dark-glass action menu (book reviews, user support tickets, etc.). */
export const GLASS_MENU = {
  content:
    "z-50 w-40 border-gray-600 bg-gray-800 p-1 text-light-100 shadow-md sm:w-44",
  /** Soft gray hover — never popover accent white on dark menus. */
  item: "cursor-pointer gap-2 rounded-sm text-xs text-light-100 focus:bg-gray-700 focus:text-light-100 data-[highlighted]:bg-gray-700 data-[highlighted]:text-light-100 sm:text-sm",
  itemDestructive:
    "cursor-pointer gap-2 rounded-sm text-xs text-red-400 focus:bg-gray-700 focus:text-red-400 data-[highlighted]:bg-gray-700 data-[highlighted]:text-red-400 sm:text-sm",
  separator: "bg-gray-600",
  trigger:
    "focus:ring-primary/40 shrink-0 rounded-full p-1 text-light-200/60 hover:bg-gray-700/50 hover:text-light-100 focus:outline-none focus:ring-2",
} as const;

/** Dark-glass destructive confirm (review/ticket delete on root shell). */
export const GLASS_ALERT = {
  content: "border-gray-600 bg-gray-800/95 text-light-100 shadow-lg",
  title: "text-base font-medium text-light-100 sm:text-lg",
  description: "text-xs text-light-200 sm:text-sm",
  preview:
    "rounded-md border border-gray-600 bg-gray-900/40 p-2.5 text-light-100",
  cancel:
    "mt-0 w-full border-gray-500 bg-gray-600 text-xs text-white hover:bg-gray-500 hover:text-white sm:w-auto sm:text-sm",
  destructive:
    "w-full gap-1.5 bg-red-600 text-xs text-white hover:bg-red-700 sm:w-auto sm:text-sm",
  footer: "flex-col gap-2 sm:flex-row sm:gap-0",
} as const;

/** Admin / light panel action menu. */
export const LIGHT_MENU = {
  content:
    "z-50 w-40 border-gray-200 bg-white p-1 text-dark-400 shadow-md sm:w-44",
  item: "cursor-pointer gap-2 rounded-sm text-xs text-dark-400 focus:bg-gray-100 focus:text-dark-400 data-[highlighted]:bg-gray-100 data-[highlighted]:text-dark-400 sm:text-sm",
  itemDestructive:
    "cursor-pointer gap-2 rounded-sm text-xs text-red-600 focus:bg-red-50 focus:text-red-700 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 sm:text-sm",
  separator: "bg-gray-200",
  trigger:
    "shrink-0 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-admin/30",
} as const;

/** Admin / light destructive confirm. */
export const LIGHT_ALERT = {
  content: "border-gray-200 bg-white text-dark-400 shadow-lg",
  title: "text-base font-medium text-dark-400 sm:text-lg",
  description: "text-xs text-gray-500 sm:text-sm",
  preview: "rounded-md border border-gray-200 bg-gray-50 p-2.5 text-dark-400",
  cancel:
    "mt-0 w-full border-gray-300 bg-white text-xs text-dark-400 hover:bg-gray-50 sm:w-auto sm:text-sm",
  destructive:
    "w-full gap-1.5 bg-red-600 text-xs text-white hover:bg-red-700 sm:w-auto sm:text-sm",
  footer: "flex-col gap-2 sm:flex-row sm:gap-0",
} as const;

export type ActionChromeVariant = "dark" | "light";

export function actionMenuChrome(variant: ActionChromeVariant = "dark") {
  return variant === "dark" ? GLASS_MENU : LIGHT_MENU;
}

export function actionAlertChrome(variant: ActionChromeVariant = "dark") {
  return variant === "dark" ? GLASS_ALERT : LIGHT_ALERT;
}

/**
 * Solid CTAs for admin light pages — uses `primary-admin` / `red-800` from
 * tailwind.config (always generated). Avoid palette shades that only live in
 * this lib file without `./lib` in Tailwind content (bg missing → white/invisible).
 * Same py/px rhythm as `.profile-action-btn` for equal Edit/Delete height.
 */
export const LIGHT_GLASS_CTA = {
  host: "relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-[box-shadow,background-color,opacity] duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm",
  edit: "border-primary-admin/40 bg-primary-admin text-white hover:bg-primary-admin/90 hover:shadow-md",
  delete:
    "border-red-800/40 bg-red-800 text-white hover:bg-red-800/90 hover:shadow-md",
} as const;
