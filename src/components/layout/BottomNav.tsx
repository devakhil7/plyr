import { Link, useLocation } from "react-router-dom";
import { Home, Play, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Play", href: "/play", icon: Play },
  { name: "Community", href: "/community", icon: Users },
  { name: "Profile", href: "/me", icon: User },
];

export function BottomNav() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/home") {
      return location.pathname === "/home" || location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/30 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-2 py-1 transition-all duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                  active && "bg-primary/10"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
              </div>
              <span className={cn("text-[10px] font-medium mt-0.5", active && "font-semibold")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
