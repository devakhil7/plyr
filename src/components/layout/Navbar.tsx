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
import { Menu, X, User, LogOut, LayoutDashboard, Shield, Building, MessageSquare, Activity } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useUnreadMessageCount } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import sportqLogo from "@/assets/sportq-logo.png";

const navigation = [
  { name: "Feed", href: "/feed" },
  { name: "Matches", href: "/matches" },
  { name: "Turfs", href: "/turfs" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Leaderboards", href: "/leaderboards" },
  { name: "Improve", href: "/improve/football" },
  { name: "Get Analytics", href: "/get-analytics" },
];

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { isAdmin, isTurfOwner } = useUserRoles();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { unreadCount } = useUnreadMessageCount(user?.id || null);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/60 backdrop-blur-xl">
      <nav className="container-app flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={sportqLogo} alt="SportQ Logo" className="h-10 w-auto object-contain" />
          <span className="text-xl font-bold font-display text-foreground">SPORTQ</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
        {user ? (
            <>
              <Link to="/messages" className="hidden md:block">
                <Button variant="ghost" size="icon" className="relative rounded-xl">
                  <MessageSquare className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <div className="hidden md:block">
                <NotificationsDropdown />
              </div>
              <Link to="/dashboard" className="hidden md:block">
                <Button variant="glass" size="sm" className="rounded-xl">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full ring-2 ring-border/30">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
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
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center cursor-pointer rounded-lg">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center cursor-pointer rounded-lg">
                      <User className="mr-2 h-4 w-4" />
                      Profile
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
                  {isTurfOwner && (
                    <DropdownMenuItem asChild>
                      <Link to="/turf-dashboard" className="flex items-center cursor-pointer rounded-lg">
                        <Building className="mr-2 h-4 w-4" />
                        Turf Dashboard
                      </Link>
                    </DropdownMenuItem>
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
                <Button variant="ghost" size="sm" className="rounded-xl">
                  Log In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button variant="hero" size="sm" className="rounded-xl">
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/30 bg-card/95 backdrop-blur-xl animate-slide-up">
          <div className="container-app py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.name}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  to="/messages"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <MessageSquare className="h-4 w-4" />
                  Messages
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    Admin Panel
                  </Link>
                )}
                {isTurfOwner && (
                  <Link
                    to="/turf-dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    Turf Dashboard
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
