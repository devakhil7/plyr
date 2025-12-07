import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-glow active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg",
        outline: "border border-border bg-transparent hover:bg-muted/50 text-foreground backdrop-blur-sm",
        secondary: "bg-muted/60 text-foreground hover:bg-muted/80 border border-border/50 backdrop-blur-sm",
        ghost: "hover:bg-muted/50 text-foreground",
        link: "text-accent underline-offset-4 hover:underline",
        // SPORTIQ custom variants
        hero: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200",
        "hero-secondary": "bg-muted/40 backdrop-blur-xl text-foreground border border-border/40 hover:bg-muted/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-glow-accent active:scale-[0.98]",
        glass: "bg-muted/30 backdrop-blur-xl text-foreground border border-border/30 hover:bg-muted/50 shadow-glass",
        sport: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200",
        pill: "rounded-full bg-muted/50 backdrop-blur-sm text-foreground border border-border/40 hover:bg-muted/70 hover:border-primary/50",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
