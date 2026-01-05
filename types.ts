
export type Platform = 'facebook' | 'google' | 'instagram' | 'audience_network';

export interface CampaignData {
  // Identification
  unique_id: string; // Composite key
  franqueado: string;
  account_id?: string;
  account_name: string;
  ad_id?: string;
  date_start: string; // YYYY-MM-DD
  campaign_name: string;
  adset_name?: string;
  ad_name?: string;
  objective?: string;

  // Metrics (Cost & Efficiency)
  valor_gasto: number;
  cpc?: number;
  ctr?: number;
  cpm?: number;
  frequencia?: number;
  custo_por_lead?: number;
  
  // Volume (Bottom Funnel)
  impressoes: number;
  cliques_todos: number;
  leads_total: number;
  compras?: number;
  msgs_iniciadas?: number;
  msgs_conexoes?: number;
  msgs_novos_contatos?: number;

  // Targeting & Platform
  target_plataformas: Platform; // Maps to 'platform' in logic
  target_local_1?: string;
  target_idade_min?: number;
  target_idade_max?: number;
  
  // Creative
  ad_image_url?: string;
  ad_title?: string;
  ad_body?: string;
  ad_permalink?: string; // Link direto para o anúncio (preview)
}

export interface KPIAggregates {
  totalSpend: number;
  totalLeads: number;
  cpl: number;
  roas: number;
  totalImpressions: number;
  totalClicks: number;
}