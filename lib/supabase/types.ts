export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          home_location: string | null;
          baseline_preferences: Json | null;
          is_pro: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      preference_snapshots: {
        Row: {
          id: string;
          user_id: string | null;
          preferences: Json;
          created_at: string;
        };
        Insert: { user_id?: string | null; preferences: Json };
        Update: never;
      };
      saved_trips: {
        Row: {
          id: string;
          user_id: string;
          zone_id: string;
          preference_snapshot_id: string | null;
          score: number | null;
          notes: string | null;
          saved_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["saved_trips"]["Row"], "id" | "saved_at">;
        Update: Partial<Pick<Database["public"]["Tables"]["saved_trips"]["Row"], "notes">>;
      };
      field_reports: {
        Row: {
          id: string;
          user_id: string;
          saved_trip_id: string;
          zone_id: string;
          rating: number | null;
          notes: string | null;
          trip_start_date: string | null;
          trip_end_date: string | null;
          conditions: Json | null;
          would_return: boolean | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["field_reports"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["field_reports"]["Insert"], "user_id" | "saved_trip_id" | "zone_id">>;
      };
      zones: {
        Row: {
          id: string;
          name: string;
          state: string;
          region: string;
          skill_level: string;
          vehicle_requirement: string;
          drive_time_from_denver_hours: number;
          off_grid_level: number;
          crowd_level: number;
          hidden_gem_score: number;
          best_seasons: string[];
          camping_types: string[];
          coordinates: unknown | null;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["zones"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["zones"]["Insert"]>;
      };
    };
  };
};
