import { Bell, MessageSquare, Users, Star, Trophy, Calendar, Check, X, UserPlus } from "lucide-react";
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
import { useNotifications, useUnreadMessageCount, useMatchNotifications } from "@/hooks/useNotifications";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function NotificationsDropdown() {
  const { user } = useAuth();
  const { notifications, unreadCount: dbUnreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id || null);
  const { unreadCount: messageUnreadCount } = useUnreadMessageCount(user?.id || null);
  const { data: matchNotifications = [] } = useMatchNotifications(user?.id || null);

  const totalNotifications = dbUnreadCount + messageUnreadCount + matchNotifications.length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_message":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case "match_join_request":
      case "match_join_approved":
      case "match_join_rejected":
        return <Users className="h-4 w-4 text-green-500" />;
      case "match_invite":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "match_reminder":
      case "match_completed":
      case "match_cancelled":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "tournament_team_approved":
      case "tournament_team_rejected":
      case "tournament_reminder":
      case "tournament_match_scheduled":
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case "tournament_invite":
        return <Trophy className="h-4 w-4 text-green-500" />;
      case "rating_received":
      case "rating_approved":
      case "rating_rejected":
        return <Star className="h-4 w-4 text-orange-500" />;
      case "new_follower":
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case "new_message":
        return "bg-primary/10";
      case "match_join_request":
      case "match_join_approved":
      case "match_join_rejected":
      case "match_invite":
        return "bg-green-500/10";
      case "match_reminder":
      case "match_completed":
      case "match_cancelled":
        return "bg-blue-500/10";
      case "tournament_team_approved":
      case "tournament_team_rejected":
      case "tournament_reminder":
      case "tournament_match_scheduled":
        return "bg-yellow-500/10";
      case "tournament_invite":
        return "bg-green-500/10";
      case "rating_received":
      case "rating_approved":
      case "rating_rejected":
        return "bg-orange-500/10";
      case "new_follower":
        return "bg-purple-500/10";
      default:
        return "bg-muted";
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
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {totalNotifications > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {totalNotifications} new
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => markAllAsRead()}
              >
                <Check className="h-3 w-3 mr-1" />
                Read all
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Unread Messages */}
        {messageUnreadCount > 0 && (
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
                  You have {messageUnreadCount} unread message{messageUnreadCount !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          </DropdownMenuItem>
        )}

        {/* Match Join Requests (legacy) */}
        {matchNotifications.slice(0, 3).map((notification) => (
          <DropdownMenuItem key={notification.id} asChild>
            <Link 
              to={notification.link || "#"} 
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getNotificationBgColor(notification.type)}`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}

        {/* Database Notifications */}
        {notifications.slice(0, 10).map((notification) => (
          <DropdownMenuItem 
            key={notification.id} 
            asChild
            className={notification.is_read ? "opacity-60" : ""}
          >
            <Link 
              to={notification.link || "#"} 
              className="flex items-start gap-3 p-3 cursor-pointer"
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getNotificationBgColor(notification.type)}`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
              {!notification.is_read && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
              )}
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
