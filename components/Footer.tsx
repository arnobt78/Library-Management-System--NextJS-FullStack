/**
 * Site footer — copyright line for public shells.
 * - default: logged-in (root) pages under .page-shell
 * - auth: compact, centered in the left auth column only (not admin)
 */

type FooterProps = {
  /** "auth" = compact left-panel style; default = public shell bar */
  variant?: "default" | "auth";
  className?: string;
};

export default function Footer({
  variant = "default",
  className = "",
}: FooterProps) {
  const year = new Date().getFullYear();
  const copy = `© ${year}. All rights reserved.`;

  if (variant === "auth") {
    return (
      <footer
        className={`mt-auto w-full py-4 text-center text-xs text-light-100/60 sm:py-5 sm:text-sm ${className}`}
      >
        <p>{copy}</p>
      </footer>
    );
  }

  return (
    <footer
      className={`mt-auto w-full border-t border-gray-700/50 py-4 text-center text-sm text-light-100/70 sm:py-5 ${className}`}
    >
      <p>{copy}</p>
    </footer>
  );
}
