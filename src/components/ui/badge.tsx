import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-500 shadow-sm",
        secondary:
          "border-transparent bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-600 shadow-sm border border-gray-400 dark:border-gray-500",
        destructive:
          "border-transparent bg-red-600 dark:bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500 shadow-sm",
        outline:
          "border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm",
        success:
          "border-transparent bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-500 shadow-sm",
        warning:
          "border-transparent bg-yellow-600 dark:bg-yellow-600 text-white hover:bg-yellow-700 dark:hover:bg-yellow-500 shadow-sm",
        info:
          "border-transparent bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-500 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
