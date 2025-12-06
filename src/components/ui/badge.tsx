import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // SPORTIQ status variants
        open: "bg-accent/10 text-accent border-accent/20",
        full: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        progress: "bg-primary/10 text-primary border-primary/20",
        completed: "bg-muted text-muted-foreground border-border",
        cancelled: "bg-destructive/10 text-destructive border-destructive/20",
        // Skill level variants
        beginner: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        intermediate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        advanced: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        // Sport badge
        sport: "bg-primary/10 text-primary border-primary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
