import * as React from "react"
import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & { onCheckedChange?: (checked: boolean) => void }
>(({ className, onCheckedChange, onChange, ...props }, ref) => (
    <input
        type="checkbox"
        className={cn(
            "h-4 w-4 rounded border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 accent-primary",
            className
        )}
        ref={ref}
        onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
        }}
        {...props}
    />
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
