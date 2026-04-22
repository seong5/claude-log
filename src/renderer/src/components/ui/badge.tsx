import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary/20",
        warm: "bg-[#fde8d5] text-[#d9622a] border-[#f4c4a0]",
        muted: "bg-[#f5ebe0] text-[#9a7060] border-[#ecdccc]",
        success: "bg-[#e8f7ee] text-[#2f8f57] border-[#bfe7cd]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
