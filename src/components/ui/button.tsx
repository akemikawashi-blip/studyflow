import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-primary px-5 text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary:
          "bg-secondary-container px-5 text-on-secondary-container hover:bg-secondary-container/80",
        outline:
          "border border-outline-variant bg-background px-5 text-foreground hover:border-primary hover:bg-primary-fixed/45",
        ghost: "px-3 text-foreground hover:bg-surface-container-high",
        destructive:
          "bg-destructive px-5 text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 px-4 text-xs",
        lg: "h-12 min-h-12 px-6 text-base",
        icon: "size-11 min-h-11 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        type={type}
        {...props}
      />
    );
  },
);

export { buttonVariants };
