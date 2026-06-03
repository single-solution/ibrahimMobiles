"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { classNames } from "@store/shared";

export interface PopoverProps {
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  role?: string;
  "aria-label"?: string;
  align?: "left" | "right";
}

/**
 * Universal Popover Component (Standard)
 * 
 * MUST BE USED for all dropdowns, menus, and popovers across the application.
 * 
 * Why: This component uses a React Portal (`createPortal`) to attach the
 * overlay directly to `document.body`. This breaks it out of the local DOM
 * hierarchy and prevents it from being trapped by `overflow: hidden`, `z-index`,
 * or CSS animation stacking contexts (like animated table rows or modals).
 * 
 * Do NOT use `absolute` positioning within relative containers for dropdowns
 * anymore. Always use this `<Popover>` component and pass the trigger's `ref`
 * as the `anchorRef`.
 */
export function Popover({
  isOpen,
  anchorRef,
  children,
  className,
  role,
  "aria-label": ariaLabel,
  align = "right",
}: PopoverProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    function updateRect() {
      if (anchorRef.current) {
        setRect(anchorRef.current.getBoundingClientRect());
      }
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    // Use capture to listen to all scroll events in the document
    window.addEventListener("scroll", updateRect, true);
    
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen, anchorRef]);

  if (!isOpen || !rect || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role={role}
      aria-label={ariaLabel}
      style={{
        position: "fixed",
        top: rect.bottom + 6,
        ...(align === "right"
          ? { right: window.innerWidth - rect.right }
          : { left: rect.left }),
      }}
      className={classNames("z-[60]", className)}
    >
      {children}
    </div>,
    document.body
  );
}
