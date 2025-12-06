export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics: {
        Row: {
          assists_team_a: number | null
          assists_team_b: number | null
          created_at: string | null
          goals_team_a: number | null
          goals_team_b: number | null
          heatmap_url: string | null
          highlights_url: string | null
          id: string
          match_id: string
          possession_team_a: number | null
          possession_team_b: number | null
          shots_on_target_a: number | null
          shots_on_target_b: number | null
        }
        Insert: {
          assists_team_a?: number | null
          assists_team_b?: number | null
          created_at?: string | null
          goals_team_a?: number | null
          goals_team_b?: number | null
          heatmap_url?: string | null
          highlights_url?: string | null
          id?: string
          match_id: string
          possession_team_a?: number | null
          possession_team_b?: number | null
          shots_on_target_a?: number | null
          shots_on_target_b?: number | null
        }
        Update: {
          assists_team_a?: number | null
          assists_team_b?: number | null
          created_at?: string | null
          goals_team_a?: number | null
          goals_team_b?: number | null
          heatmap_url?: string | null
          highlights_url?: string | null
          id?: string
          match_id?: string
          possession_team_a?: number | null
          possession_team_b?: number | null
          shots_on_target_a?: number | null
          shots_on_target_b?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          likes: number | null
          match_id: string | null
          media_url: string | null
          post_type: Database["public"]["Enums"]["post_type"] | null
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          likes?: number | null
          match_id?: string | null
          media_url?: string | null
          post_type?: Database["public"]["Enums"]["post_type"] | null
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          likes?: number | null
          match_id?: string | null
          media_url?: string | null
          post_type?: Database["public"]["Enums"]["post_type"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string | null
          id: string
          join_status: Database["public"]["Enums"]["join_status"] | null
          match_id: string
          role: Database["public"]["Enums"]["player_role"] | null
          team: Database["public"]["Enums"]["team_type"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          join_status?: Database["public"]["Enums"]["join_status"] | null
          match_id: string
          role?: Database["public"]["Enums"]["player_role"] | null
          team?: Database["public"]["Enums"]["team_type"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          join_status?: Database["public"]["Enums"]["join_status"] | null
          match_id?: string
          role?: Database["public"]["Enums"]["player_role"] | null
          team?: Database["public"]["Enums"]["team_type"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          analytics_status:
            | Database["public"]["Enums"]["analytics_status"]
            | null
          created_at: string | null
          duration_minutes: number | null
          host_id: string
          id: string
          is_featured: boolean | null
          match_date: string
          match_name: string
          match_time: string
          notes: string | null
          required_skill_max: Database["public"]["Enums"]["skill_level"] | null
          required_skill_min: Database["public"]["Enums"]["skill_level"] | null
          sport: string | null
          status: Database["public"]["Enums"]["match_status"] | null
          team_a_score: number | null
          team_assignment_mode:
            | Database["public"]["Enums"]["team_assignment_mode"]
            | null
          team_b_score: number | null
          total_slots: number | null
          turf_id: string | null
          updated_at: string | null
          video_url: string | null
          visibility: Database["public"]["Enums"]["visibility_type"] | null
        }
        Insert: {
          analytics_status?:
            | Database["public"]["Enums"]["analytics_status"]
            | null
          created_at?: string | null
          duration_minutes?: number | null
          host_id: string
          id?: string
          is_featured?: boolean | null
          match_date: string
          match_name: string
          match_time: string
          notes?: string | null
          required_skill_max?: Database["public"]["Enums"]["skill_level"] | null
          required_skill_min?: Database["public"]["Enums"]["skill_level"] | null
          sport?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          team_a_score?: number | null
          team_assignment_mode?:
            | Database["public"]["Enums"]["team_assignment_mode"]
            | null
          team_b_score?: number | null
          total_slots?: number | null
          turf_id?: string | null
          updated_at?: string | null
          video_url?: string | null
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Update: {
          analytics_status?:
            | Database["public"]["Enums"]["analytics_status"]
            | null
          created_at?: string | null
          duration_minutes?: number | null
          host_id?: string
          id?: string
          is_featured?: boolean | null
          match_date?: string
          match_name?: string
          match_time?: string
          notes?: string | null
          required_skill_max?: Database["public"]["Enums"]["skill_level"] | null
          required_skill_min?: Database["public"]["Enums"]["skill_level"] | null
          sport?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          team_a_score?: number | null
          team_assignment_mode?:
            | Database["public"]["Enums"]["team_assignment_mode"]
            | null
          team_b_score?: number | null
          total_slots?: number | null
          turf_id?: string | null
          updated_at?: string | null
          video_url?: string | null
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          location: string | null
          name: string | null
          position: string | null
          profile_completed: boolean | null
          profile_photo_url: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          sport_preference: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          location?: string | null
          name?: string | null
          position?: string | null
          profile_completed?: boolean | null
          profile_photo_url?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          sport_preference?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          location?: string | null
          name?: string | null
          position?: string | null
          profile_completed?: boolean | null
          profile_photo_url?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          sport_preference?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      turf_bookings: {
        Row: {
          amount_paid: number
          booking_date: string
          created_at: string
          duration_minutes: number
          end_time: string
          id: string
          match_id: string | null
          payment_id: string | null
          payment_status: string
          razorpay_order_id: string | null
          start_time: string
          turf_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          booking_date: string
          created_at?: string
          duration_minutes?: number
          end_time: string
          id?: string
          match_id?: string | null
          payment_id?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          start_time: string
          turf_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          booking_date?: string
          created_at?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          match_id?: string | null
          payment_id?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          start_time?: string
          turf_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turf_bookings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turf_bookings_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turf_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      turfs: {
        Row: {
          city: string
          created_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          location: string
          name: string
          owner_contact: string | null
          photos: string[] | null
          price_per_hour: number | null
          sport_type: string | null
          updated_at: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          location: string
          name: string
          owner_contact?: string | null
          photos?: string[] | null
          price_per_hour?: number | null
          sport_type?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string
          name?: string
          owner_contact?: string | null
          photos?: string[] | null
          price_per_hour?: number | null
          sport_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      analytics_status: "none" | "processing" | "completed" | "failed"
      join_status: "requested" | "confirmed" | "rejected" | "cancelled"
      match_status: "open" | "full" | "in_progress" | "completed" | "cancelled"
      player_role: "host" | "player" | "substitute"
      post_type: "highlight" | "announcement" | "stat"
      skill_level: "beginner" | "intermediate" | "advanced"
      team_assignment_mode: "auto" | "manual"
      team_type: "A" | "B" | "unassigned"
      visibility_type: "public" | "private"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      analytics_status: ["none", "processing", "completed", "failed"],
      join_status: ["requested", "confirmed", "rejected", "cancelled"],
      match_status: ["open", "full", "in_progress", "completed", "cancelled"],
      player_role: ["host", "player", "substitute"],
      post_type: ["highlight", "announcement", "stat"],
      skill_level: ["beginner", "intermediate", "advanced"],
      team_assignment_mode: ["auto", "manual"],
      team_type: ["A", "B", "unassigned"],
      visibility_type: ["public", "private"],
    },
  },
} as const
