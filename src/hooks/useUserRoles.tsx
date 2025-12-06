import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "player" | "admin" | "turf_owner";

interface UserRoles {
  roles: AppRole[];
  isAdmin: boolean;
  isTurfOwner: boolean;
  isPlayer: boolean;
  loading: boolean;
}

export function useUserRoles(): UserRoles {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching user roles:", error);
        return [];
      }
      
      return data?.map((r) => r.role as AppRole) || [];
    },
    enabled: !!user?.id,
  });

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isTurfOwner: roles.includes("turf_owner"),
    isPlayer: roles.includes("player"),
    loading: isLoading,
  };
}

export function useOwnedTurfs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owned-turfs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("turf_owners")
        .select(`
          id,
          is_primary_owner,
          turfs (
            id,
            name,
            location,
            city,
            price_per_hour,
            sport_type,
            description,
            is_featured,
            active,
            photos
          )
        `)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching owned turfs:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
}
