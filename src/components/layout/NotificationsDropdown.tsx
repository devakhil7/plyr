import { Bell, MessageSquare, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessageCount, useMatchNotifications } from "@/hooks/useNotifications";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NotificationsDropdown() {
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessageCount(user?.id || null);
  const { data: matchNotifications = [] } = useMatchNotifications(user?.id || null);

  const totalNotifications = unreadCount + matchNotifications.length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case "match_join":
        return <Users className="h-4 w-4 text-green-500" />;
      case "rating":
        return <Star className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalNotifications > 9 ? "9+" : totalNotifications}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {totalNotifications > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalNotifications} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Unread Messages */}
        {unreadCount > 0 && (
          <DropdownMenuItem asChild>
            <Link 
              to="/messages" 
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Unread Messages</p>
                <p className="text-xs text-muted-foreground">
                  You have {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          </DropdownMenuItem>
        )}

        {/* Match Notifications */}
        {matchNotifications.slice(0, 5).map((notification) => (
          <DropdownMenuItem key={notification.id} asChild>
            <Link 
              to={notification.link || "#"} 
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {notification.description}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}

        {/* Empty State */}
        {totalNotifications === 0 && (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No new notifications</p>
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link 
            to="/messages" 
            className="flex items-center justify-center gap-2 p-2 cursor-pointer text-primary"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">View all messages</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
