export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analyzed_files: {
        Row: {
          analysis_result: Json | null
          analysis_status: string | null
          content_type: string
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          size: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_result?: Json | null
          analysis_status?: string | null
          content_type: string
          created_at?: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          size: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_result?: Json | null
          analysis_status?: string | null
          content_type?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          size?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_states: {
        Row: {
          active_roles: string[] | null
          created_at: string
          current_state: Database["public"]["Enums"]["conversation_state"]
          id: string
          metadata: Json | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          active_roles?: string[] | null
          created_at?: string
          current_state?: Database["public"]["Enums"]["conversation_state"]
          id?: string
          metadata?: Json | null
          thread_id: string
          updated_at?: string
        }
        Update: {
          active_roles?: string[] | null
          created_at?: string
          current_state?: Database["public"]["Enums"]["conversation_state"]
          id?: string
          metadata?: Json | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_states_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          experience_rating: Database["public"]["Enums"]["experience_rating"]
          favorite_features: string | null
          has_bugs: boolean | null
          id: string
          improvement_suggestions: string | null
          interested_in_subscription: boolean | null
          user_id: string | null
          would_recommend: boolean | null
        }
        Insert: {
          created_at?: string
          experience_rating: Database["public"]["Enums"]["experience_rating"]
          favorite_features?: string | null
          has_bugs?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          interested_in_subscription?: boolean | null
          user_id?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          created_at?: string
          experience_rating?: Database["public"]["Enums"]["experience_rating"]
          favorite_features?: string | null
          has_bugs?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          interested_in_subscription?: boolean | null
          user_id?: string | null
          would_recommend?: boolean | null
        }
        Relationships: []
      }
      free_tier_limits: {
        Row: {
          created_at: string
          id: string
          max_messages_per_thread: number
          max_roles: number
          max_threads: number
          message_limit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_messages_per_thread?: number
          max_roles?: number
          max_threads?: number
          message_limit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_messages_per_thread?: number
          max_roles?: number
          max_threads?: number
          message_limit?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chain_id: string | null
          chain_order: number | null
          content: string
          created_at: string
          id: string
          message_type: Database["public"]["Enums"]["message_type"] | null
          metadata: Json | null
          reply_to_message_id: string | null
          response_order: number | null
          role_id: string | null
          search_vector: unknown | null
          tagged_role_id: string | null
          thread_id: string
        }
        Insert: {
          chain_id?: string | null
          chain_order?: number | null
          content: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          metadata?: Json | null
          reply_to_message_id?: string | null
          response_order?: number | null
          role_id?: string | null
          search_vector?: unknown | null
          tagged_role_id?: string | null
          thread_id: string
        }
        Update: {
          chain_id?: string | null
          chain_order?: number | null
          content?: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          metadata?: Json | null
          reply_to_message_id?: string | null
          response_order?: number | null
          role_id?: string | null
          search_vector?: unknown | null
          tagged_role_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tagged_role_id_fkey"
            columns: ["tagged_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_memory: {
        Row: {
          content: string
          context_type: string
          created_at: string
          id: string
          role_id: string | null
          thread_id: string | null
        }
        Insert: {
          content: string
          context_type: string
          created_at?: string
          id?: string
          role_id?: string | null
          thread_id?: string | null
        }
        Update: {
          content?: string
          context_type?: string
          created_at?: string
          id?: string
          role_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_memory_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_memory_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      role_interactions: {
        Row: {
          conversation_depth: number | null
          created_at: string
          id: string
          initiator_role_id: string
          interaction_context: Json | null
          interaction_type: string
          metadata: Json | null
          parent_interaction_id: string | null
          relevance_score: number | null
          responder_role_id: string
          thread_id: string
        }
        Insert: {
          conversation_depth?: number | null
          created_at?: string
          id?: string
          initiator_role_id: string
          interaction_context?: Json | null
          interaction_type: string
          metadata?: Json | null
          parent_interaction_id?: string | null
          relevance_score?: number | null
          responder_role_id: string
          thread_id: string
        }
        Update: {
          conversation_depth?: number | null
          created_at?: string
          id?: string
          initiator_role_id?: string
          interaction_context?: Json | null
          interaction_type?: string
          metadata?: Json | null
          parent_interaction_id?: string | null
          relevance_score?: number | null
          responder_role_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_interactions_initiator_role_id_fkey"
            columns: ["initiator_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_interactions_parent_interaction_id_fkey"
            columns: ["parent_interaction_id"]
            isOneToOne: false
            referencedRelation: "role_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_interactions_responder_role_id_fkey"
            columns: ["responder_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_interactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      role_memories: {
        Row: {
          access_count: number | null
          confidence_score: number | null
          content: string
          context_chain: Json | null
          context_relevance: number | null
          context_source: string | null
          context_type: string
          contradiction_check_status: string | null
          contradiction_references: Json | null
          created_at: string
          embedding: string | null
          id: string
          importance_score: number | null
          interaction_id: string | null
          last_accessed: string | null
          last_reinforced: string | null
          last_retrieved: string | null
          last_verified: string | null
          memory_category: string | null
          memory_type: string | null
          metadata: Json | null
          reinforcement_count: number | null
          relevance_score: number | null
          retrieval_count: number | null
          role_id: string | null
          source_type: string | null
          topic_vector: string | null
          verification_score: number | null
          verification_status: string | null
        }
        Insert: {
          access_count?: number | null
          confidence_score?: number | null
          content: string
          context_chain?: Json | null
          context_relevance?: number | null
          context_source?: string | null
          context_type: string
          contradiction_check_status?: string | null
          contradiction_references?: Json | null
          created_at?: string
          embedding?: string | null
          id?: string
          importance_score?: number | null
          interaction_id?: string | null
          last_accessed?: string | null
          last_reinforced?: string | null
          last_retrieved?: string | null
          last_verified?: string | null
          memory_category?: string | null
          memory_type?: string | null
          metadata?: Json | null
          reinforcement_count?: number | null
          relevance_score?: number | null
          retrieval_count?: number | null
          role_id?: string | null
          source_type?: string | null
          topic_vector?: string | null
          verification_score?: number | null
          verification_status?: string | null
        }
        Update: {
          access_count?: number | null
          confidence_score?: number | null
          content?: string
          context_chain?: Json | null
          context_relevance?: number | null
          context_source?: string | null
          context_type?: string
          contradiction_check_status?: string | null
          contradiction_references?: Json | null
          created_at?: string
          embedding?: string | null
          id?: string
          importance_score?: number | null
          interaction_id?: string | null
          last_accessed?: string | null
          last_reinforced?: string | null
          last_retrieved?: string | null
          last_verified?: string | null
          memory_category?: string | null
          memory_type?: string | null
          metadata?: Json | null
          reinforcement_count?: number | null
          relevance_score?: number | null
          retrieval_count?: number | null
          role_id?: string | null
          source_type?: string | null
          topic_vector?: string | null
          verification_score?: number | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_memories_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "role_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_memories_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          alias: string | null
          created_at: string
          description: string | null
          id: string
          instructions: string
          is_template: boolean | null
          model: string
          name: string
          package_name: string | null
          package_order: number | null
          source: string
          special_capabilities: string[] | null
          tag: string
          template_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alias?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructions: string
          is_template?: boolean | null
          model?: string
          name: string
          package_name?: string | null
          package_order?: number | null
          source?: string
          special_capabilities?: string[] | null
          tag?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alias?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string
          is_template?: boolean | null
          model?: string
          name?: string
          package_name?: string | null
          package_order?: number | null
          source?: string
          special_capabilities?: string[] | null
          tag?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          is_active: boolean
          plan_type: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_started: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          plan_type: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_started?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_started?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thread_roles: {
        Row: {
          created_at: string
          role_id: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          thread_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_roles_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          id: string
          last_opened: string | null
          message_count: number | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_opened?: string | null
          message_count?: number | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_opened?: string | null
          message_count?: number | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      calculate_text_similarity: {
        Args: {
          text1: string
          text2: string
        }
        Returns: number
      }
      can_create_message: {
        Args: {
          thread_id: string
        }
        Returns: boolean
      }
      can_create_role: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      can_create_thread: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      consolidate_role_memories: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      count_user_roles: {
        Args: {
          user_id: string
        }
        Returns: number
      }
      get_conversation_chain: {
        Args: {
          p_thread_id: string
          p_tagged_role_id?: string
        }
        Returns: {
          role_id: string
          chain_order: number
        }[]
      }
      get_conversation_depth: {
        Args: {
          p_thread_id: string
          p_role_id: string
        }
        Returns: number
      }
      get_next_responding_role: {
        Args: {
          thread_id: string
          current_order: number
        }
        Returns: string
      }
      get_similar_memories: {
        Args: {
          p_embedding: string
          p_match_threshold: number
          p_match_count: number
          p_role_id: string
        }
        Returns: {
          id: string
          content: string
          similarity: number
        }[]
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
    }
    Enums: {
      conversation_state:
        | "initial_analysis"
        | "role_selection"
        | "response_generation"
        | "chain_processing"
        | "completion"
      experience_rating:
        | "excellent"
        | "good"
        | "average"
        | "poor"
        | "needs_improvement"
      message_type: "text" | "file" | "analysis"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
