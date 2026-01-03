import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Users, Play, BarChart3, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const actions = [
  { icon: Users, label: "Join Match", href: "/matches", color: "bg-primary" },
  { icon: Play, label: "Start Match", href: "/host-match", color: "bg-accent" },
  { icon: BarChart3, label: "Analytics", href: "/get-analytics", color: "bg-primary/80" },
  { icon: Pencil, label: "Create Post", href: "/feed", color: "bg-accent/80" },
];

export function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed z-40 md:hidden" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: '16px' }}>
      {/* Action buttons */}
      <div
        className={cn(
          "absolute bottom-16 right-0 flex flex-col-reverse gap-3 transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 transition-all duration-200",
                isOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
              )}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <span className="bg-card px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg border border-border/50 whitespace-nowrap">
                {action.label}
              </span>
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shadow-lg",
                  action.color
                )}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main FAB button */}
      <Button
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg transition-all duration-300",
          isOpen
            ? "bg-muted text-muted-foreground rotate-45"
            : "bg-gradient-to-br from-primary to-accent text-white"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
