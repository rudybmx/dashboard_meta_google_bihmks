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
    const mappedData: CampaignData[] = data.map((row: any, index: number) => {
      const pF = (val: any) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        if (typeof val === 'string') {
          // Remove currency symbols and other non-numeric chars except comma and dot
          const clean = val.replace(/[^0-9,.-]/g, '');
          // If it has a comma, replace it with a dot (assuming Brazilian format)
          return parseFloat(clean.replace(',', '.'));
        }
        return 0;
      };
      
      // Normalização de plataforma
      let platform: Platform = 'facebook';
      const rawPlatform = (row.target_plataformas || row.platform || '').toLowerCase();
      if (rawPlatform.includes('insta')) platform = 'instagram';
      else if (rawPlatform.includes('google')) platform = 'google';
      else if (rawPlatform.includes('audience')) platform = 'audience_network';

      return {
        // Identification
        unique_id: row.unique_id || `supa-${index}`,
        franqueado: row.franqueado || 'Geral',
        account_id: row.account_id,
        account_name: row.account_name || 'Conta Desconhecida',
        ad_id: row.ad_id,
        date_start: row.date_start || new Date().toISOString().split('T')[0],
        campaign_name: row.campaign_name || 'Campanha',
        adset_name: row.adset_name,
        ad_name: row.ad_name,
        objective: row.objective,

        // Metrics (Cost & Efficiency)
        valor_gasto: pF(row.valor_gasto),
        cpc: pF(row.cpc),
        ctr: pF(row.ctr),
        cpm: pF(row.cpm),
        frequencia: pF(row.frequencia),
        custo_por_lead: pF(row.custo_por_lead),
        custo_por_compra: pF(row.custo_por_compra),
        alcance: pF(row.alcance),

        // Volume (Bottom Funnel)
        impressoes: pF(row.impressoes),
        cliques_todos: pF(row.cliques_todos),
        leads_total: pF(row.leads_total),
        compras: pF(row.compras),
        msgs_iniciadas: pF(row.msgs_iniciadas),
        msgs_conexoes: pF(row.msgs_conexoes),
        msgs_novos_contatos: pF(row.msgs_novos_contatos),
        msgs_profundidade_2: pF(row.msgs_profundidade_2),
        msgs_profundidade_3: pF(row.msgs_profundidade_3),

        // Targeting & Platform
        target_plataformas: platform,
        target_interesses: row.target_interesses,
        target_familia: row.target_familia,
        target_comportamentos: row.target_comportamentos,
        target_publicos_custom: row.target_publicos_custom,
        target_local_1: row.target_local_1,
        target_local_2: row.target_local_2,
        target_local_3: row.target_local_3,
        target_tipo_local: row.target_tipo_local,
        target_brand_safety: row.target_brand_safety,
        target_posicao_fb: row.target_posicao_fb,
        target_posicao_ig: row.target_posicao_ig,
        target_idade_min: row.target_idade_min,
        target_idade_max: row.target_idade_max,

        // Creative
        ad_image_url: row.ad_image_url,
        ad_title: row.ad_title,
        ad_body: row.ad_body,
        ad_destination_url: row.ad_destination_url,
        ad_cta: row.ad_cta,
        ad_post_link: row.ad_post_link
      };
    });

    return { data: mappedData, isMock: false, error: null };

  } catch (err: any) {
    console.error('Falha ao buscar dados do Supabase:', err);
    return { data: MOCK_DATA, isMock: true, error: err.message || 'Erro desconhecido' };
  }
};

export const fetchAccountsConfig = async () => {
    const { data, error } = await supabase
        .from('accounts_config')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

export const saveAccountConfig = async (account: {
    account_id: string;
    account_name: string;
    franqueado: string;
    nome_ajustado?: string;
}) => {
    const { data, error } = await supabase
        .from('accounts_config')
        .insert([account])
        .select();

    if (error) throw error;
    return data;
};

export const addAccountConfig = async (config: Omit<any, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('accounts_config')
      .insert(config)
      .select()
      .single();

    if (error) throw error;
    return data;
};

// BM Settings (tb_meta_ads_contas)
export const fetchMetaAccounts = async () => {
    const { data, error } = await supabase
      .from('tb_meta_ads_contas')
      .select('*, status_meta, motivo_bloqueio, total_gasto') // Explicit select to bypass potential cache
      .order('nome_original', { ascending: true });

    if (error) {
        console.error('Error fetching meta accounts:', error);
        return [];
    }

    // Map DB columns to Frontend Interface
    return data.map((row: any) => ({
        id: row.account_id, // PK is account_id
        account_id: row.account_id,
        account_name: row.nome_original || 'Sem Nome',
        display_name: row.nome_ajustado || '',
        franchise_id: row.franqueado, // Storing Name as ID/Link for now based on legacy text column
        status: row.status_interno === 'removed' ? 'removed' : 'active', // Map status
        client_visibility: row.client_visibility ?? true, // Default true
        current_balance: parseFloat((row.saldo_balanco || '0').replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0,
        last_sync: row.updated_at || new Date().toISOString(),
        status_meta: row.status_meta || row.Status_Meta,
        motivo_bloqueio: row.motivo_bloqueio,
        total_gasto: parseFloat(String(row.total_gasto || '0').replace(/[^0-9,.-]+/g, "").replace('.', '').replace(',', '.')) || 0,
        status_interno: row.status_interno || 'A Classificar'
    }));
};

export const updateMetaAccount = async (id: string, updates: Partial<any>) => {
    // Reverse Map Frontend -> DB
    const dbUpdates: any = {};
    if (updates.display_name !== undefined) dbUpdates.nome_ajustado = updates.display_name;
    if (updates.status_interno !== undefined) dbUpdates.status_interno = updates.status_interno;
    if (updates.franchise_id !== undefined) dbUpdates.franqueado = updates.franchise_id; // Storing Name
    if (updates.client_visibility !== undefined) dbUpdates.client_visibility = updates.client_visibility;
    if (updates.status !== undefined) dbUpdates.status_interno = updates.status;

    const { data, error } = await supabase
      .from('tb_meta_ads_contas')
      .update(dbUpdates)
      .eq('account_id', id) // PK is account_id
      .select()
      .single();
      
    if (error) throw error;
    return data;
};

export const fetchFranchises = async () => {
      const { data, error } = await supabase
        .from('tb_franqueados')
        .select('*')
        .order('nome'); // Order by 'nome' which is the actual column
        
      if (error) {
          console.error('Error fetching franchises:', error);
          return [];
      }

      return (data || []).map((f: any) => ({
          id: f.id, 
          name: f.nome, // Map DB 'nome' -> UI 'name'
          active: f.ativo
      }));

};

export const createFranchise = async (name: string) => {
    const { data, error } = await supabase
        .from('tb_franqueados')
        .insert([{ nome: name }])
        .select()
        .single();
    
    if (error) throw error;
    return {
        id: data.id,
        name: data.nome,
        active: data.active
    };
};

export const toggleFranchiseStatus = async (id: string, active: boolean) => {
    const { error } = await supabase
        .from('tb_franqueados')
        .update({ ativo: active })
        .eq('id', id);
        
    if (error) throw error;
};