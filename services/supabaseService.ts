import { supabase } from './supabaseClient';
import { CampaignData, Platform } from '../types';
import { MOCK_DATA } from '../constants';

// Nome da tabela no Supabase
const TABLE_NAME = 'ads_insights';

export const fetchCampaignData = async (): Promise<{ data: CampaignData[], isMock: boolean, error: string | null }> => {
  try {
    // Tentativa de conexão com o Supabase
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*');

    // Se houver erro de API (ex: tabela não existe), lançar exceção para cair no catch
    if (error) {
      console.error('Supabase API Error:', JSON.stringify(error, null, 2));
      throw new Error(`Erro Supabase: ${error.message} (${error.code || 'Unknown Code'})`);
    }

    // Se a tabela existir mas estiver vazia
    if (!data || data.length === 0) {
      console.warn(`Tabela '${TABLE_NAME}' está vazia. Usando dados de teste.`);
      return { data: MOCK_DATA, isMock: true, error: 'Tabela vazia' };
    }

    // Processamento dos dados reais
    const mappedData = data.map((row: any, index: number) => {
      
      // Normalização de plataforma
      let platform: Platform = 'facebook';
      const rawPlatform = (row.platform || row.target_plataformas || '').toLowerCase();
      if (rawPlatform.includes('insta')) platform = 'instagram';
      else if (rawPlatform.includes('google')) platform = 'google';
      else if (rawPlatform.includes('audience')) platform = 'audience_network';

      const pF = (val: any) => typeof val === 'string' ? parseFloat(val) : (val || 0);
      const spend = pF(row.valor_gasto || row.spend || row.amount_spent);
      const leads = pF(row.leads || row.leads_total || row.cadastros);
      const clicks = pF(row.cliques || row.clicks || row.link_clicks);
      const impressions = pF(row.impressoes || row.impressions);

      return {
        unique_id: row.unique_id || row.id || `supa-${index}`,
        franqueado: row.franqueado || row.franchise_name || 'Geral',
        account_name: row.account_name || row.account || 'Conta Desconhecida',
        campaign_name: row.campaign_name || row.campaign || 'Campanha',
        date_start: row.date_start || row.date || new Date().toISOString().split('T')[0],
        
        valor_gasto: spend,
        impressoes: impressions,
        cliques_todos: clicks,
        leads_total: leads,
        msgs_iniciadas: pF(row.msgs_iniciadas || row.msgs_started),
        msgs_conexoes: pF(row.msgs_conexoes || row.msgs_connected),
        msgs_novos_contatos: pF(row.msgs_novos_contatos || row.msgs_new_contacts),

        target_plataformas: platform,
        target_local_1: row.target_local_1 || row.city,
        target_idade_min: pF(row.target_idade_min || row.age_min),
        target_idade_max: pF(row.target_idade_max || row.age_max),

        ad_title: row.ad_title || row.headline,
        ad_image_url: row.ad_image_url || row.image_url,
        ad_permalink: row.ad_permalink || row.permalink,

        cpc: clicks > 0 ? spend / clicks : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        custo_por_lead: leads > 0 ? spend / leads : 0,
      };
    });

    return { data: mappedData, isMock: false, error: null };

  } catch (err: any) {
    // FALLBACK AUTOMÁTICO: Se der qualquer erro, retorna os dados de Mock
    console.warn('Falha na conexão com Supabase. Ativando modo de fallback com MOCK_DATA.', err);
    return { 
      data: MOCK_DATA, 
      isMock: true, 
      error: err.message || 'Erro de conexão desconhecido' 
    };
  }
};