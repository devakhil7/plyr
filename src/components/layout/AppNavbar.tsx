import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Shield, Building, MessageSquare, Activity, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useUnreadMessageCount } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";

const desktopNav = [
  { name: "Home", href: "/home" },
  { name: "Play", href: "/play" },
  { name: "Community", href: "/community" },
  { name: "About", href: "/about" },
];

export function AppNavbar() {
  const { user, profile, signOut } = useAuth();
  const { isAdmin, isTurfOwner, loading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const { unreadCount } = useUnreadMessageCount(user?.id || null);

  const isActive = (href: string) => {
    if (href === "/home") {
      return location.pathname === "/home" || location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  // Turf owners only see a simplified navbar
  const showFullNav = !isTurfOwner || rolesLoading;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/30 bg-background/95 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/80" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <nav className="container-app flex h-12 md:h-14 items-center justify-between">
        {/* Logo */}
        <Link to={isTurfOwner ? "/turf-dashboard" : "/home"} className="flex items-center gap-2 active:scale-95 transition-transform">
          <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-glow">
            <span className="text-xs md:text-sm font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-base md:text-lg font-bold font-display text-foreground hidden sm:block">SPORTIQ</span>
        </Link>

        {/* Desktop Navigation - Hidden for turf owners */}
        {showFullNav && (
          <div className="hidden md:flex md:items-center md:gap-1">
            {desktopNav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Hide messages and notifications for turf owners */}
              {showFullNav && (
                <>
                  <Link to="/messages" className="hidden md:block">
                    <Button variant="ghost" size="icon" className="relative rounded-lg h-9 w-9">
                      <MessageSquare className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  <div className="hidden md:block">
                    <NotificationsDropdown />
                  </div>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full ring-2 ring-border/30 h-8 w-8">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                        {profile?.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border/40">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-border/30" />
                  {/* Show simplified menu for turf owners */}
                  {isTurfOwner ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/turf-dashboard" className="flex items-center cursor-pointer rounded-lg">
                          <Building className="mr-2 h-4 w-4" />
                          Turf Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/me" className="flex items-center cursor-pointer rounded-lg">
                          <User className="mr-2 h-4 w-4" />
                          My Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center cursor-pointer rounded-lg">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/connected-apps" className="flex items-center cursor-pointer rounded-lg">
                          <Activity className="mr-2 h-4 w-4" />
                          Connected Apps
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center cursor-pointer rounded-lg">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="text-destructive focus:text-destructive cursor-pointer rounded-lg"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="rounded-lg">
                  Log In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button variant="hero" size="sm" className="rounded-lg">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
