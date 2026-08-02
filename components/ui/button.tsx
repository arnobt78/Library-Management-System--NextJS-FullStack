"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // relative + overflow-hidden clips click ripple; flex centers icon + label on both axes
  "relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "hover:bg-primary/90 bg-primary text-primary-foreground shadow",
        destructive:
          "hover:bg-destructive/90 bg-destructive text-destructive-foreground shadow-sm",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "hover:bg-secondary/80 bg-secondary text-secondary-foreground shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/** Spawn a client-only ripple at the pointer; removed after animation (docs/RIPPLE_BUTTON_EFFECT.md). */
function spawnRipple(
  event: React.MouseEvent<HTMLElement>,
  host: HTMLElement,
) {
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      onClick,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      if (!disabled) {
        spawnRipple(event, event.currentTarget);
      }
      onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled}
        {...props}
        onClick={handleClick}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
