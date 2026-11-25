export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type MaterialCategory =
  | "pdf"
  | "slides"
  | "photo"
  | "image"
  | "book"
  | "article"
  | "summary"
  | "mind_map"
  | "document"
  | "reference"
  | "other";

export type AtlasSearchKind =
  | "note"
  | "lesson"
  | "course"
  | "material"
  | "task"
  | "assignment"
  | "exam"
  | "event"
  | "skill"
  | "study"
  | "finance";

type BaseRow = {
  id: string;
  user_id: string;
  created_at: string;
};

type BaseOwnedRow = BaseRow & {
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        {
          id: string;
          full_name: string;
          university_name: string | null;
          department: string | null;
          academic_year: string | null;
          avatar_path: string | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          full_name?: string;
          university_name?: string | null;
          department?: string | null;
          academic_year?: string | null;
          avatar_path?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      user_preferences: TableDefinition<
        {
          user_id: string;
          currency_code: string;
          time_zone: string;
          date_format: string;
          week_starts_on: number;
          daily_study_goal_minutes: number;
          weekly_study_goal_minutes: number;
          theme: Database["public"]["Enums"]["app_theme"];
          assignment_reminders: boolean;
          task_reminders: boolean;
          habit_reminders: boolean;
          budget_alerts: boolean;
          study_goal_alerts: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          user_id: string;
          currency_code?: string;
          time_zone?: string;
          date_format?: string;
          week_starts_on?: number;
          daily_study_goal_minutes?: number;
          weekly_study_goal_minutes?: number;
          theme?: Database["public"]["Enums"]["app_theme"];
          assignment_reminders?: boolean;
          task_reminders?: boolean;
          habit_reminders?: boolean;
          budget_alerts?: boolean;
          study_goal_alerts?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      courses: TableDefinition<
        BaseOwnedRow & {
          course_code: string;
          course_name: string;
          instructor_name: string | null;
          semester: string | null;
          credit_hours: number | null;
          color: string;
          target_grade: string | null;
          current_grade: string | null;
          archived: boolean;
          sort_order: number;
          semester_id: string | null;
          description: string | null;
          references_text: string | null;
          difficulties: string | null;
          review_topics: string | null;
        },
        {
          id?: string;
          user_id: string;
          course_code: string;
          course_name: string;
          instructor_name?: string | null;
          semester?: string | null;
          credit_hours?: number | null;
          color?: string;
          target_grade?: string | null;
          current_grade?: string | null;
          archived?: boolean;
          sort_order?: number;
          semester_id?: string | null;
          description?: string | null;
          references_text?: string | null;
          difficulties?: string | null;
          review_topics?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      assignments: TableDefinition<
        BaseOwnedRow & {
          course_id: string | null;
          title: string;
          description: string | null;
          assignment_type: Database["public"]["Enums"]["assignment_type"];
          assigned_date: string | null;
          due_date: string;
          due_time: string | null;
          total_marks: number | null;
          obtained_marks: number | null;
          submission_status: Database["public"]["Enums"]["assignment_status"];
          priority: Database["public"]["Enums"]["priority_level"];
          progress_percentage: number;
          submission_link: string | null;
          attachment_path: string | null;
          reminder_at: string | null;
          completed_at: string | null;
        },
        {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          description?: string | null;
          assignment_type?: Database["public"]["Enums"]["assignment_type"];
          assigned_date?: string | null;
          due_date: string;
          due_time?: string | null;
          total_marks?: number | null;
          obtained_marks?: number | null;
          submission_status?: Database["public"]["Enums"]["assignment_status"];
          priority?: Database["public"]["Enums"]["priority_level"];
          progress_percentage?: number;
          submission_link?: string | null;
          attachment_path?: string | null;
          reminder_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      tasks: TableDefinition<
        BaseOwnedRow & {
          title: string;
          description: string | null;
          category: Database["public"]["Enums"]["task_category"];
          priority: Database["public"]["Enums"]["priority_level"];
          status: Database["public"]["Enums"]["task_status"];
          due_date: string | null;
          due_time: string | null;
          estimated_minutes: number | null;
          actual_minutes: number | null;
          course_id: string | null;
          assignment_id: string | null;
          recurrence_rule: Json | null;
          recurrence_time_zone: string | null;
          is_recurring_template: boolean;
          parent_task_id: string | null;
          reminder_at: string | null;
          completed_at: string | null;
        },
        {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: Database["public"]["Enums"]["task_category"];
          priority?: Database["public"]["Enums"]["priority_level"];
          status?: Database["public"]["Enums"]["task_status"];
          due_date?: string | null;
          due_time?: string | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          course_id?: string | null;
          assignment_id?: string | null;
          recurrence_rule?: Json | null;
          recurrence_time_zone?: string | null;
          is_recurring_template?: boolean;
          parent_task_id?: string | null;
          reminder_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      task_subtasks: TableDefinition<
        BaseOwnedRow & {
          task_id: string;
          title: string;
          completed: boolean;
          completed_at: string | null;
          sort_order: number;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          title: string;
          completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      task_occurrences: TableDefinition<
        BaseOwnedRow & {
          task_id: string;
          scheduled_date: string;
          scheduled_time: string | null;
          status: Database["public"]["Enums"]["task_status"];
          completed_at: string | null;
          override_title: string | null;
          override_due_at: string | null;
        },
        {
          id?: string;
          user_id: string;
          task_id: string;
          scheduled_date: string;
          scheduled_time?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          completed_at?: string | null;
          override_title?: string | null;
          override_due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      assignment_subtasks: TableDefinition<
        BaseOwnedRow & {
          assignment_id: string;
          title: string;
          completed: boolean;
          completed_at: string | null;
          sort_order: number;
        },
        {
          id?: string;
          user_id: string;
          assignment_id: string;
          title: string;
          completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      calendar_events: TableDefinition<
        BaseOwnedRow & {
          title: string;
          description: string | null;
          start_at: string;
          end_at: string;
          all_day: boolean;
          event_type: Database["public"]["Enums"]["calendar_event_type"];
          course_id: string | null;
          location: string | null;
          meeting_url: string | null;
          reminder_at: string | null;
          repeat_rule: Json | null;
          source: string | null;
        },
        {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          start_at: string;
          end_at: string;
          all_day?: boolean;
          event_type?: Database["public"]["Enums"]["calendar_event_type"];
          course_id?: string | null;
          location?: string | null;
          meeting_url?: string | null;
          reminder_at?: string | null;
          repeat_rule?: Json | null;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      syllabus_units: TableDefinition<
        BaseOwnedRow & {
          course_id: string;
          title: string;
          description: string | null;
          sort_order: number;
          estimated_hours: number | null;
          completed_hours: number;
          status: Database["public"]["Enums"]["syllabus_status"];
          completion_percentage: number;
        },
        {
          id?: string;
          user_id: string;
          course_id: string;
          title: string;
          description?: string | null;
          sort_order?: number;
          estimated_hours?: number | null;
          completed_hours?: number;
          status?: Database["public"]["Enums"]["syllabus_status"];
          completion_percentage?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      syllabus_topics: TableDefinition<
        BaseOwnedRow & {
          syllabus_unit_id: string;
          title: string;
          notes: string | null;
          estimated_minutes: number | null;
          completed: boolean;
          completed_at: string | null;
          sort_order: number;
        },
        {
          id?: string;
          user_id: string;
          syllabus_unit_id: string;
          title: string;
          notes?: string | null;
          estimated_minutes?: number | null;
          completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      syllabus_progress_snapshots: TableDefinition<
        BaseRow & {
          course_id: string;
          snapshot_date: string;
          completion_percentage: number;
        },
        {
          id?: string;
          user_id: string;
          course_id: string;
          snapshot_date?: string;
          completion_percentage: number;
          created_at?: string;
        }
      >;
      skills: TableDefinition<
        BaseOwnedRow & {
          title: string;
          category: string | null;
          description: string | null;
          motivation: string | null;
          current_level: Database["public"]["Enums"]["skill_level"];
          target_level: Database["public"]["Enums"]["skill_level"];
          status: Database["public"]["Enums"]["skill_status"];
          target_date: string | null;
          weekly_target_minutes: number;
          progress_percentage: number;
          next_action: string | null;
        },
        {
          id?: string;
          user_id: string;
          title: string;
          category?: string | null;
          description?: string | null;
          motivation?: string | null;
          current_level?: Database["public"]["Enums"]["skill_level"];
          target_level?: Database["public"]["Enums"]["skill_level"];
          status?: Database["public"]["Enums"]["skill_status"];
          target_date?: string | null;
          weekly_target_minutes?: number;
          progress_percentage?: number;
          next_action?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      skill_milestones: TableDefinition<
        BaseOwnedRow & {
          skill_id: string;
          title: string;
          description: string | null;
          target_date: string | null;
          completed: boolean;
          completed_at: string | null;
          sort_order: number;
        },
        {
          id?: string;
          user_id: string;
          skill_id: string;
          title: string;
          description?: string | null;
          target_date?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      skill_resources: TableDefinition<
        BaseOwnedRow & {
          skill_id: string;
          title: string;
          resource_type: Database["public"]["Enums"]["resource_type"];
          url: string | null;
          notes: string | null;
          completed: boolean;
        },
        {
          id?: string;
          user_id: string;
          skill_id: string;
          title: string;
          resource_type?: Database["public"]["Enums"]["resource_type"];
          url?: string | null;
          notes?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      study_sessions: TableDefinition<
        BaseOwnedRow & {
          course_id: string | null;
          task_id: string | null;
          skill_id: string | null;
          session_type: Database["public"]["Enums"]["study_session_type"];
          status: Database["public"]["Enums"]["study_session_status"];
          title: string;
          started_at: string;
          last_resumed_at: string | null;
          paused_at: string | null;
          ended_at: string | null;
          accumulated_seconds: number;
          duration_minutes: number;
          focus_rating: number | null;
          notes: string | null;
        },
        {
          id?: string;
          user_id: string;
          course_id?: string | null;
          task_id?: string | null;
          skill_id?: string | null;
          session_type?: Database["public"]["Enums"]["study_session_type"];
          status?: Database["public"]["Enums"]["study_session_status"];
          title: string;
          started_at: string;
          last_resumed_at?: string | null;
          paused_at?: string | null;
          ended_at?: string | null;
          accumulated_seconds?: number;
          duration_minutes?: number;
          focus_rating?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      reading_items: TableDefinition<
        BaseOwnedRow & {
          title: string;
          author: string | null;
          total_pages: number;
          current_page: number;
          start_date: string | null;
          target_completion_date: string | null;
          status: Database["public"]["Enums"]["reading_status"];
          reading_minutes: number;
          notes: string | null;
          cover_path: string | null;
        },
        {
          id?: string;
          user_id: string;
          title: string;
          author?: string | null;
          total_pages: number;
          current_page?: number;
          start_date?: string | null;
          target_completion_date?: string | null;
          status?: Database["public"]["Enums"]["reading_status"];
          reading_minutes?: number;
          notes?: string | null;
          cover_path?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      reading_logs: TableDefinition<
        BaseRow & {
          reading_item_id: string;
          logged_at: string;
          pages_read: number;
          minutes_read: number;
          start_page: number | null;
          end_page: number | null;
          notes: string | null;
        },
        {
          id?: string;
          user_id: string;
          reading_item_id: string;
          logged_at?: string;
          pages_read?: number;
          minutes_read?: number;
          start_page?: number | null;
          end_page?: number | null;
          notes?: string | null;
          created_at?: string;
        }
      >;
      transactions: TableDefinition<
        BaseOwnedRow & {
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          category: string;
          amount: number;
          currency: string;
          transaction_date: string;
          description: string | null;
          payment_method: string | null;
          recurring: boolean;
          receipt_path: string | null;
        },
        {
          id?: string;
          user_id: string;
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          category: string;
          amount: number;
          currency?: string;
          transaction_date?: string;
          description?: string | null;
          payment_method?: string | null;
          recurring?: boolean;
          receipt_path?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      budgets: TableDefinition<
        BaseOwnedRow & {
          budget_month: string;
          category: string | null;
          amount: number;
          currency: string;
          alert_threshold_percent: number;
        },
        {
          id?: string;
          user_id: string;
          budget_month: string;
          category?: string | null;
          amount: number;
          currency?: string;
          alert_threshold_percent?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      habits: TableDefinition<
        BaseOwnedRow & {
          title: string;
          description: string | null;
          category: string | null;
          frequency_type: Database["public"]["Enums"]["habit_frequency"];
          selected_weekdays: number[];
          target_value: number;
          target_unit: string;
          reminder_time: string | null;
          start_date: string;
          archived: boolean;
        },
        {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          frequency_type?: Database["public"]["Enums"]["habit_frequency"];
          selected_weekdays?: number[];
          target_value?: number;
          target_unit?: string;
          reminder_time?: string | null;
          start_date?: string;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      habit_completions: TableDefinition<
        BaseOwnedRow & {
          habit_id: string;
          completion_date: string;
          completed_value: number;
          completed: boolean;
          notes: string | null;
        },
        {
          id?: string;
          user_id: string;
          habit_id: string;
          completion_date: string;
          completed_value?: number;
          completed?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      notes: TableDefinition<
        BaseOwnedRow & {
          course_id: string | null;
          title: string;
          content: string;
          plain_text_preview: string;
          tags: string[];
          favorite: boolean;
          pinned: boolean;
          lesson_id: string | null;
          content_format: "plain" | "html";
          plain_text: string;
          key_points: string | null;
          memorize: string | null;
          doubts: string | null;
          professor_remarks: string | null;
          references_text: string | null;
        },
        {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          content?: string;
          plain_text_preview?: string;
          tags?: string[];
          favorite?: boolean;
          pinned?: boolean;
          lesson_id?: string | null;
          content_format?: "plain" | "html";
          plain_text?: string;
          key_points?: string | null;
          memorize?: string | null;
          doubts?: string | null;
          professor_remarks?: string | null;
          references_text?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      lessons: TableDefinition<
        BaseOwnedRow & {
          course_id: string | null;
          lesson_date: string;
          title: string;
          topic: string | null;
          unit: string | null;
          professor: string | null;
          summary: string | null;
        },
        {
          id?: string;
          user_id: string;
          course_id?: string | null;
          lesson_date: string;
          title: string;
          topic?: string | null;
          unit?: string | null;
          professor?: string | null;
          summary?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      materials: TableDefinition<
        BaseOwnedRow & {
          course_id: string | null;
          lesson_id: string | null;
          note_id: string | null;
          title: string;
          category: MaterialCategory;
          description: string | null;
          storage_path: string | null;
          file_name: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          external_url: string | null;
          tags: string[];
          exam_id: string | null;
        },
        {
          id?: string;
          user_id: string;
          course_id?: string | null;
          lesson_id?: string | null;
          note_id?: string | null;
          title: string;
          category?: MaterialCategory;
          description?: string | null;
          storage_path?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          external_url?: string | null;
          tags?: string[];
          exam_id?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      notifications: TableDefinition<
        BaseOwnedRow & {
          type: string;
          title: string;
          message: string;
          link: string | null;
          read: boolean;
          source_key: string | null;
        },
        {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          link?: string | null;
          read?: boolean;
          source_key?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      class_timetable_entries: TableDefinition<
        BaseOwnedRow & {
          course_id: string | null;
          title: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          location: string | null;
          instructor_name: string | null;
          notes: string | null;
          active: boolean;
        },
        {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          location?: string | null;
          instructor_name?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      exam_schedules: TableDefinition<
        BaseOwnedRow & {
          course_id: string | null;
          title: string;
          exam_type: string;
          exam_date: string;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          seat_info: string | null;
          notes: string | null;
        },
        {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          exam_type?: string;
          exam_date: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          seat_info?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      academic_semesters: TableDefinition<
        BaseOwnedRow & {
          semester_name: string;
          academic_year: string | null;
          gpa: number | null;
          total_credits: number;
          notes: string | null;
          sort_order: number;
          start_date: string | null;
          end_date: string | null;
          is_current: boolean;
          institution: string | null;
        },
        {
          id?: string;
          user_id: string;
          semester_name: string;
          academic_year?: string | null;
          gpa?: number | null;
          total_credits?: number;
          notes?: string | null;
          sort_order?: number;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          institution?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      activity_logs: TableDefinition<
        BaseRow & {
          activity_type: string;
          entity_type: string;
          entity_id: string | null;
          title: string;
          metadata: Json;
        },
        {
          id?: string;
          user_id: string;
          activity_type: string;
          entity_type: string;
          entity_id?: string | null;
          title: string;
          metadata?: Json;
          created_at?: string;
        }
      >;
    };
    Views: {
      course_progress: {
        Row: {
          course_id: string | null;
          user_id: string | null;
          course_code: string | null;
          course_name: string | null;
          topic_count: number | null;
          completed_topic_count: number | null;
          completion_percentage: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      atlas_search: {
        Args: { search_query: string; max_results?: number };
        Returns: {
          kind: AtlasSearchKind;
          id: string;
          title: string;
          snippet: string;
          occurred_on: string | null;
          course_id: string | null;
          parent_id: string | null;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      app_theme: "light" | "dark" | "system";
      task_category:
        | "study"
        | "assignment"
        | "personal"
        | "work"
        | "health"
        | "finance"
        | "other";
      priority_level: "low" | "medium" | "high" | "urgent";
      task_status: "todo" | "in_progress" | "completed" | "cancelled";
      assignment_type:
        | "homework"
        | "report"
        | "presentation"
        | "project"
        | "quiz"
        | "midterm"
        | "final_exam"
        | "lab"
        | "viva"
        | "other";
      assignment_status:
        | "not_started"
        | "in_progress"
        | "ready_to_submit"
        | "submitted"
        | "graded"
        | "missed";
      calendar_event_type:
        | "class"
        | "study_session"
        | "assignment"
        | "exam"
        | "meeting"
        | "personal_event"
        | "task"
        | "seminar"
        | "presentation"
        | "deadline"
        | "university_event"
        | "project_deadline"
        | "extracurricular"
        | "holiday";
      syllabus_status: "not_started" | "in_progress" | "completed";
      study_session_type:
        | "reading"
        | "revision"
        | "assignment"
        | "practice"
        | "lecture_review"
        | "skill_learning"
        | "other";
      study_session_status: "running" | "paused" | "completed" | "discarded";
      reading_status:
        | "want_to_read"
        | "currently_reading"
        | "completed"
        | "paused"
        | "abandoned";
      transaction_type: "expense" | "income";
      skill_status: "planned" | "learning" | "paused" | "completed";
      skill_level: "beginner" | "elementary" | "intermediate" | "advanced";
      resource_type:
        | "course"
        | "video"
        | "article"
        | "book"
        | "practice_project"
        | "documentation"
        | "other";
      habit_frequency: "daily" | "weekdays" | "weekly" | "custom";
    };
    CompositeTypes: Record<string, never>;
  };
};
