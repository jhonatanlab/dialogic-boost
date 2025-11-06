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
      campaign_contacts: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string
          id: string
          message: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      checkin_links: {
        Row: {
          created_at: string
          id: string
          name: string
          url_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          url_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          url_token?: string
          user_id?: string
        }
        Relationships: []
      }
      checkin_records: {
        Row: {
          checkin_link_id: string
          contact_id: string | null
          fidelity_progress: number
          id: string
          status: string
          timestamp: string
          token: string | null
          user_id: string
          whatsapp_user: string | null
        }
        Insert: {
          checkin_link_id: string
          contact_id?: string | null
          fidelity_progress?: number
          id?: string
          status?: string
          timestamp?: string
          token?: string | null
          user_id: string
          whatsapp_user?: string | null
        }
        Update: {
          checkin_link_id?: string
          contact_id?: string | null
          fidelity_progress?: number
          id?: string
          status?: string
          timestamp?: string
          token?: string | null
          user_id?: string
          whatsapp_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_records_checkin_link_id_fkey"
            columns: ["checkin_link_id"]
            isOneToOne: false
            referencedRelation: "checkin_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_records_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_custom_fields: {
        Row: {
          contact_id: string
          created_at: string
          custom_field_id: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          custom_field_id: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          custom_field_id?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_custom_fields_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_custom_fields_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          instagram: string | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      fidelity_cards: {
        Row: {
          contact_id: string
          created_at: string
          current_stamps: number
          fidelity_program_id: string
          id: string
          last_checkin_id: string | null
          status: string
          target_stamps: number
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          current_stamps?: number
          fidelity_program_id: string
          id?: string
          last_checkin_id?: string | null
          status?: string
          target_stamps: number
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          current_stamps?: number
          fidelity_program_id?: string
          id?: string
          last_checkin_id?: string | null
          status?: string
          target_stamps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fidelity_cards_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fidelity_cards_fidelity_program_id_fkey"
            columns: ["fidelity_program_id"]
            isOneToOne: false
            referencedRelation: "fidelity_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fidelity_cards_last_checkin_id_fkey"
            columns: ["last_checkin_id"]
            isOneToOne: false
            referencedRelation: "checkin_records"
            referencedColumns: ["id"]
          },
        ]
      }
      fidelity_programs: {
        Row: {
          congratulations_message: string
          created_at: string
          goal: number
          id: string
          is_active: boolean
          name: string
          reward: string
          updated_at: string
          user_id: string
        }
        Insert: {
          congratulations_message: string
          created_at?: string
          goal?: number
          id?: string
          is_active?: boolean
          name: string
          reward: string
          updated_at?: string
          user_id: string
        }
        Update: {
          congratulations_message?: string
          created_at?: string
          goal?: number
          id?: string
          is_active?: boolean
          name?: string
          reward?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      incoming_messages: {
        Row: {
          created_at: string
          from_phone: string
          id: string
          message_text: string | null
          message_type: string | null
          provider: string
          raw_data: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          from_phone: string
          id?: string
          message_text?: string | null
          message_type?: string | null
          provider: string
          raw_data?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          from_phone?: string
          id?: string
          message_text?: string | null
          message_type?: string | null
          provider?: string
          raw_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          attachment_url: string | null
          category: string | null
          created_at: string
          id: string
          message: string
          name: string
          preview: string | null
          quick_replies: Json | null
          type: string
          updated_at: string
          user_id: string
          variables_used: string[] | null
        }
        Insert: {
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message: string
          name: string
          preview?: string | null
          quick_replies?: Json | null
          type?: string
          updated_at?: string
          user_id: string
          variables_used?: string[] | null
        }
        Update: {
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          name?: string
          preview?: string | null
          quick_replies?: Json | null
          type?: string
          updated_at?: string
          user_id?: string
          variables_used?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          channel: string
          contact_id: string
          content: string
          conversation_id: string
          created_at: string
          direction: string
          external_id: string | null
          id: string
          message_type: string
          metadata: Json | null
          status: string
          user_id: string
        }
        Insert: {
          channel?: string
          contact_id: string
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          external_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          contact_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          external_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          created_at: string
          id: string
          name: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_integrations: {
        Row: {
          access_token: string | null
          api_token: string | null
          business_id: string | null
          created_at: string
          id: string
          instance_id: string | null
          phone_number_id: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          api_token?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          phone_number_id?: string | null
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          api_token?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          phone_number_id?: string | null
          provider?: string
          status?: string
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
