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
      activity_logs: {
        Row: {
          action: string
          company_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_online: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_online?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_online?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_control: {
        Row: {
          company_id: string
          status: string | null
          telefone: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          status?: string | null
          telefone: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          status?: string | null
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      automations: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          execution_count: number
          flow_data: Json
          id: string
          keyword: string | null
          last_execution: string | null
          name: string
          status: string
          trigger_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          execution_count?: number
          flow_data?: Json
          id?: string
          keyword?: string | null
          last_execution?: string | null
          name?: string
          status?: string
          trigger_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          execution_count?: number
          flow_data?: Json
          id?: string
          keyword?: string | null
          last_execution?: string | null
          name?: string
          status?: string
          trigger_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          company_id: string | null
          contact_id: string
          created_at: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          company_id?: string | null
          contact_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          company_id?: string | null
          contact_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          attachment_url: string | null
          company_id: string | null
          created_at: string
          id: string
          media_type: string | null
          message: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          media_type?: string | null
          message: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          media_type?: string | null
          message?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          company_id: string
          created_at: string
          distribution_mode: string
          id: string
          max_conversations_per_agent: number | null
          only_assign_online_agents: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          distribution_mode?: string
          id?: string
          max_conversations_per_agent?: number | null
          only_assign_online_agents?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          distribution_mode?: string
          id?: string
          max_conversations_per_agent?: number | null
          only_assign_online_agents?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      checkin_links: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
          url_token: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          url_token: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          url_token?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_records: {
        Row: {
          checkin_link_id: string
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "checkin_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      companies: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          plan: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          plan?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_custom_fields: {
        Row: {
          company_id: string | null
          contact_id: string
          created_at: string
          custom_field_id: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          company_id?: string | null
          contact_id: string
          created_at?: string
          custom_field_id: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string
          created_at?: string
          custom_field_id?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_custom_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          contact_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          contact_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          contact_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          company_id?: string | null
          contact_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          birthday: string | null
          company_id: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          id: string
          instagram: string | null
          name: string
          phone: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          company_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          id?: string
          instagram?: string | null
          name: string
          phone?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          company_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          id?: string
          instagram?: string | null
          name?: string
          phone?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_events: {
        Row: {
          actor_name: string | null
          actor_user_id: string
          company_id: string | null
          conversation_id: string
          created_at: string
          details: Json | null
          event_type: string
          id: string
          target_name: string | null
          target_team_id: string | null
          target_team_name: string | null
          target_user_id: string | null
        }
        Insert: {
          actor_name?: string | null
          actor_user_id: string
          company_id?: string | null
          conversation_id: string
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          target_name?: string | null
          target_team_id?: string | null
          target_team_name?: string | null
          target_user_id?: string | null
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string
          company_id?: string | null
          conversation_id?: string
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          target_name?: string | null
          target_team_id?: string | null
          target_team_name?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_team: string | null
          assigned_to: string | null
          channel: string
          company_id: string | null
          contact_id: string
          created_at: string
          id: string
          last_message_at: string
          priority: number | null
          sla_deadline: string | null
          status: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_team?: string | null
          assigned_to?: string | null
          channel?: string
          company_id?: string | null
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: number | null
          sla_deadline?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_team?: string | null
          assigned_to?: string | null
          channel?: string
          company_id?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: number | null
          sla_deadline?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_team_fkey"
            columns: ["assigned_team"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          created_at: string
          field_type: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          field_type?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          field_type?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_state: {
        Row: {
          company_id: string
          id: string
          last_assigned_index: number
          updated_at: string
        }
        Insert: {
          company_id: string
          id?: string
          last_assigned_index?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          id?: string
          last_assigned_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      fidelity_cards: {
        Row: {
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "fidelity_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "fidelity_programs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_messages: {
        Row: {
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
          created_at?: string
          from_phone?: string
          id?: string
          message_text?: string | null
          message_type?: string | null
          provider?: string
          raw_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          attachment_url: string | null
          category: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel: string
          client_message_id: string | null
          company_id: string | null
          contact_id: string
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          message_id: string | null
          message_type: string
          metadata: Json | null
          status: string
          user_id: string
        }
        Insert: {
          channel?: string
          client_message_id?: string | null
          company_id?: string | null
          contact_id: string
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          client_message_id?: string | null
          company_id?: string | null
          contact_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      profiles: {
        Row: {
          company_id: string
          created_at: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          company_id: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          member_user_id: string
          team_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          member_user_id: string
          team_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          member_user_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          access_level: string
          channel: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          channel?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          channel?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          company_id: string | null
          company_name: string
          created_at: string
          hash: string | null
          id: string
          instance_id: string | null
          instance_token: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          company_name: string
          created_at?: string
          hash?: string | null
          id?: string
          instance_id?: string | null
          instance_token?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          company_name?: string
          created_at?: string
          hash?: string | null
          id?: string
          instance_id?: string | null
          instance_token?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_integrations: {
        Row: {
          access_token: string | null
          api_token: string | null
          business_id: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          phone_number_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      distribute_conversation: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      get_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_campaign_contact_status: {
        Args: {
          p_campaign_id: string
          p_contact_id: string
          p_new_status: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "agent"
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
      app_role: ["admin", "manager", "agent"],
    },
  },
} as const
