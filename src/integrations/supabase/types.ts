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
    PostgrestVersion: "14.5"
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
      appointment_rules: {
        Row: {
          allow_repeat_same_slot: boolean
          buffer_minutes: number
          company_id: string
          created_at: string
          fixed_duration_enabled: boolean
          fixed_duration_minutes: number
          id: string
          max_duration_minutes: number
          max_per_day: number | null
          max_per_slot: number
          min_duration_minutes: number
          updated_at: string
          user_id: string | null
          weekly_schedule: Json
        }
        Insert: {
          allow_repeat_same_slot?: boolean
          buffer_minutes?: number
          company_id: string
          created_at?: string
          fixed_duration_enabled?: boolean
          fixed_duration_minutes?: number
          id?: string
          max_duration_minutes?: number
          max_per_day?: number | null
          max_per_slot?: number
          min_duration_minutes?: number
          updated_at?: string
          user_id?: string | null
          weekly_schedule?: Json
        }
        Update: {
          allow_repeat_same_slot?: boolean
          buffer_minutes?: number
          company_id?: string
          created_at?: string
          fixed_duration_enabled?: boolean
          fixed_duration_minutes?: number
          id?: string
          max_duration_minutes?: number
          max_per_day?: number | null
          max_per_slot?: number
          min_duration_minutes?: number
          updated_at?: string
          user_id?: string | null
          weekly_schedule?: Json
        }
        Relationships: [
          {
            foreignKeyName: "appointment_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          duration_minutes: number
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          notes: string | null
          phone: string | null
          scheduled_at: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          duration_minutes?: number
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          scheduled_at: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          duration_minutes?: number
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          automation_id: string
          company_id: string
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          executed_at: string
          id: string
          status: string
        }
        Insert: {
          automation_id: string
          company_id: string
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          executed_at?: string
          id?: string
          status?: string
        }
        Update: {
          automation_id?: string
          company_id?: string
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          executed_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_followups: {
        Row: {
          automation_id: string
          company_id: string
          contact_id: string
          conversation_id: string
          created_at: string
          followup_count: number
          id: string
          last_followup_at: string | null
        }
        Insert: {
          automation_id: string
          company_id: string
          contact_id: string
          conversation_id: string
          created_at?: string
          followup_count?: number
          id?: string
          last_followup_at?: string | null
        }
        Update: {
          automation_id?: string
          company_id?: string
          contact_id?: string
          conversation_id?: string
          created_at?: string
          followup_count?: number
          id?: string
          last_followup_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_followups_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_followups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_followups_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          execution_count: number
          flow_data: Json
          id: string
          inactivity_minutes: number | null
          keyword: string | null
          last_execution: string | null
          max_followups: number | null
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
          inactivity_minutes?: number | null
          keyword?: string | null
          last_execution?: string | null
          max_followups?: number | null
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
          inactivity_minutes?: number | null
          keyword?: string | null
          last_execution?: string | null
          max_followups?: number | null
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
      closure_reasons: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          agent_name: string | null
          ai_enabled: boolean
          ai_pipeline_enabled: boolean
          cnpj: string | null
          created_at: string
          debounce_seconds: number
          id: string
          is_active: boolean
          llm_api_key_encrypted: string | null
          llm_api_key_secret_id: string | null
          llm_model: string | null
          llm_provider: string
          name: string
          phone: string | null
          plan: string
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agent_name?: string | null
          ai_enabled?: boolean
          ai_pipeline_enabled?: boolean
          cnpj?: string | null
          created_at?: string
          debounce_seconds?: number
          id?: string
          is_active?: boolean
          llm_api_key_encrypted?: string | null
          llm_api_key_secret_id?: string | null
          llm_model?: string | null
          llm_provider?: string
          name: string
          phone?: string | null
          plan?: string
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agent_name?: string | null
          ai_enabled?: boolean
          ai_pipeline_enabled?: boolean
          cnpj?: string | null
          created_at?: string
          debounce_seconds?: number
          id?: string
          is_active?: boolean
          llm_api_key_encrypted?: string | null
          llm_api_key_secret_id?: string | null
          llm_model?: string | null
          llm_provider?: string
          name?: string
          phone?: string | null
          plan?: string
          system_prompt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_ai_summaries: {
        Row: {
          company_id: string | null
          contact_id: string
          created_at: string
          id: string
          summary: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact_id: string
          created_at?: string
          id?: string
          summary: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_ai_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_ai_summaries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
      contact_files: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_files_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          avatar_url: string | null
          birthday: string | null
          company_id: string | null
          cpf_cnpj: string | null
          created_at: string
          crm_position: number
          crm_stage_id: string | null
          custom_fields: Json | null
          email: string | null
          gender: string | null
          id: string
          instagram: string | null
          name: string
          owner_user_id: string | null
          phone: string | null
          phone_secondary: string | null
          pre_sales_user_id: string | null
          profession: string | null
          referred_by: string | null
          rg_cnh: string | null
          sales_user_id: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          birthday?: string | null
          company_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          crm_position?: number
          crm_stage_id?: string | null
          custom_fields?: Json | null
          email?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          phone_secondary?: string | null
          pre_sales_user_id?: string | null
          profession?: string | null
          referred_by?: string | null
          rg_cnh?: string | null
          sales_user_id?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          birthday?: string | null
          company_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          crm_position?: number
          crm_stage_id?: string | null
          custom_fields?: Json | null
          email?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          phone_secondary?: string | null
          pre_sales_user_id?: string | null
          profession?: string | null
          referred_by?: string | null
          rg_cnh?: string | null
          sales_user_id?: string | null
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
          {
            foreignKeyName: "contacts_crm_stage_id_fkey"
            columns: ["crm_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_closures: {
        Row: {
          closed_by_name: string | null
          closed_by_user_id: string | null
          closure_reason_id: string | null
          company_id: string
          conversation_id: string
          created_at: string
          id: string
          notes: string
          reason_name: string
        }
        Insert: {
          closed_by_name?: string | null
          closed_by_user_id?: string | null
          closure_reason_id?: string | null
          company_id: string
          conversation_id: string
          created_at?: string
          id?: string
          notes: string
          reason_name: string
        }
        Update: {
          closed_by_name?: string | null
          closed_by_user_id?: string | null
          closure_reason_id?: string | null
          company_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          notes?: string
          reason_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_closures_closure_reason_id_fkey"
            columns: ["closure_reason_id"]
            isOneToOne: false
            referencedRelation: "closure_reasons"
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
          current_agent: string
          id: string
          last_message_at: string
          pending_at: string | null
          pending_token: string | null
          priority: number | null
          restarted_at: string | null
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
          current_agent?: string
          id?: string
          last_message_at?: string
          pending_at?: string | null
          pending_token?: string | null
          priority?: number | null
          restarted_at?: string | null
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
          current_agent?: string
          id?: string
          last_message_at?: string
          pending_at?: string | null
          pending_token?: string | null
          priority?: number | null
          restarted_at?: string | null
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
      crm_stages: {
        Row: {
          color: string
          company_id: string
          created_at: string
          id: string
          is_archived: boolean
          is_lost: boolean
          is_won: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_lost?: boolean
          is_won?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_lost?: boolean
          is_won?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      google_calendar_tokens: {
        Row: {
          access_token: string | null
          active: boolean
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_company_calendar: boolean
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          active?: boolean
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_company_calendar?: boolean
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          active?: boolean
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_company_calendar?: boolean
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      message_buffer: {
        Row: {
          attempts: number
          company_id: string
          contact_id: string
          conversation_id: string
          created_at: string
          flush_at: string
          id: string
          last_error: string | null
          last_message_at: string
          locked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          company_id: string
          contact_id: string
          conversation_id: string
          created_at?: string
          flush_at: string
          id?: string
          last_error?: string | null
          last_message_at: string
          locked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          company_id?: string
          contact_id?: string
          conversation_id?: string
          created_at?: string
          flush_at?: string
          id?: string
          last_error?: string | null
          last_message_at?: string
          locked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_buffer_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_buffer_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_buffer_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
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
          sent_at: string | null
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
          sent_at?: string | null
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
          sent_at?: string | null
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
          blocked_at: string | null
          company_id: string
          created_at: string
          full_name: string | null
          id: string
          is_blocked: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          company_id: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          company_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
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
      solar_branding: {
        Row: {
          about_us_text: string | null
          company_id: string
          cover_background_url: string | null
          created_at: string
          footer_contacts: Json
          footer_text: string | null
          id: string
          logo_url: string | null
          mission_text: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          values_text: string | null
          vision_text: string | null
        }
        Insert: {
          about_us_text?: string | null
          company_id: string
          cover_background_url?: string | null
          created_at?: string
          footer_contacts?: Json
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          mission_text?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          values_text?: string | null
          vision_text?: string | null
        }
        Update: {
          about_us_text?: string | null
          company_id?: string
          cover_background_url?: string | null
          created_at?: string
          footer_contacts?: Json
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          mission_text?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          values_text?: string | null
          vision_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solar_branding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_cities: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          irradiance_abr: number | null
          irradiance_ago: number | null
          irradiance_dez: number | null
          irradiance_fev: number | null
          irradiance_jan: number | null
          irradiance_jul: number | null
          irradiance_jun: number | null
          irradiance_mai: number | null
          irradiance_mar: number | null
          irradiance_nov: number | null
          irradiance_out: number | null
          irradiance_set: number | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          price: number | null
          state: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          irradiance_abr?: number | null
          irradiance_ago?: number | null
          irradiance_dez?: number | null
          irradiance_fev?: number | null
          irradiance_jan?: number | null
          irradiance_jul?: number | null
          irradiance_jun?: number | null
          irradiance_mai?: number | null
          irradiance_mar?: number | null
          irradiance_nov?: number | null
          irradiance_out?: number | null
          irradiance_set?: number | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          price?: number | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          irradiance_abr?: number | null
          irradiance_ago?: number | null
          irradiance_dez?: number | null
          irradiance_fev?: number | null
          irradiance_jan?: number | null
          irradiance_jul?: number | null
          irradiance_jun?: number | null
          irradiance_mai?: number | null
          irradiance_mar?: number | null
          irradiance_nov?: number | null
          irradiance_out?: number | null
          irradiance_set?: number | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          price?: number | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_cities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_connection_types: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          minimum_kwh: number | null
          name: string
          phases: number | null
          price: number | null
          updated_at: string
          voltage: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_kwh?: number | null
          name: string
          phases?: number | null
          price?: number | null
          updated_at?: string
          voltage?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_kwh?: number | null
          name?: string
          phases?: number | null
          price?: number | null
          updated_at?: string
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solar_connection_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_financing_banks: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_financing_banks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_financing_terms: {
        Row: {
          bank_id: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          monthly_interest_rate: number | null
          term_months: number
          updated_at: string
        }
        Insert: {
          bank_id: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_interest_rate?: number | null
          term_months: number
          updated_at?: string
        }
        Update: {
          bank_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_interest_rate?: number | null
          term_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_financing_terms_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "solar_financing_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_financing_terms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_inverters: {
        Row: {
          brand: string | null
          company_id: string
          created_at: string
          description: string | null
          efficiency: number | null
          id: string
          input_count: number | null
          is_active: boolean
          model: string | null
          mppt_count: number | null
          name: string
          phases: number | null
          power_kw: number | null
          price: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          efficiency?: number | null
          id?: string
          input_count?: number | null
          is_active?: boolean
          model?: string | null
          mppt_count?: number | null
          name: string
          phases?: number | null
          power_kw?: number | null
          price?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          efficiency?: number | null
          id?: string
          input_count?: number | null
          is_active?: boolean
          model?: string | null
          mppt_count?: number | null
          name?: string
          phases?: number | null
          power_kw?: number | null
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_inverters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_kits: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          inverter_id: string | null
          is_active: boolean
          kwp_total: number | null
          module_id: string | null
          module_quantity: number
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          inverter_id?: string | null
          is_active?: boolean
          kwp_total?: number | null
          module_id?: string | null
          module_quantity?: number
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          inverter_id?: string | null
          is_active?: boolean
          kwp_total?: number | null
          module_id?: string | null
          module_quantity?: number
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_kits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_kits_inverter_id_fkey"
            columns: ["inverter_id"]
            isOneToOne: false
            referencedRelation: "solar_inverters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_kits_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "solar_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_modules: {
        Row: {
          brand: string | null
          company_id: string
          created_at: string
          description: string | null
          height_mm: number | null
          id: string
          is_active: boolean
          model: string | null
          name: string
          power_wp: number | null
          price: number | null
          technology: string | null
          updated_at: string
          weight_kg: number | null
          width_mm: number | null
        }
        Insert: {
          brand?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          height_mm?: number | null
          id?: string
          is_active?: boolean
          model?: string | null
          name: string
          power_wp?: number | null
          price?: number | null
          technology?: string | null
          updated_at?: string
          weight_kg?: number | null
          width_mm?: number | null
        }
        Update: {
          brand?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          height_mm?: number | null
          id?: string
          is_active?: boolean
          model?: string | null
          name?: string
          power_wp?: number | null
          price?: number | null
          technology?: string | null
          updated_at?: string
          weight_kg?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solar_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_orientations: {
        Row: {
          azimuth: number | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          loss_factor: number | null
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          azimuth?: number | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          loss_factor?: number | null
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          azimuth?: number | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          loss_factor?: number | null
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_orientations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_pricing_config: {
        Row: {
          annual_module_degradation_percent: number | null
          annual_tariff_inflation_percent: number | null
          base_visit_fee: number | null
          company_id: string
          created_at: string
          id: string
          margin_percent: number | null
          price_per_km: number | null
          updated_at: string
        }
        Insert: {
          annual_module_degradation_percent?: number | null
          annual_tariff_inflation_percent?: number | null
          base_visit_fee?: number | null
          company_id: string
          created_at?: string
          id?: string
          margin_percent?: number | null
          price_per_km?: number | null
          updated_at?: string
        }
        Update: {
          annual_module_degradation_percent?: number | null
          annual_tariff_inflation_percent?: number | null
          base_visit_fee?: number | null
          company_id?: string
          created_at?: string
          id?: string
          margin_percent?: number | null
          price_per_km?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_pricing_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_proposals: {
        Row: {
          avg_monthly_consumption_kwh: number
          cash_price: number | null
          city_id: string | null
          client_name: string
          client_phone: string | null
          company_id: string
          connection_type_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          distance_km: number
          financing_bank_id: string | null
          id: string
          kit_id: string | null
          kwp_total: number | null
          orientation_id: string | null
          payback_months: number | null
          result: Json
          roof_type_id: string | null
          status: string
          updated_at: string
          utility_id: string | null
        }
        Insert: {
          avg_monthly_consumption_kwh: number
          cash_price?: number | null
          city_id?: string | null
          client_name: string
          client_phone?: string | null
          company_id: string
          connection_type_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          distance_km?: number
          financing_bank_id?: string | null
          id?: string
          kit_id?: string | null
          kwp_total?: number | null
          orientation_id?: string | null
          payback_months?: number | null
          result?: Json
          roof_type_id?: string | null
          status?: string
          updated_at?: string
          utility_id?: string | null
        }
        Update: {
          avg_monthly_consumption_kwh?: number
          cash_price?: number | null
          city_id?: string | null
          client_name?: string
          client_phone?: string | null
          company_id?: string
          connection_type_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          distance_km?: number
          financing_bank_id?: string | null
          id?: string
          kit_id?: string | null
          kwp_total?: number | null
          orientation_id?: string | null
          payback_months?: number | null
          result?: Json
          roof_type_id?: string | null
          status?: string
          updated_at?: string
          utility_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solar_proposals_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "solar_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_proposals_connection_type_id_fkey"
            columns: ["connection_type_id"]
            isOneToOne: false
            referencedRelation: "solar_connection_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_proposals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_proposals_financing_bank_id_fkey"
            columns: ["financing_bank_id"]
            isOneToOne: false
            referencedRelation: "solar_financing_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_proposals_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "solar_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_proposals_orientation_id_fkey"
            columns: ["orientation_id"]
            isOneToOne: false
            referencedRelation: "solar_orientations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_proposals_roof_type_id_fkey"
            columns: ["roof_type_id"]
            isOneToOne: false
            referencedRelation: "solar_roof_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solar_proposals_utility_id_fkey"
            columns: ["utility_id"]
            isOneToOne: false
            referencedRelation: "solar_utilities"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_roof_types: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          loss_factor: number | null
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          loss_factor?: number | null
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          loss_factor?: number | null
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_roof_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_utilities: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          minimum_fee: number | null
          name: string
          price: number | null
          state: string | null
          tariff_kwh: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_fee?: number | null
          name: string
          price?: number | null
          state?: string | null
          tariff_kwh?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_fee?: number | null
          name?: string
          price?: number | null
          state?: string | null
          tariff_kwh?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_utilities_company_id_fkey"
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
      user_presence: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_online: boolean
          last_seen_at: string
          session_started_at: string | null
          total_online_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen_at?: string
          session_started_at?: string | null
          total_online_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen_at?: string
          session_started_at?: string | null
          total_online_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_company_id_fkey"
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
      webhook_integrations: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          default_assigned_to: string | null
          default_team_id: string | null
          id: string
          name: string
          token: string
          updated_at: string
          user_id: string
          welcome_message: string | null
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          default_assigned_to?: string | null
          default_team_id?: string | null
          id?: string
          name: string
          token?: string
          updated_at?: string
          user_id: string
          welcome_message?: string | null
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          default_assigned_to?: string | null
          default_team_id?: string | null
          id?: string
          name?: string
          token?: string
          updated_at?: string
          user_id?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_integrations_default_team_id_fkey"
            columns: ["default_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          company_id: string | null
          created_at: string
          error_message: string | null
          id: string
          integration_id: string | null
          payload: Json | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration_id?: string | null
          payload?: Json | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration_id?: string | null
          payload?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "webhook_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          cloud_api_phone_number_id: string | null
          cloud_api_token_encrypted: string | null
          company_id: string | null
          company_name: string
          created_at: string
          evolution_api_key_encrypted: string | null
          evolution_api_key_secret_id: string | null
          evolution_base_url: string | null
          hash: string | null
          id: string
          instance_id: string | null
          instance_token: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
          webhook_secret: string | null
        }
        Insert: {
          cloud_api_phone_number_id?: string | null
          cloud_api_token_encrypted?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string
          evolution_api_key_encrypted?: string | null
          evolution_api_key_secret_id?: string | null
          evolution_base_url?: string | null
          hash?: string | null
          id?: string
          instance_id?: string | null
          instance_token?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
        }
        Update: {
          cloud_api_phone_number_id?: string | null
          cloud_api_token_encrypted?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string
          evolution_api_key_encrypted?: string | null
          evolution_api_key_secret_id?: string | null
          evolution_base_url?: string | null
          hash?: string | null
          id?: string
          instance_id?: string | null
          instance_token?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
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
      delete_contact_cascade: {
        Args: { p_contact_id: string }
        Returns: undefined
      }
      distribute_conversation: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      expire_pending_checkins: { Args: never; Returns: number }
      extract_ai_real_name: { Args: { p_text: string }; Returns: string }
      get_company_llm_credentials: {
        Args: { p_company_id: string }
        Returns: {
          api_key: string
          model: string
          provider: string
        }[]
      }
      get_instance_evolution_credentials: {
        Args: { p_instance_id: string }
        Returns: {
          api_key: string
          base_url: string
          webhook_secret: string
        }[]
      }
      get_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_manager: { Args: never; Returns: boolean }
      normalize_br_phone: { Args: { p_phone: string }; Returns: string }
      process_checkin_token: {
        Args: {
          p_company_id: string
          p_contact_id: string
          p_phone: string
          p_token: string
        }
        Returns: Json
      }
      resolve_appointment_rules: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: {
          allow_repeat_same_slot: boolean
          buffer_minutes: number
          company_id: string
          created_at: string
          fixed_duration_enabled: boolean
          fixed_duration_minutes: number
          id: string
          max_duration_minutes: number
          max_per_day: number | null
          max_per_slot: number
          min_duration_minutes: number
          updated_at: string
          user_id: string | null
          weekly_schedule: Json
        }
        SetofOptions: {
          from: "*"
          to: "appointment_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_instance_evolution_config: {
        Args: {
          p_api_key: string
          p_base_url: string
          p_instance_id: string
          p_webhook_secret: string
        }
        Returns: undefined
      }
      set_company_llm_api_key: {
        Args: { p_api_key: string; p_company_id: string }
        Returns: undefined
      }
      set_instance_evolution_api_key: {
        Args: { p_api_key: string; p_instance_id: string }
        Returns: undefined
      }
      simulate_appointment_rules: {
        Args: {
          p_company_id: string
          p_duration_minutes: number
          p_scheduled_at: string
          p_user_id: string
        }
        Returns: Json
      }
      strip_ai_name_marker: { Args: { p_text: string }; Returns: string }
      sweep_stale_presence: { Args: never; Returns: number }
      update_campaign_contact_status: {
        Args: {
          p_campaign_id: string
          p_contact_id: string
          p_new_status: string
        }
        Returns: undefined
      }
      user_can_view_conversation: {
        Args: { _conversation_id: string }
        Returns: boolean
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
