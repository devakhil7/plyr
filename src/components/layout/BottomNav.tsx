import { Link, useLocation } from "react-router-dom";
import { Home, Play, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/hooks/useUserRoles";

const navItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Play", href: "/play", icon: Play },
  { name: "Community", href: "/community", icon: Users },
  { name: "Profile", href: "/me", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const { isTurfOwner, loading } = useUserRoles();

  const isActive = (href: string) => {
    if (href === "/home") {
      return location.pathname === "/home" || location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  // Hide bottom nav for turf owners
  if (isTurfOwner && !loading) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/98 backdrop-blur-2xl border-t border-border/40 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
      <div className="flex items-center justify-around h-14 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[64px] py-1.5 transition-all duration-200 active:scale-95",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200",
                  active && "bg-primary/15 shadow-sm"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
              </div>
              <span className={cn("text-[10px] font-medium mt-0.5 leading-none", active && "font-semibold text-primary")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
