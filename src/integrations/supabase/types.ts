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
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          turf_id: string
          used_count: number | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          turf_id: string
          used_count?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          turf_id?: string
          used_count?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
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
          is_offline_booking: boolean | null
          match_date: string
          match_name: string
          match_time: string
          notes: string | null
          offline_contact_name: string | null
          offline_contact_phone: string | null
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
          is_offline_booking?: boolean | null
          match_date: string
          match_name: string
          match_time: string
          notes?: string | null
          offline_contact_name?: string | null
          offline_contact_phone?: string | null
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
          is_offline_booking?: boolean | null
          match_date?: string
          match_name?: string
          match_time?: string
          notes?: string | null
          offline_contact_name?: string | null
          offline_contact_phone?: string | null
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
      payments: {
        Row: {
          amount_total: number
          created_at: string | null
          currency: string
          id: string
          match_id: string | null
          paid_at: string | null
          payer_id: string | null
          payment_method: string
          payment_reference: string | null
          platform_fee: number
          status: string
          turf_amount: number
          turf_id: string
        }
        Insert: {
          amount_total?: number
          created_at?: string | null
          currency?: string
          id?: string
          match_id?: string | null
          paid_at?: string | null
          payer_id?: string | null
          payment_method?: string
          payment_reference?: string | null
          platform_fee?: number
          status?: string
          turf_amount?: number
          turf_id: string
        }
        Update: {
          amount_total?: number
          created_at?: string | null
          currency?: string
          id?: string
          match_id?: string | null
          paid_at?: string | null
          payer_id?: string | null
          payment_method?: string
          payment_reference?: string | null
          platform_fee?: number
          status?: string
          turf_amount?: number
          turf_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_fees: number
          amount_gross: number
          amount_net: number
          created_at: string | null
          id: string
          payout_date: string | null
          payout_reference: string | null
          period_end: string
          period_start: string
          status: string
          turf_id: string
        }
        Insert: {
          amount_fees?: number
          amount_gross?: number
          amount_net?: number
          created_at?: string | null
          id?: string
          payout_date?: string | null
          payout_reference?: string | null
          period_end: string
          period_start: string
          status?: string
          turf_id: string
        }
        Update: {
          amount_fees?: number
          amount_gross?: number
          amount_net?: number
          created_at?: string | null
          id?: string
          payout_date?: string | null
          payout_reference?: string | null
          period_end?: string
          period_start?: string
          status?: string
          turf_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_turf_id_fkey"
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
      turf_owners: {
        Row: {
          created_at: string | null
          id: string
          is_primary_owner: boolean | null
          turf_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary_owner?: boolean | null
          turf_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary_owner?: boolean | null
          turf_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turf_owners_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      turf_payout_details: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          ifsc_code: string | null
          turf_id: string
          updated_at: string | null
          upi_id: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          ifsc_code?: string | null
          turf_id: string
          updated_at?: string | null
          upi_id?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          ifsc_code?: string | null
          turf_id?: string
          updated_at?: string | null
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turf_payout_details_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: true
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      turfs: {
        Row: {
          active: boolean | null
          amenities: string[] | null
          blocked_slots: Json | null
          cancellation_policy: string | null
          city: string
          created_at: string | null
          description: string | null
          google_maps_link: string | null
          id: string
          is_featured: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          opening_hours: Json | null
          owner_contact: string | null
          owner_email: string | null
          photos: string[] | null
          price_per_hour: number | null
          pricing_rules: Json | null
          refund_policy: string | null
          rules: string | null
          slot_duration_minutes: number | null
          sport_type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          amenities?: string[] | null
          blocked_slots?: Json | null
          cancellation_policy?: string | null
          city: string
          created_at?: string | null
          description?: string | null
          google_maps_link?: string | null
          id?: string
          is_featured?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          owner_contact?: string | null
          owner_email?: string | null
          photos?: string[] | null
          price_per_hour?: number | null
          pricing_rules?: Json | null
          refund_policy?: string | null
          rules?: string | null
          slot_duration_minutes?: number | null
          sport_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          amenities?: string[] | null
          blocked_slots?: Json | null
          cancellation_policy?: string | null
          city?: string
          created_at?: string | null
          description?: string | null
          google_maps_link?: string | null
          id?: string
          is_featured?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          owner_contact?: string | null
          owner_email?: string | null
          photos?: string[] | null
          price_per_hour?: number | null
          pricing_rules?: Json | null
          refund_policy?: string | null
          rules?: string | null
          slot_duration_minutes?: number | null
          sport_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      analytics_status: "none" | "processing" | "completed" | "failed"
      app_role: "player" | "admin" | "turf_owner"
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
      app_role: ["player", "admin", "turf_owner"],
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
