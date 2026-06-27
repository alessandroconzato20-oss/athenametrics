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
      admin_access_log: {
        Row: {
          action: string
          admin_user_id: string
          context: Json
          created_at: string
          id: string
          target_user_id: string | null
          university_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          context?: Json
          created_at?: string
          id?: string
          target_user_id?: string | null
          university_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          context?: Json
          created_at?: string
          id?: string
          target_user_id?: string | null
          university_id?: string | null
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          assessed_at: string
          course_name: string
          created_at: string
          id: string
          max_score: number
          score: number
          university_id: string | null
          user_id: string
        }
        Insert: {
          assessed_at?: string
          course_name: string
          created_at?: string
          id?: string
          max_score?: number
          score: number
          university_id?: string | null
          user_id: string
        }
        Update: {
          assessed_at?: string
          course_name?: string
          created_at?: string
          id?: string
          max_score?: number
          score?: number
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_snapshots: {
        Row: {
          created_at: string
          data: Json
          id: string
          recorded_at: string
          snapshot_type: string
          university_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          recorded_at?: string
          snapshot_type: string
          university_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          recorded_at?: string
          snapshot_type?: string
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_snapshots_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      chronotype_profiles: {
        Row: {
          chronotype_category: string | null
          created_at: string
          id: string
          msfsc_midpoint: string | null
          raw_responses: Json
          sleep_duration_free_hours: number | null
          sleep_duration_workdays_hours: number | null
          social_jetlag_hours: number | null
          university_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chronotype_category?: string | null
          created_at?: string
          id?: string
          msfsc_midpoint?: string | null
          raw_responses?: Json
          sleep_duration_free_hours?: number | null
          sleep_duration_workdays_hours?: number | null
          social_jetlag_hours?: number | null
          university_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chronotype_category?: string | null
          created_at?: string
          id?: string
          msfsc_midpoint?: string | null
          raw_responses?: Json
          sleep_duration_free_hours?: number | null
          sleep_duration_workdays_hours?: number | null
          social_jetlag_hours?: number | null
          university_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cohort_invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          max_uses: number | null
          university_id: string
          university_name: string
          updated_at: string
          uses_count: number
          year: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          university_id: string
          university_name: string
          updated_at?: string
          uses_count?: number
          year?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          university_id?: string
          university_name?: string
          updated_at?: string
          uses_count?: number
          year?: number | null
        }
        Relationships: []
      }
      consent_logs: {
        Row: {
          consent_type: string
          consented: boolean
          created_at: string
          id: string
          ip_address: string | null
          university_id: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          consented?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          university_id?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          consented?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_logs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_biometrics: {
        Row: {
          created_at: string
          hrv_available: boolean
          hrv_sdnn: number | null
          id: string
          recorded_date: string
          resting_hr: number | null
          sleep_duration_hours: number | null
          sleep_rem_percent: number | null
          sleep_sws_percent: number | null
          sleep_timing_variance_7d: number | null
          source: string
          spo2_percent: number | null
          university_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hrv_available?: boolean
          hrv_sdnn?: number | null
          id?: string
          recorded_date?: string
          resting_hr?: number | null
          sleep_duration_hours?: number | null
          sleep_rem_percent?: number | null
          sleep_sws_percent?: number | null
          sleep_timing_variance_7d?: number | null
          source?: string
          spo2_percent?: number | null
          university_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hrv_available?: boolean
          hrv_sdnn?: number | null
          id?: string
          recorded_date?: string
          resting_hr?: number | null
          sleep_duration_hours?: number | null
          sleep_rem_percent?: number | null
          sleep_sws_percent?: number | null
          sleep_timing_variance_7d?: number | null
          source?: string
          spo2_percent?: number | null
          university_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_scores: {
        Row: {
          attentional_fragmentation_flag: boolean
          burnout_capacity_flag: boolean
          burnout_risk: number
          cognitive_readiness: number | null
          created_at: string
          id: string
          retention_outlook: number | null
          score_date: string
          university_id: string | null
          user_id: string
        }
        Insert: {
          attentional_fragmentation_flag?: boolean
          burnout_capacity_flag?: boolean
          burnout_risk: number
          cognitive_readiness?: number | null
          created_at?: string
          id?: string
          retention_outlook?: number | null
          score_date?: string
          university_id?: string | null
          user_id: string
        }
        Update: {
          attentional_fragmentation_flag?: boolean
          burnout_capacity_flag?: boolean
          burnout_risk?: number
          cognitive_readiness?: number | null
          created_at?: string
          id?: string
          retention_outlook?: number | null
          score_date?: string
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_scores_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_wellbeing_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          did_exercise: boolean | null
          emotional_exhaustion: number | null
          exercise_duration_minutes: number | null
          exercise_type: string | null
          id: string
          motivation_level: number
          night_factors: string[]
          rest_level: number
          stress_level: number
          study_plan_window: string | null
          university_id: string | null
          user_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          did_exercise?: boolean | null
          emotional_exhaustion?: number | null
          exercise_duration_minutes?: number | null
          exercise_type?: string | null
          id?: string
          motivation_level: number
          night_factors?: string[]
          rest_level: number
          stress_level: number
          study_plan_window?: string | null
          university_id?: string | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          did_exercise?: boolean | null
          emotional_exhaustion?: number | null
          exercise_duration_minutes?: number | null
          exercise_type?: string | null
          id?: string
          motivation_level?: number
          night_factors?: string[]
          rest_level?: number
          stress_level?: number
          study_plan_window?: string | null
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_wellbeing_checkins_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      evening_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          intended_sleep_time: string | null
          night_factor_alcohol: boolean
          night_factor_caffeine: boolean
          night_factor_screen: boolean
          night_factor_stress: boolean
          night_factor_unwell: boolean
          nightly_pss_score: number | null
          notes: string | null
          screen_time_before_bed_minutes: number | null
          university_id: string | null
          updated_at: string
          user_id: string
          wind_down_activity: string | null
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          id?: string
          intended_sleep_time?: string | null
          night_factor_alcohol?: boolean
          night_factor_caffeine?: boolean
          night_factor_screen?: boolean
          night_factor_stress?: boolean
          night_factor_unwell?: boolean
          nightly_pss_score?: number | null
          notes?: string | null
          screen_time_before_bed_minutes?: number | null
          university_id?: string | null
          updated_at?: string
          user_id: string
          wind_down_activity?: string | null
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          intended_sleep_time?: string | null
          night_factor_alcohol?: boolean
          night_factor_caffeine?: boolean
          night_factor_screen?: boolean
          night_factor_stress?: boolean
          night_factor_unwell?: boolean
          nightly_pss_score?: number | null
          notes?: string | null
          screen_time_before_bed_minutes?: number | null
          university_id?: string | null
          updated_at?: string
          user_id?: string
          wind_down_activity?: string | null
        }
        Relationships: []
      }
      exam_passes: {
        Row: {
          course_name: string
          created_at: string
          cum_laude: boolean
          grade: number | null
          id: string
          passed_at: string
          university_id: string | null
          user_id: string
          year: number
        }
        Insert: {
          course_name: string
          created_at?: string
          cum_laude?: boolean
          grade?: number | null
          id?: string
          passed_at?: string
          university_id?: string | null
          user_id: string
          year: number
        }
        Update: {
          course_name?: string
          created_at?: string
          cum_laude?: boolean
          grade?: number | null
          id?: string
          passed_at?: string
          university_id?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_passes_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
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
      ml_predictions: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          prediction_data: Json
          prediction_type: string
          university_id: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          prediction_data?: Json
          prediction_type: string
          university_id?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          prediction_data?: Json
          prediction_type?: string
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_courses: {
        Row: {
          course_name: string
          created_at: string
          id: string
          professor_id: string
          university_id: string
          year: number | null
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          professor_id: string
          university_id: string
          year?: number | null
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          professor_id?: string
          university_id?: string
          year?: number | null
        }
        Relationships: []
      }
      professor_invites: {
        Row: {
          courses: string[]
          created_at: string
          email: string
          id: string
          invited_by: string
          status: string
          university_id: string
          updated_at: string
        }
        Insert: {
          courses?: string[]
          created_at?: string
          email: string
          id?: string
          invited_by: string
          status?: string
          university_id: string
          updated_at?: string
        }
        Update: {
          courses?: string[]
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          status?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          healthkit_first_sync_at: string | null
          id: string
          matricola: string | null
          onboarded_at: string | null
          onboarding_completed: boolean
          trial_arm: string | null
          trial_consent_at: string | null
          trial_consent_version: string | null
          trial_status: string
          university: string | null
          university_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          healthkit_first_sync_at?: string | null
          id: string
          matricola?: string | null
          onboarded_at?: string | null
          onboarding_completed?: boolean
          trial_arm?: string | null
          trial_consent_at?: string | null
          trial_consent_version?: string | null
          trial_status?: string
          university?: string | null
          university_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          healthkit_first_sync_at?: string | null
          id?: string
          matricola?: string | null
          onboarded_at?: string | null
          onboarding_completed?: boolean
          trial_arm?: string | null
          trial_consent_at?: string | null
          trial_consent_version?: string | null
          trial_status?: string
          university?: string | null
          university_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
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
          university_id: string | null
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
          university_id?: string | null
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
          university_id?: string | null
          updated_at?: string
          user_id?: string
          weekly_study_hours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_personas_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      student_quizzes: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          quiz_key: string
          results: Json
          university_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          quiz_key: string
          results?: Json
          university_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          quiz_key?: string
          results?: Json
          university_id?: string | null
          updated_at?: string
          user_id?: string
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
          location: string | null
          location_other: string | null
          notes: string | null
          revision_priority: number | null
          stress_level: number
          studied_at: string
          study_method: string | null
          study_method_other: string | null
          subject: string
          teaching_readiness: number | null
          topic: string
          university_id: string | null
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
          location?: string | null
          location_other?: string | null
          notes?: string | null
          revision_priority?: number | null
          stress_level: number
          studied_at?: string
          study_method?: string | null
          study_method_other?: string | null
          subject: string
          teaching_readiness?: number | null
          topic: string
          university_id?: string | null
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
          location?: string | null
          location_other?: string | null
          notes?: string | null
          revision_priority?: number | null
          stress_level?: number
          studied_at?: string
          study_method?: string | null
          study_method_other?: string | null
          subject?: string
          teaching_readiness?: number | null
          topic?: string
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
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
          university_id: string | null
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
          university_id?: string | null
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
          university_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_schedule_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          active_duration_seconds: number
          background_away_count: number
          background_away_seconds: number
          comprehension: number | null
          confidence: number | null
          created_at: string
          difficulty: number | null
          id: string
          location: string
          location_other: string | null
          pause_count: number
          pause_log: Json
          pause_rate: number | null
          planned_duration_minutes: number | null
          post_session_completed: boolean
          revision_priority: number | null
          session_end_at: string | null
          session_start_at: string
          status: string
          study_method: string
          study_method_other: string | null
          subject: string
          total_pause_duration_seconds: number
          university_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_duration_seconds?: number
          background_away_count?: number
          background_away_seconds?: number
          comprehension?: number | null
          confidence?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          location: string
          location_other?: string | null
          pause_count?: number
          pause_log?: Json
          pause_rate?: number | null
          planned_duration_minutes?: number | null
          post_session_completed?: boolean
          revision_priority?: number | null
          session_end_at?: string | null
          session_start_at: string
          status?: string
          study_method: string
          study_method_other?: string | null
          subject: string
          total_pause_duration_seconds?: number
          university_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_duration_seconds?: number
          background_away_count?: number
          background_away_seconds?: number
          comprehension?: number | null
          confidence?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          location?: string
          location_other?: string | null
          pause_count?: number
          pause_log?: Json
          pause_rate?: number | null
          planned_duration_minutes?: number | null
          post_session_completed?: boolean
          revision_priority?: number | null
          session_end_at?: string | null
          session_start_at?: string
          status?: string
          study_method?: string
          study_method_other?: string | null
          subject?: string
          total_pause_duration_seconds?: number
          university_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          created_at: string
          id: string
          responses: Json
          survey_type: string
          university_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          responses?: Json
          survey_type: string
          university_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          responses?: Json
          survey_type?: string
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_mastery: {
        Row: {
          course_name: string
          created_at: string
          id: string
          status: string
          topic_name: string
          university_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          status?: string
          topic_name: string
          university_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          status?: string
          topic_name?: string
          university_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_mastery_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      university_academic_calendar: {
        Row: {
          created_at: string
          end_date: string
          event_name: string
          event_type: string
          id: string
          start_date: string
          university_id: string
          year_group: number | null
        }
        Insert: {
          created_at?: string
          end_date: string
          event_name: string
          event_type: string
          id?: string
          start_date: string
          university_id: string
          year_group?: number | null
        }
        Update: {
          created_at?: string
          end_date?: string
          event_name?: string
          event_type?: string
          id?: string
          start_date?: string
          university_id?: string
          year_group?: number | null
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
      university_login_keys: {
        Row: {
          created_at: string
          id: string
          login_key: string
          user_id: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_key: string
          user_id: string
          valid_from?: string
          valid_until?: string
        }
        Update: {
          created_at?: string
          id?: string
          login_key?: string
          user_id?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      university_onboarding_progress: {
        Row: {
          admin_user_id: string
          calendar_data: Json
          created_at: string
          id: string
          programme_data: Json
          retention_acknowledged: boolean
          step_completed: number
          university_id: string
          updated_at: string
          welfare_data: Json
        }
        Insert: {
          admin_user_id: string
          calendar_data?: Json
          created_at?: string
          id?: string
          programme_data?: Json
          retention_acknowledged?: boolean
          step_completed?: number
          university_id: string
          updated_at?: string
          welfare_data?: Json
        }
        Update: {
          admin_user_id?: string
          calendar_data?: Json
          created_at?: string
          id?: string
          programme_data?: Json
          retention_acknowledged?: boolean
          step_completed?: number
          university_id?: string
          updated_at?: string
          welfare_data?: Json
        }
        Relationships: []
      }
      university_syllabi: {
        Row: {
          course_name: string
          created_at: string
          credits: number | null
          id: string
          is_blocking_exam: boolean
          notes: string | null
          pdf_path: string | null
          semester: number | null
          status: string
          topics: Json
          university_id: string | null
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
          is_blocking_exam?: boolean
          notes?: string | null
          pdf_path?: string | null
          semester?: number | null
          status?: string
          topics?: Json
          university_id?: string | null
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
          is_blocking_exam?: boolean
          notes?: string | null
          pdf_path?: string | null
          semester?: number | null
          status?: string
          topics?: Json
          university_id?: string | null
          university_name?: string
          updated_at?: string
          uploaded_by?: string
          year?: number
        }
        Relationships: []
      }
      university_welfare_config: {
        Row: {
          burnout_alert_threshold_pct: number
          created_at: string
          crisis_line: string | null
          data_retention_months: number | null
          id: string
          legal_basis: string | null
          support_email: string | null
          support_url: string | null
          university_id: string
          updated_at: string
        }
        Insert: {
          burnout_alert_threshold_pct?: number
          created_at?: string
          crisis_line?: string | null
          data_retention_months?: number | null
          id?: string
          legal_basis?: string | null
          support_email?: string | null
          support_url?: string | null
          university_id: string
          updated_at?: string
        }
        Update: {
          burnout_alert_threshold_pct?: number
          created_at?: string
          crisis_line?: string | null
          data_retention_months?: number | null
          id?: string
          legal_basis?: string | null
          support_email?: string | null
          support_url?: string | null
          university_id?: string
          updated_at?: string
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
          university_id: string | null
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          feedback_type: string
          id?: string
          reason?: string | null
          university_id?: string | null
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          feedback_type?: string
          id?: string
          reason?: string | null
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
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
          university_id: string | null
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
          university_id?: string | null
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
          university_id?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_goals_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
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
      generate_login_key_for_user: {
        Args: { _user_id: string }
        Returns: string
      }
      generate_student_access_code: {
        Args: {
          _created_by: string
          _label?: string
          _university_id: string
          _university_name: string
        }
        Returns: string
      }
      get_user_university_id: { Args: { _user_id: string }; Returns: string }
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
      lookup_email_by_login_key: {
        Args: { _login_key: string }
        Returns: string
      }
      professor_teaches: {
        Args: { _course_name: string; _university_id: string; _user_id: string }
        Returns: boolean
      }
      redeem_cohort_code: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
      rotate_all_login_keys: { Args: never; Returns: undefined }
      validate_cohort_code: {
        Args: { _code: string }
        Returns: {
          label: string
          university_name: string
          valid: boolean
          year: number
        }[]
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
      app_role:
        | "admin"
        | "user"
        | "university_admin"
        | "support_team"
        | "professor"
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
      app_role: [
        "admin",
        "user",
        "university_admin",
        "support_team",
        "professor",
      ],
    },
  },
} as const
