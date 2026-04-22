import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value = 0,
  indicatorClassName,
  indicatorStyle,
}: React.ComponentProps<"div"> & {
  value?: number
  indicatorClassName?: string
  indicatorStyle?: React.CSSProperties
}) {
  const normalized = Math.max(0, Math.min(value, 100))

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={normalized}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative w-full overflow-hidden rounded-full border border-[#ecdccc] bg-[#f0e4d4]",
        className,
      )}
    >
      <div
        data-slot="progress-indicator"
        className={cn("h-full rounded-full transition-all duration-500", indicatorClassName)}
        style={{ width: `${normalized}%`, ...indicatorStyle }}
      />
    </div>
  )
}

export { Progress }
