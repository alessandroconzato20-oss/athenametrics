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
      consent_logs: {
        Row: {
          consent_type: string
          consented: boolean
          created_at: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          consented?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          consented?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      library_members: {
        Row: {
          id: string
          joined_at: string
          library_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          library_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          library_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_members_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "study_libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          matricola: string | null
          university: string | null
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          matricola?: string | null
          university?: string | null
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          matricola?: string | null
          university?: string | null
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
      study_libraries: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      study_logs: {
        Row: {
          comprehension_level: number | null
          confidence_level: number | null
          created_at: string
          difficulty: number
          distraction_level: number
          duration_minutes: number
          energy_level: number
          id: string
          notes: string | null
          revision_priority: number | null
          stress_level: number
          studied_at: string
          subject: string
          teaching_readiness: number | null
          topic: string
          user_id: string
        }
        Insert: {
          comprehension_level?: number | null
          confidence_level?: number | null
          created_at?: string
          difficulty: number
          distraction_level: number
          duration_minutes: number
          energy_level: number
          id?: string
          notes?: string | null
          revision_priority?: number | null
          stress_level: number
          studied_at?: string
          subject: string
          teaching_readiness?: number | null
          topic: string
          user_id: string
        }
        Update: {
          comprehension_level?: number | null
          confidence_level?: number | null
          created_at?: string
          difficulty?: number
          distraction_level?: number
          duration_minutes?: number
          energy_level?: number
          id?: string
          notes?: string | null
          revision_priority?: number | null
          stress_level?: number
          studied_at?: string
          subject?: string
          teaching_readiness?: number | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      study_schedule: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          notes: string | null
          schedule_date: string
          start_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          schedule_date: string
          start_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          schedule_date?: string
          start_time?: string | null
          title?: string
          updated_at?: string
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
      university_access_codes: {
        Row: {
          access_code: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          university_name: string
        }
        Insert: {
          access_code: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          university_name: string
        }
        Update: {
          access_code?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          university_name?: string
        }
        Relationships: []
      }
      university_syllabi: {
        Row: {
          course_name: string
          created_at: string
          credits: number | null
          id: string
          notes: string | null
          pdf_path: string | null
          semester: number | null
          status: string
          topics: Json
          university_name: string
          updated_at: string
          uploaded_by: string
          year: number
        }
        Insert: {
          course_name: string
          created_at?: string
          credits?: number | null
          id?: string
          notes?: string | null
          pdf_path?: string | null
          semester?: number | null
          status?: string
          topics?: Json
          university_name: string
          updated_at?: string
          uploaded_by: string
          year: number
        }
        Update: {
          course_name?: string
          created_at?: string
          credits?: number | null
          id?: string
          notes?: string | null
          pdf_path?: string | null
          semester?: number | null
          status?: string
          topics?: Json
          university_name?: string
          updated_at?: string
          uploaded_by?: string
          year?: number
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      delete_user_data: { Args: { _user_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_library_member: {
        Args: { _library_id: string; _user_id: string }
        Returns: boolean
      }
      join_library_by_code: {
        Args: { _invite_code: string; _user_id: string }
        Returns: string
      }
      verify_university_code: {
        Args: {
          _access_code: string
          _university_name: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "university_admin"
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
      app_role: ["admin", "user", "university_admin"],
    },
  },
} as const
