import { CampaignData } from './types';

// Helper to parse "21,31" to 21.31
const pF = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.replace(',', '.'));
};

const RAW_DATA = [
  { 
    franqueado: "OP7 | RODRIGO", 
    account_name: "VOLTE A SORRIR", 
    campaign_name: "TDW | PROTOCOLO | OUTUBRO 2025", 
    date: "2025-12-16", 
    valor_gasto: "150,50", 
    impressoes: 15000, 
    cliques: 450, 
    leads: 12, 
    msgs_iniciadas: 45,
    msgs_conexoes: 30,
    msgs_novos_contatos: 15,
    platform: "facebook",
    target_local_1: "Goiânia",
    target_idade_min: 35,
    target_idade_max: 55,
    ad_title: "Volte a Sorrir com Confiança",
    ad_image_url: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80&w=400"
  },
  { 
    franqueado: "OP7 | RODRIGO", 
    account_name: "VOLTE A SORRIR", 
    campaign_name: "TDW 02 | PROTOCOLO | MAIO / AGOSTO 2025", 
    date: "2025-12-16", 
    valor_gasto: "80,20", 
    impressoes: 5000, 
    cliques: 120, 
    leads: 5, 
    msgs_iniciadas: 12,
    msgs_conexoes: 8,
    msgs_novos_contatos: 3,
    platform: "facebook",
    target_local_1: "Aparecida de Goiânia",
    target_idade_min: 40,
    target_idade_max: 65,
    ad_title: "Implantes sem Dor",
    ad_image_url: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&q=80&w=400"
  },
  { 
    franqueado: "OP7 | RODRIGO", 
    account_name: "PRIME SORRISO PASSOS", 
    campaign_name: "[TDW] [PROTOCOLO] [AUTORAIS] [OUTUBRO 2025]", 
    date: "2025-12-16", 
    valor_gasto: "33,42", 
    impressoes: 2374, 
    cliques: 48, 
    leads: 3, 
    msgs_iniciadas: 8,
    msgs_conexoes: 5,
    msgs_novos_contatos: 2,
    platform: "facebook",
    target_local_1: "Passos",
    target_idade_min: 30,
    target_idade_max: 60,
    ad_title: "Sua Melhor Versão",
    ad_image_url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=400"
  },
  { 
    franqueado: "OP7 | RODRIGO", 
    account_name: "ODONTO7 ROLÂNDIA", 
    campaign_name: "[TDW] [IMPLANTES] [OUTUBRO 2025]", 
    date: "2025-12-16", 
    valor_gasto: "203,07", 
    impressoes: 14527, 
    cliques: 311, 
    leads: 25, 
    msgs_iniciadas: 80,
    msgs_conexoes: 60,
    msgs_novos_contatos: 40,
    platform: "facebook",
    target_local_1: "Rolândia",
    target_idade_min: 45,
    target_idade_max: 65,
    ad_title: "Implante Carga Imediata",
    ad_image_url: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&q=80&w=400"
  },
  { 
    franqueado: "OP7 | RODRIGO", 
    account_name: "AILLE ESTÉTICA", 
    campaign_name: "[TDW] [CORPORAL GLÚTEO] [DEZEMBRO 2025]", 
    date: "2025-12-16", 
    valor_gasto: "56,41", 
    impressoes: 1967, 
    cliques: 57, 
    leads: 9, 
    msgs_iniciadas: 20,
    msgs_conexoes: 18,
    msgs_novos_contatos: 15,
    platform: "instagram",
    target_local_1: "Uberlândia",
    target_idade_min: 25,
    target_idade_max: 45,
    ad_title: "Estética Corporal Avançada",
    ad_image_url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=400"
  },
  { 
    franqueado: "OP7 | TATUAPÉ", 
    account_name: "THEO CORRETORA", 
    campaign_name: "[TDW] [PLANOS] [AGOSTO 2025]", 
    date: "2025-12-22", 
    valor_gasto: "150,90", 
    impressoes: 5019, 
    cliques: 120, 
    leads: 15, 
    msgs_iniciadas: 40,
    msgs_conexoes: 25,
    msgs_novos_contatos: 10,
    platform: "facebook",
    target_local_1: "São Paulo",
    target_idade_min: 30,
    target_idade_max: 55,
    ad_title: "Plano de Saúde Familiar",
    ad_image_url: "https://images.unsplash.com/photo-1576091160550-217358c7e618?auto=format&fit=crop&q=80&w=400"
  },
  // Mais dados simulados para dar volume
  { 
    franqueado: "OP7 | RODRIGO", 
    account_name: "VOLTE A SORRIR", 
    campaign_name: "TDW | PROTOCOLO | OUTUBRO 2025", 
    date: "2025-12-17", 
    valor_gasto: "160,20", 
    impressoes: 16000, 
    cliques: 480, 
    leads: 15, 
    msgs_iniciadas: 50,
    msgs_conexoes: 35,
    msgs_novos_contatos: 18,
    platform: "facebook",
    target_local_1: "Goiânia",
    target_idade_min: 35,
    target_idade_max: 55,
    ad_title: "Volte a Sorrir com Confiança",
    ad_image_url: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80&w=400"
  },
  { 
    franqueado: "OP7 | RODRIGO", 
    account_name: "ODONTO7 ROLÂNDIA", 
    campaign_name: "[TDW] [IMPLANTES] [OUTUBRO 2025]", 
    date: "2025-12-17", 
    valor_gasto: "210,00", 
    impressoes: 15000, 
    cliques: 330, 
    leads: 28, 
    msgs_iniciadas: 85,
    msgs_conexoes: 65,
    msgs_novos_contatos: 45,
    platform: "facebook",
    target_local_1: "Rolândia",
    target_idade_min: 45,
    target_idade_max: 65,
    ad_title: "Implante Carga Imediata",
    ad_image_url: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&q=80&w=400"
  },
];

