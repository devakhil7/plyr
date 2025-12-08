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
      bookmarks: {
        Row: {
          created_at: string | null
          event_id: string | null
          feed_post_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          feed_post_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          feed_post_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string | null
          feed_post_id: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feed_post_id: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feed_post_id?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_providers: {
        Row: {
          access_token: string | null
          connected_at: string
          created_at: string
          expires_at: string | null
          external_user_id: string | null
          id: string
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          scopes: Json | null
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          expires_at?: string | null
          external_user_id?: string | null
          id?: string
          last_synced_at?: string | null
          provider: string
          refresh_token?: string | null
          scopes?: Json | null
          sync_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          expires_at?: string | null
          external_user_id?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: Json | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          active_minutes: number | null
          calories_burned: number | null
          created_at: string
          date: string
          hrv: number | null
          id: string
          provider: string
          raw_metadata: Json | null
          recovery_score: number | null
          resting_hr: number | null
          sleep_hours: number | null
          steps: number | null
          user_id: string
        }
        Insert: {
          active_minutes?: number | null
          calories_burned?: number | null
          created_at?: string
          date: string
          hrv?: number | null
          id?: string
          provider: string
          raw_metadata?: Json | null
          recovery_score?: number | null
          resting_hr?: number | null
          sleep_hours?: number | null
          steps?: number | null
          user_id: string
        }
        Update: {
          active_minutes?: number | null
          calories_burned?: number | null
          created_at?: string
          date?: string
          hrv?: number | null
          id?: string
          provider?: string
          raw_metadata?: Json | null
          recovery_score?: number | null
          resting_hr?: number | null
          sleep_hours?: number | null
          steps?: number | null
          user_id?: string
        }
        Relationships: []
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
      events: {
        Row: {
          city: string
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_datetime: string
          id: string
          name: string
          sport: string | null
          start_datetime: string
          status: string
          turf_id: string | null
        }
        Insert: {
          city: string
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_datetime: string
          id?: string
          name: string
          sport?: string | null
          start_datetime: string
          status?: string
          turf_id?: string | null
        }
        Update: {
          city?: string
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_datetime?: string
          id?: string
          name?: string
          sport?: string | null
          start_datetime?: string
          status?: string
          turf_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_turf_id_fkey"
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
          comments_count: number | null
          created_at: string | null
          event_id: string | null
          highlight_type: string | null
          id: string
          is_trending: boolean | null
          likes: number | null
          match_id: string | null
          media_url: string | null
          player_id: string | null
          post_type: Database["public"]["Enums"]["post_type"] | null
          shares: number | null
          trending_score: number | null
          updated_at: string | null
          user_id: string | null
          views: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          event_id?: string | null
          highlight_type?: string | null
          id?: string
          is_trending?: boolean | null
          likes?: number | null
          match_id?: string | null
          media_url?: string | null
          player_id?: string | null
          post_type?: Database["public"]["Enums"]["post_type"] | null
          shares?: number | null
          trending_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          views?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          event_id?: string | null
          highlight_type?: string | null
          id?: string
          is_trending?: boolean | null
          likes?: number | null
          match_id?: string | null
          media_url?: string | null
          player_id?: string | null
          post_type?: Database["public"]["Enums"]["post_type"] | null
          shares?: number | null
          trending_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      fitness_sessions: {
        Row: {
          avg_hr: number | null
          calories: number | null
          created_at: string
          distance_meters: number | null
          duration_seconds: number | null
          end_time: string | null
          external_activity_id: string | null
          id: string
          max_hr: number | null
          provider: string
          raw_metadata: Json | null
          start_time: string
          type: string
          user_id: string
        }
        Insert: {
          avg_hr?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          end_time?: string | null
          external_activity_id?: string | null
          id?: string
          max_hr?: number | null
          provider: string
          raw_metadata?: Json | null
          start_time: string
          type: string
          user_id: string
        }
        Update: {
          avg_hr?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          end_time?: string | null
          external_activity_id?: string | null
          id?: string
          max_hr?: number | null
          provider?: string
          raw_metadata?: Json | null
          start_time?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          followed_player_id: string | null
          followed_turf_id: string | null
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          followed_player_id?: string | null
          followed_turf_id?: string | null
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          followed_player_id?: string | null
          followed_turf_id?: string | null
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followed_player_id_fkey"
            columns: ["followed_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followed_turf_id_fkey"
            columns: ["followed_turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      highlight_clips: {
        Row: {
          caption: string | null
          clip_video_url: string | null
          created_at: string
          end_time_seconds: number
          goal_timestamp_seconds: number
          id: string
          is_selected: boolean
          match_id: string | null
          start_time_seconds: number
          video_analysis_job_id: string
        }
        Insert: {
          caption?: string | null
          clip_video_url?: string | null
          created_at?: string
          end_time_seconds: number
          goal_timestamp_seconds: number
          id?: string
          is_selected?: boolean
          match_id?: string | null
          start_time_seconds: number
          video_analysis_job_id: string
        }
        Update: {
          caption?: string | null
          clip_video_url?: string | null
          created_at?: string
          end_time_seconds?: number
          goal_timestamp_seconds?: number
          id?: string
          is_selected?: boolean
          match_id?: string | null
          start_time_seconds?: number
          video_analysis_job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlight_clips_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_clips_video_analysis_job_id_fkey"
            columns: ["video_analysis_job_id"]
            isOneToOne: false
            referencedRelation: "video_analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          feed_post_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feed_post_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feed_post_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          assist_user_id: string | null
          created_at: string | null
          id: string
          match_id: string
          minute: number | null
          scorer_user_id: string
          team: string
        }
        Insert: {
          assist_user_id?: string | null
          created_at?: string | null
          id?: string
          match_id: string
          minute?: number | null
          scorer_user_id: string
          team: string
        }
        Update: {
          assist_user_id?: string | null
          created_at?: string | null
          id?: string
          match_id?: string
          minute?: number | null
          scorer_user_id?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_assist_user_id_fkey"
            columns: ["assist_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_scorer_user_id_fkey"
            columns: ["scorer_user_id"]
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
          offline_player_name: string | null
          role: Database["public"]["Enums"]["player_role"] | null
          team: Database["public"]["Enums"]["team_type"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          join_status?: Database["public"]["Enums"]["join_status"] | null
          match_id: string
          offline_player_name?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          team?: Database["public"]["Enums"]["team_type"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          join_status?: Database["public"]["Enums"]["join_status"] | null
          match_id?: string
          offline_player_name?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          team?: Database["public"]["Enums"]["team_type"] | null
          user_id?: string | null
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          match_id: string | null
          message_type: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          message_type?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          message_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_requests: {
        Row: {
          admin_notes: string | null
          amenities: string[] | null
          business_name: string
          city: string
          created_at: string
          description: string | null
          email: string
          google_maps_link: string | null
          id: string
          location_address: string
          owner_name: string
          phone: string
          sport_types: string[]
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amenities?: string[] | null
          business_name: string
          city: string
          created_at?: string
          description?: string | null
          email: string
          google_maps_link?: string | null
          id?: string
          location_address: string
          owner_name: string
          phone: string
          sport_types: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amenities?: string[] | null
          business_name?: string
          city?: string
          created_at?: string
          description?: string | null
          email?: string
          google_maps_link?: string | null
          id?: string
          location_address?: string
          owner_name?: string
          phone?: string
          sport_types?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_total: number
          commission_type_used: string | null
          commission_value_used: number | null
          created_at: string | null
          currency: string
          id: string
          is_advance: boolean | null
          match_id: string | null
          paid_at: string | null
          payer_id: string | null
          payment_method: string
          payment_purpose: string | null
          payment_reference: string | null
          payout_id: string | null
          platform_fee: number
          status: string
          tournament_id: string | null
          tournament_team_id: string | null
          turf_amount: number
          turf_id: string
        }
        Insert: {
          amount_total?: number
          commission_type_used?: string | null
          commission_value_used?: number | null
          created_at?: string | null
          currency?: string
          id?: string
          is_advance?: boolean | null
          match_id?: string | null
          paid_at?: string | null
          payer_id?: string | null
          payment_method?: string
          payment_purpose?: string | null
          payment_reference?: string | null
          payout_id?: string | null
          platform_fee?: number
          status?: string
          tournament_id?: string | null
          tournament_team_id?: string | null
          turf_amount?: number
          turf_id: string
        }
        Update: {
          amount_total?: number
          commission_type_used?: string | null
          commission_value_used?: number | null
          created_at?: string | null
          currency?: string
          id?: string
          is_advance?: boolean | null
          match_id?: string | null
          paid_at?: string | null
          payer_id?: string | null
          payment_method?: string
          payment_purpose?: string | null
          payment_reference?: string | null
          payout_id?: string | null
          platform_fee?: number
          status?: string
          tournament_id?: string | null
          tournament_team_id?: string | null
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
            foreignKeyName: "payments_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tournament_team_id_fkey"
            columns: ["tournament_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
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
      platform_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      player_ratings: {
        Row: {
          ball_control: number | null
          comment: string | null
          created_at: string | null
          defending: number | null
          dribbling: number | null
          finishing: number | null
          id: string
          is_flagged: boolean | null
          match_id: string
          moderation_status: string | null
          pace: number | null
          passing: number | null
          rated_user_id: string
          rater_user_id: string
          rating: number
          shooting: number | null
        }
        Insert: {
          ball_control?: number | null
          comment?: string | null
          created_at?: string | null
          defending?: number | null
          dribbling?: number | null
          finishing?: number | null
          id?: string
          is_flagged?: boolean | null
          match_id: string
          moderation_status?: string | null
          pace?: number | null
          passing?: number | null
          rated_user_id: string
          rater_user_id: string
          rating: number
          shooting?: number | null
        }
        Update: {
          ball_control?: number | null
          comment?: string | null
          created_at?: string | null
          defending?: number | null
          dribbling?: number | null
          finishing?: number | null
          id?: string
          is_flagged?: boolean | null
          match_id?: string
          moderation_status?: string | null
          pace?: number | null
          passing?: number | null
          rated_user_id?: string
          rater_user_id?: string
          rating?: number
          shooting?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_rated_user_id_fkey"
            columns: ["rated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          favourite_club: string | null
          favourite_player: string | null
          height_cm: number | null
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
          weight_kg: number | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          favourite_club?: string | null
          favourite_player?: string | null
          height_cm?: number | null
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
          weight_kg?: number | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          favourite_club?: string | null
          favourite_player?: string | null
          height_cm?: number | null
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
          weight_kg?: number | null
        }
        Relationships: []
      }
      tournament_matches: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          round: string
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          round: string
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          round?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_team_players: {
        Row: {
          created_at: string | null
          id: string
          player_contact: string | null
          player_name: string
          tournament_team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_contact?: string | null
          player_name: string
          tournament_team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          player_contact?: string | null
          player_name?: string
          tournament_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_team_players_tournament_team_id_fkey"
            columns: ["tournament_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          captain_user_id: string
          created_at: string | null
          id: string
          payment_status: string | null
          registration_status: string | null
          team_name: string
          total_fee: number | null
          total_paid: number | null
          tournament_id: string
        }
        Insert: {
          captain_user_id: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          registration_status?: string | null
          team_name: string
          total_fee?: number | null
          total_paid?: number | null
          tournament_id: string
        }
        Update: {
          captain_user_id?: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          registration_status?: string | null
          team_name?: string
          total_fee?: number | null
          total_paid?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_captain_user_id_fkey"
            columns: ["captain_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          advance_type: string | null
          advance_value: number | null
          allow_part_payment: boolean | null
          city: string
          cover_image_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_datetime: string
          entry_fee: number | null
          id: string
          max_players_per_team: number | null
          max_playing_players: number | null
          max_subs: number | null
          min_players_per_team: number | null
          name: string
          prize_details: string | null
          registration_deadline: string | null
          registration_open: boolean | null
          rules: string | null
          sport: string | null
          start_datetime: string
          status: string | null
          turf_id: string | null
        }
        Insert: {
          advance_type?: string | null
          advance_value?: number | null
          allow_part_payment?: boolean | null
          city: string
          cover_image_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_datetime: string
          entry_fee?: number | null
          id?: string
          max_players_per_team?: number | null
          max_playing_players?: number | null
          max_subs?: number | null
          min_players_per_team?: number | null
          name: string
          prize_details?: string | null
          registration_deadline?: string | null
          registration_open?: boolean | null
          rules?: string | null
          sport?: string | null
          start_datetime: string
          status?: string | null
          turf_id?: string | null
        }
        Update: {
          advance_type?: string | null
          advance_value?: number | null
          allow_part_payment?: boolean | null
          city?: string
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_datetime?: string
          entry_fee?: number | null
          id?: string
          max_players_per_team?: number | null
          max_playing_players?: number | null
          max_subs?: number | null
          min_players_per_team?: number | null
          name?: string
          prize_details?: string | null
          registration_deadline?: string | null
          registration_open?: boolean | null
          rules?: string | null
          sport?: string | null
          start_datetime?: string
          status?: string | null
          turf_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
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
          commission_type: string | null
          commission_value: number | null
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
          payout_frequency: string | null
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
          commission_type?: string | null
          commission_value?: number | null
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
          payout_frequency?: string | null
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
          commission_type?: string | null
          commission_value?: number | null
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
          payout_frequency?: string | null
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
      user_photos: {
        Row: {
          created_at: string | null
          id: string
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_videos: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          video_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          video_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_analysis_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          match_id: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          match_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          match_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_analysis_jobs_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_analysis_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_match_host: {
        Args: { _match_id: string; _user_id: string }
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
