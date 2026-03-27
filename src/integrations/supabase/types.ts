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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      daily_scores: {
        Row: {
          burnout_risk: number
          cognitive_readiness: number | null
          created_at: string
          id: string
          retention_outlook: number | null
          score_date: string
          user_id: string
        }
        Insert: {
          burnout_risk: number
          cognitive_readiness?: number | null
          created_at?: string
          id?: string
          retention_outlook?: number | null
          score_date?: string
          user_id: string
        }
        Update: {
          burnout_risk?: number
          cognitive_readiness?: number | null
          created_at?: string
          id?: string
          retention_outlook?: number | null
          score_date?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      student_personas: {
        Row: {
          additional_notes: string | null
          biggest_challenge: string | null
          created_at: string
          goals: string[]
          id: string
          learning_method: string | null
          motivation_type: string | null
          preferred_session_length: string | null
          social_preference: string | null
          stress_management: string | null
          study_style: string | null
          updated_at: string
          user_id: string
          weekly_study_hours: string | null
        }
        Insert: {
          additional_notes?: string | null
          biggest_challenge?: string | null
          created_at?: string
          goals?: string[]
          id?: string
          learning_method?: string | null
          motivation_type?: string | null
          preferred_session_length?: string | null
          social_preference?: string | null
          stress_management?: string | null
          study_style?: string | null
          updated_at?: string
          user_id: string
          weekly_study_hours?: string | null
        }
        Update: {
          additional_notes?: string | null
          biggest_challenge?: string | null
          created_at?: string
          goals?: string[]
          id?: string
          learning_method?: string | null
          motivation_type?: string | null
          preferred_session_length?: string | null
          social_preference?: string | null
          stress_management?: string | null
          study_style?: string | null
          updated_at?: string
          user_id?: string
          weekly_study_hours?: string | null
        }
        Relationships: []
      }
      study_logs: {
        Row: {
          created_at: string
          difficulty: number
          distraction_level: number
          duration_minutes: number
          energy_level: number
          id: string
          notes: string | null
          stress_level: number
          studied_at: string
          subject: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty: number
          distraction_level: number
          duration_minutes: number
          energy_level: number
          id?: string
          notes?: string | null
          stress_level: number
          studied_at?: string
          subject: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: number
          distraction_level?: number
          duration_minutes?: number
          energy_level?: number
          id?: string
          notes?: string | null
          stress_level?: number
          studied_at?: string
          subject?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      topic_mastery: {
        Row: {
          course_name: string
          created_at: string
          id: string
          status: string
          topic_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          status?: string
          topic_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          status?: string
          topic_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          context: Json
          created_at: string
          feedback_type: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          feedback_type: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          feedback_type?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          completed_goals: Json
          created_at: string
          daily_breakdown: Json
          goals: Json
          id: string
          status: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          completed_goals?: Json
          created_at?: string
          daily_breakdown?: Json
          goals?: Json
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          completed_goals?: Json
          created_at?: string
          daily_breakdown?: Json
          goals?: Json
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          last_active: string | null
          subjects_studied: number | null
          total_minutes: number | null
          total_sessions: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
