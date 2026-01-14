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
      accounts_config: {
        Row: {
          account_id: string
          account_name: string
          created_at: string | null
          franqueado: string
          id: string
          nome_ajustado: string | null
        }
        Insert: {
          account_id: string
          account_name: string
          created_at?: string | null
          franqueado: string
          id?: string
          nome_ajustado?: string | null
        }
        Update: {
          account_id?: string
          account_name?: string
          created_at?: string | null
          franqueado?: string
          id?: string
          nome_ajustado?: string | null
        }
        Relationships: []
      }
      ads_insights: {
        Row: {
          account_id: number
          account_name: string | null
          ad_body: string | null
          ad_cta: string | null
          ad_destination_url: string | null
          ad_id: number
          ad_image_url: string | null
          ad_name: string | null
          ad_post_link: string | null
          ad_title: string | null
          adset_name: string | null
          alcance: number | null
          campaign_name: string | null
          cliques_todos: number | null
          compras: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          custo_por_compra: number | null
          custo_por_lead: number | null
          date_start: string
          franqueado: string
          frequencia: number | null
          impressoes: number | null
          leads_total: number | null
          msgs_conexoes: number | null
          msgs_iniciadas: number | null
          msgs_novos_contatos: number | null
          msgs_profundidade_2: number | null
          msgs_profundidade_3: number | null
          objective: string | null
          target_brand_safety: string | null
          target_comportamentos: string | null
          target_familia: string | null
          target_idade_max: number | null
          target_idade_min: number | null
          target_interesses: string | null
          target_local_1: string | null
          target_local_2: string | null
          target_local_3: string | null
          target_plataformas: string | null
          target_posicao_fb: string | null
          target_posicao_ig: string | null
          target_publicos_custom: string | null
          target_tipo_local: string | null
          unique_id: string
          valor_gasto: number | null
        }
        Insert: {
          account_id: number
          account_name?: string | null
          ad_body?: string | null
          ad_cta?: string | null
          ad_destination_url?: string | null
          ad_id: number
          ad_image_url?: string | null
          ad_name?: string | null
          ad_post_link?: string | null
          ad_title?: string | null
          adset_name?: string | null
          alcance?: number | null
          campaign_name?: string | null
          cliques_todos?: number | null
          compras?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          custo_por_compra?: number | null
          custo_por_lead?: number | null
          date_start: string
          franqueado: string
          frequencia?: number | null
          impressoes?: number | null
          leads_total?: number | null
          msgs_conexoes?: number | null
          msgs_iniciadas?: number | null
          msgs_novos_contatos?: number | null
          msgs_profundidade_2?: number | null
          msgs_profundidade_3?: number | null
          objective?: string | null
          target_brand_safety?: string | null
          target_comportamentos?: string | null
          target_familia?: string | null
          target_idade_max?: number | null
          target_idade_min?: number | null
          target_interesses?: string | null
          target_local_1?: string | null
          target_local_2?: string | null
          target_local_3?: string | null
          target_plataformas?: string | null
          target_posicao_fb?: string | null
          target_posicao_ig?: string | null
          target_publicos_custom?: string | null
          target_tipo_local?: string | null
          unique_id: string
          valor_gasto?: number | null
        }
        Update: {
          account_id?: number
          account_name?: string | null
          ad_body?: string | null
          ad_cta?: string | null
          ad_destination_url?: string | null
          ad_id?: number
          ad_image_url?: string | null
          ad_name?: string | null
          ad_post_link?: string | null
          ad_title?: string | null
          adset_name?: string | null
          alcance?: number | null
          campaign_name?: string | null
          cliques_todos?: number | null
          compras?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          custo_por_compra?: number | null
          custo_por_lead?: number | null
          date_start?: string
          franqueado?: string
          frequencia?: number | null
          impressoes?: number | null
          leads_total?: number | null
          msgs_conexoes?: number | null
          msgs_iniciadas?: number | null
          msgs_novos_contatos?: number | null
          msgs_profundidade_2?: number | null
          msgs_profundidade_3?: number | null
          objective?: string | null
          target_brand_safety?: string | null
          target_comportamentos?: string | null
          target_familia?: string | null
          target_idade_max?: number | null
          target_idade_min?: number | null
          target_interesses?: string | null
          target_local_1?: string | null
          target_local_2?: string | null
          target_local_3?: string | null
          target_plataformas?: string | null
          target_posicao_fb?: string | null
          target_posicao_ig?: string | null
          target_publicos_custom?: string | null
          target_tipo_local?: string | null
          unique_id?: string
          valor_gasto?: number | null
        }
        Relationships: []
      }
      tb_franqueados: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tb_meta_ads_contas: {
        Row: {
          account_id: string
          client_visibility: boolean
          created_at: string
          currency: string | null
          franqueado: string | null
          motivo_bloqueio: string | null
          nome_ajustado: string | null
          nome_original: string | null
          saldo_balanco: string | null
          status_interno: string
          status_meta: string | null
          timezone_name: string | null
          total_gasto: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          client_visibility?: boolean
          created_at?: string
          currency?: string | null
          franqueado?: string | null
          motivo_bloqueio?: string | null
          nome_ajustado?: string | null
          nome_original?: string | null
          saldo_balanco?: string | null
          status_interno?: string
          status_meta?: string | null
          timezone_name?: string | null
          total_gasto?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          client_visibility?: boolean
          created_at?: string
          currency?: string | null
          franqueado?: string | null
          motivo_bloqueio?: string | null
          nome_ajustado?: string | null
          nome_original?: string | null
          saldo_balanco?: string | null
          status_interno?: string
          status_meta?: string | null
          timezone_name?: string | null
          total_gasto?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          assigned_account_ids: string[] | null
          assigned_franchise_ids: string[] | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          role: string | null
        }
        Insert: {
          assigned_account_ids?: string[] | null
          assigned_franchise_ids?: string[] | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          role?: string | null
        }
        Update: {
          assigned_account_ids?: string[] | null
          assigned_franchise_ids?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
      perfil_acesso: {
        Row: {
          id: string
          created_at: string
          nome: string | null
          email: string | null
          role: string | null
          ativo: boolean | null
          assigned_franchise_ids: string[] | null
          assigned_account_ids: string[] | null
        }
        Insert: {
          id?: string
          created_at?: string
          nome?: string | null
          email?: string | null
          role?: string | null
          ativo?: boolean | null
          assigned_franchise_ids?: string[] | null
          assigned_account_ids?: string[] | null
        }
        Update: {
          id?: string
          created_at?: string
          nome?: string | null
          email?: string | null
          role?: string | null
          ativo?: boolean | null
          assigned_franchise_ids?: string[] | null
          assigned_account_ids?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_dashboard_unified: {
        Row: {
          account_id: string | null
          account_name: string | null
          ad_body: string | null
          ad_cta: string | null
          ad_destination_url: string | null
          ad_id: string | null
          ad_image_url: string | null
          ad_name: string | null
          ad_post_link: string | null
          ad_title: string | null
          adset_name: string | null
          alcance: number | null
          campaign_name: string | null
          cliques_todos: number | null
          compras: number | null
          cpc: number | null
          cpm: number | null
          ctr: number | null
          custo_por_compra: number | null
          custo_por_lead: number | null
          date_start: string | null
          franqueado: string | null
          frequencia: number | null
          impressoes: number | null
          leads_total: number | null
          msgs_conexoes: number | null
          msgs_iniciadas: number | null
          msgs_novos_contatos: number | null
          msgs_profundidade_2: number | null
          msgs_profundidade_3: number | null
          objective: string | null
          target_brand_safety: string | null
          target_comportamentos: string | null
          target_familia: string | null
          target_idade_max: number | null
          target_idade_min: number | null
          target_interesses: string | null
          target_local_1: string | null
          target_local_2: string | null
          target_local_3: string | null
          target_plataformas: string | null
          target_posicao_fb: string | null
          target_posicao_ig: string | null
          target_publicos_custom: string | null
          target_tipo_local: string | null
          unique_id: string | null
          valor_gasto: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_managerial_data: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_franchise_filter?: string[] | null
          p_account_filter?: string[] | null
        }
        Returns: {
          meta_account_id: string
          nome_conta: string
          franquia: string
          saldo_atual: number
          investimento: number
          leads: number
          compras: number
          conversas: number
          clicks: number
          impressoes: number
          alcance: number
        }[]
      }
      get_kpi_comparison: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_prev_start_date: string
          p_prev_end_date: string
          p_franchise_filter?: string[] | null
          p_account_filter?: string[] | null
        }
        Returns: {
          spend: number
          impressions: number
          clicks: number
          leads: number
          purchases: number
          conversations: number
          prev_spend: number
          prev_impressions: number
          prev_clicks: number
          prev_leads: number
          prev_purchases: number
          prev_conversations: number
        }[]
      }
      get_summary_report: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_franchise_filter?: string[] | null
          p_account_filter?: string[] | null
        }
        Returns: {
          franchise_name: string
          account_id: string
          account_name: string
          status_interno: string
          client_visibility: boolean
          current_balance: number
          spend: number
          impressoes: number
          clicks: number
          alcance: number
          compras: number
          msgs_iniciadas: number
          cpl: number
          ctr: number
          cpc: number
          total_gasto: number
        }[]
      }
    }
    Enums: {}
    CompositeTypes: {}
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
