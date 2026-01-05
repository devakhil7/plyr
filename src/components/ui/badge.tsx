import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/20 text-primary-foreground hover:bg-primary/30",
        secondary: "border-border/40 bg-muted/40 text-foreground hover:bg-muted/60",
        destructive: "border-destructive/30 bg-destructive/20 text-destructive hover:bg-destructive/30",
        outline: "border-border/50 bg-transparent text-foreground hover:bg-muted/30",
        // SPORTIQ status variants
        open: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        full: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        progress: "bg-primary/20 text-primary border-primary/30",
        completed: "bg-muted/50 text-muted-foreground border-border/30",
        cancelled: "bg-destructive/20 text-destructive border-destructive/30",
        // Skill level variants
        beginner: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        intermediate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        advanced: "bg-rose-500/20 text-rose-400 border-rose-500/30",
        // Sport badge
        sport: "bg-primary/20 text-accent border-primary/30",
        // Glass variant
        glass: "bg-muted/30 text-foreground border-border/30 backdrop-blur-xl",
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