export const MOCK_DATA: CampaignData[] = RAW_DATA.map((row, idx) => {
  const cleanSpend = pF(row.valor_gasto);
  const cleanLeads = row.leads;
  
  return {
    unique_id: `row-${idx}-${row.date}`,
    franqueado: row.franqueado,
    account_id: `mock-acc-${idx}`, // Added required field
    account_name: row.account_name,
    ad_id: `mock-ad-${idx}`, // Added required field
    campaign_name: row.campaign_name,
    date_start: row.date,
    valor_gasto: cleanSpend,
    
    // Metrics - Ensure defined numbers
    impressoes: row.impressoes || 0,
    cliques_todos: row.cliques || 0,
    leads_total: cleanLeads || 0,
    compras: 0, // Default
    msgs_iniciadas: row.msgs_iniciadas || 0,
    msgs_conexoes: row.msgs_conexoes || 0,
    msgs_novos_contatos: row.msgs_novos_contatos || 0,
    msgs_profundidade_2: 0,
    msgs_profundidade_3: 0,
    
    alcance: 0, // Default
    frequencia: 0,
    cpm: 0,
    custo_por_compra: 0,

    target_plataformas: (row.platform === 'instagram' ? 'instagram' : row.platform) as string,
    
    // Novos Campos
    target_local_1: row.target_local_1,
    target_idade_min: row.target_idade_min,
    target_idade_max: row.target_idade_max,
    ad_title: row.ad_title,
    ad_image_url: row.ad_image_url,
    ad_post_link: "https://facebook.com/ads/library/?id=123456789",

    // Calculated fields
    cpc: row.cliques > 0 ? cleanSpend / row.cliques : 0,
    ctr: row.impressoes > 0 ? (row.cliques / row.impressoes) * 100 : 0,
    custo_por_lead: cleanLeads > 0 ? cleanSpend / cleanLeads : 0,
  };
});