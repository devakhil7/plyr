import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSendMatchInvite } from "@/hooks/useMessaging";
import { Users, Search, User, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchInviteDialogProps {
  matchId: string;
  matchDetails: {
    name: string;
    date: string;
    time: string;
    turf: string;
  };
  userId: string | null;
  existingPlayerIds: string[];
  matchCity?: string;
}

export function MatchInviteDialog({ matchId, matchDetails, userId, existingPlayerIds, matchCity }: MatchInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterSameCity, setFilterSameCity] = useState(true);

  const sendInvite = useSendMatchInvite(userId);

  // Get current user's city
  const { data: currentUserProfile } = useQuery({
    queryKey: ["current-user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("city")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
    enabled: open && !!userId,
  });

  const city = matchCity || currentUserProfile?.city;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-for-invite", search, filterSameCity, city],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, name, profile_photo_url, city, position, skill_level")
        .neq("id", userId || "")
        .order("name")
        .limit(30);

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      if (filterSameCity && city) {
        query = query.ilike("city", city);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: open && !!userId,
  });

  // Filter out users who are already in the match
  const availableUsers = users.filter(u => !existingPlayerIds.includes(u.id));

  const toggleUser = (id: string) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return;

    await sendInvite.mutateAsync({
      recipientIds: selectedUsers,
      matchId,
      matchDetails,
    });

    setSelectedUsers([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-white border-white/50 hover:bg-white/10 hover:text-white">
          <Users className="h-4 w-4 mr-2" />
          Invite Players
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Players to Match</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players by name..."
              className="pl-10"
            />
          </div>

          {/* City Filter */}
          {city && (
            <div className="flex gap-2">
              <Button
                variant={filterSameCity ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterSameCity(true)}
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-1" />
                {city}
              </Button>
              <Button
                variant={!filterSameCity ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterSameCity(false)}
                className="flex-1"
              >
                All Cities
              </Button>
            </div>
          )}

          {/* User List */}
          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No players found</p>
                {filterSameCity && city && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setFilterSameCity(false)}
                    className="mt-2"
                  >
                    Show players from all cities
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {availableUsers.map((player) => (
                  <label
                    key={player.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors",
                      selectedUsers.includes(player.id) && "bg-primary/5 border border-primary/20"
                    )}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(player.id)}
                      onCheckedChange={() => toggleUser(player.id)}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={player.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {player.name?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{player.name || "Player"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{player.position || "Player"}</span>
                        {player.city && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {player.city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {player.skill_level && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {player.skill_level}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected Count & Send Button */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedUsers.length} player{selectedUsers.length !== 1 && "s"} selected
            </p>
            <Button
              onClick={handleSendInvites}
              disabled={selectedUsers.length === 0 || sendInvite.isPending}
            >
              {sendInvite.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invites"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
