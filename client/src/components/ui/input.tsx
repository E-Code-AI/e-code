import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 md:h-11 w-full rounded-md border border-[var(--ecode-border)] bg-[var(--ecode-surface)] px-3 py-2 text-sm md:text-base placeholder:text-[var(--ecode-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ecode-accent)] focus-visible:border-[var(--ecode-accent)] disabled:cursor-not-allowed disabled:opacity-50 transition-all touch-target",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }