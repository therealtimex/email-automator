import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * VisuallyHidden component
 *
 * Hides content visually but keeps it accessible to screen readers.
 * This is useful for providing context to assistive technologies without
 * affecting the visual design.
 *
 * @example
 * <VisuallyHidden>
 *   <DialogTitle>Settings Dialog</DialogTitle>
 * </VisuallyHidden>
 */
export const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0",
        "[clip:rect(0,0,0,0)]",
        className
      )}
      {...props}
    />
  )
})

VisuallyHidden.displayName = "VisuallyHidden"
